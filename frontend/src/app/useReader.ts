import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import type { Annotation, Book, ChatMessage, ReadingProgress, Segment } from "../domain/models";
import type { BgmTrack } from "../bgm/bgmTypes";
import { builtInTracks } from "../bgm/builtInTracks";
import { recommendBgm } from "../bgm/bgmMatcher";
import { readTxtFile } from "../reader/textFileReader";
import { parseTxtBook } from "../reader/txtParser";
import { mergeReadRanges, visibleTextOffsets } from "../reader/readingPosition";
import { buildAllowedContext } from "../spoiler/spoilerGuard";
import { analyzeAtmosphere as requestAtmosphere, sendCompanionChat } from "../llm/client";
import * as library from "../storage/libraryRepository";

export interface ViewTrack { id: string; title: string; artist: string; duration: string; isLocked: boolean; playable: boolean }
export interface AnnotationDraft { visible: boolean; text: string; note: string; start: number; end: number }
export const EMPTY_DRAFT: AnnotationDraft = { visible: false, text: "", note: "", start: 0, end: 0 };
type LibraryBook = { book: Book; segments: Segment[] };
const LAST_BOOK = "immerseread:last-book";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "操作失败，请重试。";

/** Adapts the existing local domain to the Figma view; no demo business data. */
export function useReader(contentRef: RefObject<HTMLDivElement | null>, scrollRef: RefObject<HTMLDivElement | null>) {
  const [source, setSource] = useState<LibraryBook>();
  const [books, setBooks] = useState<Book[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState(1);
  const [progress, setProgress] = useState<ReadingProgress>();
  const progressRef = useRef<ReadingProgress | undefined>(undefined);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userTracks, setUserTracks] = useState<BgmTrack[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState(builtInTracks.find((track) => track.fileRef)?.id ?? "");
  const [lockedTrackId, setLockedTrackId] = useState<string>();
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [repeatOne, setRepeatOne] = useState(false);
  const [recommendationIds, setRecommendationIds] = useState<string[]>([]);
  const [atmosphereResult, setAtmosphereResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [llmStatus, setLlmStatus] = useState<"checking" | "ready" | "unconfigured" | "offline">("checking");
  const [notice, setNotice] = useState("");
  const [selectedContext, setSelectedContext] = useState("");
  const generation = useRef(0);
  const opening = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  const progressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const writes = useRef(Promise.resolve());
  const urls = useRef(new Set<string>());
  const restoreScroll = useRef(0);
  const activeSegment = source?.segments[currentChapterId - 1];
  const tracks = useMemo(() => [...builtInTracks, ...userTracks], [userTracks]);
  const toViewTrack = (track: BgmTrack): ViewTrack => ({ id: track.id, title: track.title,
    artist: [...track.moods, ...track.scenes].join(" · ") || "本地音频", duration: track.source === "built-in" ? "内置" : "本地", isLocked: lockedTrackId === track.id, playable: !!track.fileRef });
  const viewTracks = tracks.map(toViewTrack);
  const currentTrack = viewTracks.find((track) => track.id === currentTrackId) ?? viewTracks[0] ?? { id: "", title: "还没有音乐", artist: "添加一首本地音频", duration: "", isLocked: false, playable: false };

  const cancelRequests = useCallback(() => {
    generation.current++;
    for (const controller of controllers.current) controller.abort();
    controllers.current.clear();
    setIsSending(false); setIsAnalyzing(false);
  }, []);
  const flushProgress = useCallback(() => {
    clearTimeout(progressTimer.current);
    const value = progressRef.current;
    if (value) writes.current = writes.current.then(() => library.saveReadingProgress(value)).catch(() => setNotice("进度保存失败，请检查浏览器存储空间。"));
  }, []);

  async function openBook(id: string) {
    const ticket = ++opening.current;
    cancelRequests(); flushProgress();
    try {
      await writes.current;
      const [bookData, saved] = await Promise.all([library.getBookWithSegments(id), library.getReadingProgress(id)]);
      if (ticket !== opening.current || !bookData) return;
      const index = Math.max(0, bookData.segments.findIndex((segment) => segment.id === saved?.segmentId));
      const segment = bookData.segments[index];
      if (!segment) throw new Error("书籍没有可读取的章节。");
      const next: ReadingProgress = { bookId: id, segmentId: segment.id,
        charOffsetInSegment: saved?.charOffsetInSegment ?? 0, absoluteCharOffset: saved?.absoluteCharOffset ?? segment.startChar,
        updatedAt: new Date().toISOString(), readRanges: saved?.readRanges ?? [], scrollRatio: saved?.scrollRatio ?? 0 };
      restoreScroll.current = next.scrollRatio ?? 0;
      progressRef.current = next; setProgress(next); setSource(bookData); setCurrentChapterId(index + 1);
      setMessages([]); setAnnotations([]); setSelectedContext(""); setAtmosphereResult(null); setRecommendationIds([]);
      try { localStorage.setItem(LAST_BOOK, id); } catch { /* IDB remains the data source. */ }
    } catch (error) { setNotice(errorMessage(error)); }
  }

  useEffect(() => {
    let disposed = false;
    const initialOpening = opening.current;
    void library.listBooks().then((items) => {
      if (disposed) return;
      setBooks(items);
      let last: string | null = null;
      try { last = localStorage.getItem(LAST_BOOK); } catch { /* optional preference */ }
      if (opening.current === initialOpening && items.length) void openBook(items.find((book) => book.id === last)?.id ?? items[0].id);
    }).catch(() => { if (!disposed) setNotice("书库读取失败。请允许浏览器使用本地存储。"); });
    void library.listBgmTracks().then((items) => {
      if (disposed) return;
      setUserTracks(items.map((track) => {
        if (!track.audioBlob) return track;
        const url = URL.createObjectURL(track.audioBlob); urls.current.add(url);
        return { ...track, fileRef: url };
      }));
    }).catch(() => { if (!disposed) setNotice("本地曲库读取失败。"); });
    const controller = new AbortController();
    void fetch("/api/health", { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    }).then((health) => { if (!disposed) setLlmStatus(health.llmConfigured ? "ready" : "unconfigured"); })
      .catch(() => { if (!disposed) setLlmStatus("offline"); });
    return () => { disposed = true; controller.abort(); };
    // The initial library is loaded once; later selection is explicit.
  }, []);

  useEffect(() => {
    let live = true;
    setAnnotations([]); setMessages([]); setSelectedContext(""); setAtmosphereResult(null); setRecommendationIds([]);
    if (!source || !activeSegment) return;
    void library.listAnnotations(source.book.id, activeSegment.id).then((items) => { if (live) setAnnotations(items); }).catch(() => { if (live) setNotice("批注读取失败。"); });
    void library.listChatMessages(source.book.id).then((items) => { if (live) setMessages(items); }).catch(() => { if (live) setNotice("聊天记录读取失败。"); });
    return () => { live = false; };
  }, [source?.book.id, activeSegment?.id]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = restoreScroll.current * Math.max(0, scrollRef.current.scrollHeight - scrollRef.current.clientHeight);
        restoreScroll.current = 0;
        updateReadingPosition();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeSegment?.id]);

  useEffect(() => {
    const onHide = () => { if (document.hidden) flushProgress(); };
    window.addEventListener("pagehide", flushProgress);
    document.addEventListener("visibilitychange", onHide);
    return () => { window.removeEventListener("pagehide", flushProgress); document.removeEventListener("visibilitychange", onHide); flushProgress(); };
  }, [flushProgress]);
  useEffect(() => () => {
    for (const controller of controllers.current) controller.abort();
    for (const url of urls.current) URL.revokeObjectURL(url);
  }, []);

  function updateReadingPosition() {
    const viewport = scrollRef.current;
    const textRoot = contentRef.current?.querySelector<HTMLElement>("[data-reader-text]");
    if (!activeSegment || !viewport || !textRoot || !progressRef.current) return;
    const visible = visibleTextOffsets(textRoot, viewport);
    const maxScroll = viewport.scrollHeight - viewport.clientHeight;
    const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, viewport.scrollTop / maxScroll)) : 0;
    const end = visible?.end ?? Math.round(ratio * activeSegment.text.length);
    const next: ReadingProgress = { bookId: activeSegment.bookId, segmentId: activeSegment.id,
      charOffsetInSegment: end, absoluteCharOffset: activeSegment.startChar + end, updatedAt: new Date().toISOString(), scrollRatio: ratio,
      readRanges: visible ? mergeReadRanges(progressRef.current.readRanges ?? [], { start: activeSegment.startChar + visible.start, end: activeSegment.startChar + visible.end }) : progressRef.current.readRanges ?? [] };
    if (next.absoluteCharOffset < progressRef.current.absoluteCharOffset && controllers.current.size) cancelRequests();
    progressRef.current = next; setProgress(next);
    clearTimeout(progressTimer.current); progressTimer.current = setTimeout(flushProgress, 200);
  }

  function selectChapter(id: number) {
    if (!source?.segments[id - 1] || id === currentChapterId) return;
    cancelRequests(); flushProgress();
    const segment = source.segments[id - 1];
    const next = { bookId: segment.bookId, segmentId: segment.id, charOffsetInSegment: 0, absoluteCharOffset: segment.startChar,
      updatedAt: new Date().toISOString(), readRanges: progressRef.current?.readRanges ?? [], scrollRatio: 0 };
    progressRef.current = next; setProgress(next); restoreScroll.current = 0; setCurrentChapterId(id); flushProgress();
    setSelectedContext("");
  }
  function navigateChapter(dir: "prev" | "next") { selectChapter(currentChapterId + (dir === "prev" ? -1 : 1)); }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) { setNotice("请上传 TXT 文件。"); return; }
    if (file.size > 30 * 1024 * 1024) { setNotice("请选择不超过 30 MB 的 TXT 文件。"); return; }
    ++opening.current;
    try {
      const text = await readTxtFile(file);
      if (!text.trim()) throw new Error("文件为空，请选择包含正文的 TXT。");
      const parsed = parseTxtBook({ fileName: file.name, text });
      await library.saveParsedBook(parsed);
      setBooks((items) => [parsed.book, ...items]);
      await openBook(parsed.book.id);
      setNotice(`已导入「${parsed.book.title}」，共 ${parsed.segments.length} 个阅读片段。`);
    } catch (error) { setNotice(errorMessage(error)); }
  }

  async function saveAnnotation(draft: AnnotationDraft) {
    if (!activeSegment || !draft.text) return false;
    const segment = activeSegment, ticket = generation.current;
    if (segment.text.slice(draft.start, draft.end) !== draft.text) { setNotice("选区已变化，请重新选择正文。"); return false; }
    const now = new Date().toISOString();
    const annotation: Annotation = { id: crypto.randomUUID(), bookId: segment.bookId, segmentId: segment.id,
      startChar: draft.start, endChar: draft.end, selectedText: draft.text, note: draft.note.trim(), color: "amber", createdAt: now, updatedAt: now };
    try {
      await library.saveAnnotation(annotation);
      if (ticket === generation.current) setAnnotations((items) => [...items, annotation]);
      return true;
    } catch { setNotice("批注保存失败，请重试。"); return false; }
  }
  async function removeAnnotation(id: string) {
    try { await library.deleteAnnotation(id); setAnnotations((items) => items.filter((item) => item.id !== id)); return true; }
    catch { setNotice("批注删除失败，请重试。"); return false; }
  }

  async function sendMessage(question: string, selectedText = selectedContext) {
    if (!question.trim() || !source || !activeSegment || !progressRef.current || isSending) return;
    updateReadingPosition();
    const ticket = generation.current, segment = activeSegment;
    const controller = new AbortController(); controllers.current.add(controller);
    setIsSending(true);
    try {
      const allowed = buildAllowedContext({ segments: source.segments, progress: progressRef.current!, question, selectedText });
      const makeMessage = (role: "user" | "assistant", content: string): ChatMessage => ({ id: crypto.randomUUID(), bookId: segment.bookId,
        segmentId: segment.id, role, content, contextStartChar: allowed.contextStartChar, contextEndChar: allowed.contextEndChar,
        contextRanges: (progressRef.current?.readRanges ?? []).map((range) => ({ start: Math.max(range.start, allowed.contextStartChar), end: Math.min(range.end, allowed.contextEndChar) })).filter((range) => range.end > range.start),
        spoilerPolicy: "strict", createdAt: new Date().toISOString() });
      const user = makeMessage("user", question);
      await library.saveChatMessage(user);
      if (ticket !== generation.current) return;
      setMessages((items) => [...items, user]);
      const response = await sendCompanionChat({ bookId: segment.bookId, segmentId: segment.id, question,
        allowedContext: allowed.text, contextStartChar: allowed.contextStartChar, contextEndChar: allowed.contextEndChar, spoilerRisk: allowed.spoilerRisk }, controller.signal);
      if (ticket !== generation.current || controller.signal.aborted) return;
      if (response.modelName === "disabled") { setLlmStatus("unconfigured"); setNotice(response.content); return; }
      setLlmStatus("ready");
      const assistant = makeMessage("assistant", response.content);
      await library.saveChatMessage(assistant);
      if (ticket === generation.current) setMessages((items) => [...items, assistant]);
    } catch (error) { if (!controller.signal.aborted && ticket === generation.current) setNotice(errorMessage(error)); }
    finally { controllers.current.delete(controller); if (ticket === generation.current) setIsSending(false); }
  }

  async function analyzeAtmosphere() {
    if (!activeSegment || !progressRef.current || isAnalyzing) return;
    updateReadingPosition();
    const ticket = generation.current, segment = activeSegment;
    const allowed = buildAllowedContext({ segments: [segment], progress: progressRef.current!, question: "当前氛围" });
    if (!allowed.text.trim()) { setNotice("先阅读一些正文，再分析氛围。"); return; }
    const controller = new AbortController(); controllers.current.add(controller); setIsAnalyzing(true);
    try {
      const profile = await requestAtmosphere(segment.id, allowed.text, controller.signal);
      if (ticket !== generation.current || controller.signal.aborted) return;
      if (profile.modelName === "disabled") { setNotice("氛围分析需要先在后端配置 LLM；音乐仍可手动播放。"); setLlmStatus("unconfigured"); return; }
      setLlmStatus("ready");
      await library.saveAtmosphereProfile(profile);
      if (ticket !== generation.current) return;
      setAtmosphereResult(`${profile.moods.join(" · ")}\n${profile.scenes.join(" · ")}\n${profile.chapterEndPrompt ?? ""}`);
      setRecommendationIds(recommendBgm(profile, tracks).map((item) => item.trackId));
    } catch (error) { if (!controller.signal.aborted && ticket === generation.current) setNotice(errorMessage(error)); }
    finally { controllers.current.delete(controller); if (ticket === generation.current) setIsAnalyzing(false); }
  }

  function setCurrentTrack(track: ViewTrack) {
    if (!track.playable) { setNotice("这首曲目还没有可播放的音频。"); return; }
    if (lockedTrackId && track.id !== currentTrackId) {
      setLockedTrackId(undefined);
      setNotice("配乐已切换，AI 换曲锁定已解除。");
    }
    setCurrentTrackId(track.id); setBgmPlaying(true);
  }
  function setRecommendedTrack(track: ViewTrack) {
    if (lockedTrackId) { setNotice("当前配乐已锁定。解锁后可接受 AI 换曲建议。"); return; }
    setCurrentTrack(track);
  }
  function toggleTrackLock() {
    if (lockedTrackId) {
      setLockedTrackId(undefined); setNotice("已解锁，可接受 AI 换曲建议。");
    } else if (currentTrack.playable) {
      setLockedTrackId(currentTrack.id); setNotice("已锁定 AI 换曲。手动切歌和列表播放仍可用。");
    }
  }
  function skipTrack(delta: number) {
    const playable = viewTracks.filter((track) => track.playable);
    if (!playable.length) return;
    const index = playable.findIndex((track) => track.id === currentTrackId);
    setCurrentTrack(playable[(Math.max(index, 0) + delta + playable.length) % playable.length]);
  }
  async function uploadMusic(file: File, tags: string) {
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)) { setNotice("请选择支持的音频文件。"); return; }
    if (file.size > 100 * 1024 * 1024) { setNotice("请选择不超过 100 MB 的音频。"); return; }
    try {
      const track: BgmTrack = { id: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, ""), source: "user-uploaded", audioBlob: file,
        moods: tags.split(/[,，、\s]+/).filter(Boolean), scenes: [], energy: 0.4, darkness: 0.4, warmth: 0.4, tempo: "medium", createdAt: new Date().toISOString() };
      await library.saveBgmTrack(track);
      const url = URL.createObjectURL(file); urls.current.add(url);
      setUserTracks((items) => [...items, { ...track, fileRef: url }]); setNotice(`已添加「${track.title}」。`);
    } catch { setNotice("音频保存失败，请检查存储空间。"); }
  }
  async function removeMusic(id: string) {
    try {
      await library.deleteBgmTrack(id);
      const url = userTracks.find((track) => track.id === id)?.fileRef;
      if (url) { URL.revokeObjectURL(url); urls.current.delete(url); }
      setUserTracks((items) => items.filter((track) => track.id !== id));
      if (currentTrackId === id) { setCurrentTrackId(tracks.find((track) => track.id !== id && track.fileRef)?.id ?? ""); setBgmPlaying(false); }
      if (lockedTrackId === id) setLockedTrackId(undefined);
      return true;
    } catch { setNotice("音乐删除失败，请重试。"); return false; }
  }

  const total = source?.book.totalChars ?? 0;
  const readProgress = total ? Math.round((progress?.readRanges ?? []).reduce((sum, range) => sum + range.end - range.start, 0) / total * 100) : 0;
  const chapters = source?.segments.map((segment, index) => ({ id: index + 1, title: segment.title, content: segment.text, wordCount: segment.text.length,
    isRead: (progress?.readRanges ?? []).some((range) => range.start <= segment.startChar && range.end >= segment.endChar) })) ?? [];
  const book = { title: source?.book.title ?? "我的书架", author: source?.book.author ?? "本地 TXT", totalWords: total,
    chapters: chapters.length ? chapters : [{ id: 1, title: "开始阅读", content: "", wordCount: 0, isRead: false }] };
  // Historical messages are displayed only when their full recorded range is still visible.
  const visibleMessages = messages.filter((message) => message.contextEndChar <= (progress?.absoluteCharOffset ?? 0)
    && (message.contextEndChar === message.contextStartChar || (message.contextRanges ?? [{ start: message.contextStartChar, end: message.contextEndChar }])
      .every((evidence) => (progress?.readRanges ?? []).some((range) => range.start <= evidence.start && range.end >= evidence.end))));
  return { book, books, bookId: source?.book.id, hasBook: !!source, currentChapterId, selectChapter, navigateChapter, handleFileUpload, openBook,
    readProgress, chapterProgress: Math.round((progress?.scrollRatio ?? 0) * 100),
    annotations: annotations.map((annotation) => ({ ...annotation, chapterTitle: activeSegment?.title ?? "", chapterLabel: `第${currentChapterId}章` })),
    saveAnnotation, removeAnnotation, messages: visibleMessages, hiddenMessageCount: messages.length - visibleMessages.length, sendMessage, selectedContext, setSelectedContext, isSending, cancelRequests,
    llmStatus, isLlmConfigured: llmStatus === "ready", notice, setNotice, atmosphereResult, analyzeAtmosphere, isAnalyzing,
    tracks: viewTracks, recommendedTracks: lockedTrackId ? [] : viewTracks.filter((track) => recommendationIds.includes(track.id)),
    currentTrack, setCurrentTrack, setRecommendedTrack, currentAudioUrl: tracks.find((track) => track.id === currentTrackId)?.fileRef,
    bgmPlaying, setBgmPlaying, repeatOne, setRepeatOne, skipTrack, uploadMusic, removeMusic,
    isTrackLocked: !!lockedTrackId, toggleTrackLock, updateReadingPosition };
}
