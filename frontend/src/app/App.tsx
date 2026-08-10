import { useEffect, useMemo, useRef, useState, type ChangeEvent, type UIEvent } from "react";
import { createAnnotationFromSelection, type AnnotationDraft } from "../annotations/annotationRanges";
import { builtInTracks } from "../bgm/builtInTracks";
import { recommendBgm } from "../bgm/bgmMatcher";
import type { AtmosphereProfile, BgmRecommendation, BgmTrack } from "../bgm/bgmTypes";
import defaultBookCover from "../assets/default-book-cover.png";
import { AnnotationToolbar } from "../components/AnnotationToolbar";
import { BgmDock, type UploadedBgmInput } from "../components/BgmDock";
import { CompanionPanel } from "../components/CompanionPanel";
import { Icon } from "../components/Icon";
import type { Annotation, Book, ChatMessage, ReadingProgress, Segment } from "../domain/models";
import { analyzeAtmosphere } from "../llm/client";
import { parseTxtBook } from "../reader/txtParser";
import {
  deleteBgmTrack,
  getAtmosphereProfile,
  listAnnotations,
  listBgmTracks,
  listChatMessages,
  saveAnnotation,
  saveAtmosphereProfile,
  saveBgmTrack,
  saveChatMessage,
  saveParsedBook,
  saveReadingProgress
} from "../storage/libraryRepository";

type ReaderTheme = "paper" | "night" | "sepia";
type RightPanelTab = "companion" | "annotations" | "bgm";

interface ReaderState {
  book: Book;
  segments: Segment[];
}

const THEME_LABELS: Record<ReaderTheme, string> = {
  paper: "纸页",
  night: "夜读",
  sepia: "暖棕"
};

const TAB_META: Record<RightPanelTab, { icon: "message" | "note" | "music"; label: string }> = {
  companion: { icon: "message", label: "书搭子" },
  annotations: { icon: "note", label: "批注" },
  bgm: { icon: "music", label: "BGM" }
};

export function App() {
  const [readerState, setReaderState] = useState<ReaderState>();
  const [activeSegmentId, setActiveSegmentId] = useState<string>();
  const [progress, setProgress] = useState<ReadingProgress>();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [annotationDraft, setAnnotationDraft] = useState<AnnotationDraft>();
  const [companionContext, setCompanionContext] = useState<AnnotationDraft>();
  const [theme, setTheme] = useState<ReaderTheme>("paper");
  const [fontSize, setFontSize] = useState(17);
  const [lineHeight, setLineHeight] = useState(1.78);
  const [chapterProgressPercent, setChapterProgressPercent] = useState(0);
  const [rightTab, setRightTab] = useState<RightPanelTab>("companion");
  const [importStatus, setImportStatus] = useState("等待上传本地 TXT");
  const [userBgmTracks, setUserBgmTracks] = useState<BgmTrack[]>([]);
  const [atmosphereProfile, setAtmosphereProfile] = useState<AtmosphereProfile>();
  const [bgmRecommendations, setBgmRecommendations] = useState<BgmRecommendation[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string>();
  const [lockedTrackId, setLockedTrackId] = useState<string>();
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [isAnalyzingAtmosphere, setIsAnalyzingAtmosphere] = useState(false);
  const readerPageRef = useRef<HTMLElement>(null);

  const allBgmTracks = useMemo(() => [...builtInTracks, ...userBgmTracks], [userBgmTracks]);

  const activeSegment = useMemo(() => {
    if (!readerState) {
      return undefined;
    }
    return readerState.segments.find((segment) => segment.id === activeSegmentId) ?? readerState.segments[0];
  }, [activeSegmentId, readerState]);

  const totalBookChars = useMemo(
    () => readerState?.segments.reduce((total, segment) => total + segment.text.length, 0) ?? 0,
    [readerState]
  );

  const bookProgressPercent = useMemo(() => {
    if (!readerState || !activeSegment || !progress || totalBookChars <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((progress.absoluteCharOffset / totalBookChars) * 100));
  }, [activeSegment, progress, readerState, totalBookChars]);

  const chapterWordCount = activeSegment?.text.length ?? 0;

  useEffect(() => {
    void listBgmTracks().then((tracks) => setUserBgmTracks(tracks.map(hydrateBgmTrack)));
  }, []);

  useEffect(() => {
    const shouldWarn = Boolean(annotationDraft);
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldWarn) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [annotationDraft]);

  useEffect(() => {
    if (!readerState?.book.id || !activeSegment?.id) {
      setAnnotations([]);
      setChatMessages([]);
      setAtmosphereProfile(undefined);
      setBgmRecommendations([]);
      return;
    }

    void listAnnotations(readerState.book.id, activeSegment.id).then(setAnnotations);
    void listChatMessages(readerState.book.id).then(setChatMessages);
    void getAtmosphereProfile(activeSegment.id).then((savedProfile) => {
      setAtmosphereProfile(savedProfile);
      setBgmRecommendations(savedProfile ? recommendBgm(savedProfile, allBgmTracks, { lockedTrackId }) : []);
    });
  }, [activeSegment?.id, allBgmTracks, lockedTrackId, readerState?.book.id]);

  useEffect(() => {
    const readerPage = readerPageRef.current;
    if (readerPage) {
      readerPage.scrollTop = 0;
    }
    setChapterProgressPercent(readerPage ? calculateScrollProgress(readerPage) : 0);
  }, [activeSegment?.id]);

  async function handleTxtUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".txt")) {
      setImportStatus("请上传 .txt 文件");
      return;
    }

    try {
      setImportStatus("正在解析本地文件...");
      const text = await readTextFile(file);
      const parsed = parseTxtBook({ fileName: file.name, text });
      await saveParsedBook(parsed);
      const firstSegment = parsed.segments[0];
      setReaderState(parsed);
      setActiveSegmentId(firstSegment?.id);
      setAnnotationDraft(undefined);
      setCompanionContext(undefined);
      setAtmosphereProfile(undefined);
      setBgmRecommendations([]);
      if (firstSegment) {
        setProgress(createProgress(firstSegment, firstSegment.text.length));
      }
      setImportStatus(`已导入 ${parsed.segments.length} 个阅读片段`);
    } catch {
      setImportStatus("导入失败，请确认文件可读取");
    } finally {
      event.target.value = "";
    }
  }

  async function selectSegment(segment: Segment) {
    const nextProgress = createProgress(segment, segment.text.length);
    setActiveSegmentId(segment.id);
    setProgress(nextProgress);
    setAnnotationDraft(undefined);
    await saveReadingProgress(nextProgress);
  }

  function captureSelection() {
    if (!readerState?.book.id || !activeSegment) {
      return;
    }

    const selectedText = window.getSelection()?.toString().trim();
    if (!selectedText) {
      return;
    }

    const startChar = activeSegment.text.indexOf(selectedText);
    if (startChar < 0) {
      return;
    }

    setAnnotationDraft(
      createAnnotationFromSelection({
        bookId: readerState.book.id,
        segmentId: activeSegment.id,
        segmentText: activeSegment.text,
        startChar,
        endChar: startChar + selectedText.length,
        note: "",
        color: "yellow"
      })
    );
    setRightTab("annotations");
  }

  async function persistAnnotation(draft: AnnotationDraft) {
    const now = new Date().toISOString();
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...draft
    };
    await saveAnnotation(annotation);
    setAnnotations((current) => [...current, annotation].sort((left, right) => left.startChar - right.startChar));
    setAnnotationDraft(undefined);
  }

  function askCompanionWithAnnotation(draft: AnnotationDraft) {
    setCompanionContext(draft);
    setRightTab("companion");
  }

  async function persistChatMessage(message: ChatMessage) {
    await saveChatMessage(message);
    setChatMessages((current) =>
      current.some((saved) => saved.id === message.id) ? current : [...current, message]
    );
  }

  async function runAtmosphereAnalysis() {
    if (!activeSegment) {
      return;
    }

    setIsAnalyzingAtmosphere(true);
    try {
      const profile = await analyzeAtmosphere(activeSegment.id, activeSegment.text);
      await saveAtmosphereProfile(profile);
      setAtmosphereProfile(profile);
      setBgmRecommendations(recommendBgm(profile, allBgmTracks, { lockedTrackId }));
    } finally {
      setIsAnalyzingAtmosphere(false);
    }
  }

  function confirmBgmSwitch(trackId: string) {
    setCurrentTrackId(trackId);
    setIsBgmPlaying(true);
  }

  function toggleBgmLock() {
    setLockedTrackId((current) => (current ? undefined : currentTrackId));
  }

  function updateReadingProgressFromScroll(event: UIEvent<HTMLElement>) {
    if (!activeSegment) {
      return;
    }

    const scrollProgress = calculateScrollProgress(event.currentTarget);
    const charOffset = Math.round(activeSegment.text.length * (scrollProgress / 100));
    const nextProgress = createProgress(activeSegment, charOffset);
    setChapterProgressPercent(scrollProgress);
    setProgress(nextProgress);
    void saveReadingProgress(nextProgress);
  }

  async function uploadBgmTrack(input: UploadedBgmInput) {
    const now = new Date().toISOString();
    const persistedTrack: BgmTrack = {
      id: crypto.randomUUID(),
      title: input.title,
      source: input.source,
      audioBlob: input.file,
      moods: input.moods,
      scenes: input.scenes,
      energy: input.energy,
      darkness: input.darkness,
      warmth: input.warmth,
      tempo: input.tempo,
      licenseNote: "用户本地上传，仅保存到当前浏览器。",
      createdAt: now
    };
    const track = hydrateBgmTrack(persistedTrack);
    await saveBgmTrack(persistedTrack);
    setUserBgmTracks((current) => [...current, track]);
    if (atmosphereProfile) {
      setBgmRecommendations(recommendBgm(atmosphereProfile, [...allBgmTracks, track], { lockedTrackId }));
    }
  }

  async function removeBgmTrack(trackId: string) {
    await deleteBgmTrack(trackId);
    setUserBgmTracks((current) => current.filter((track) => track.id !== trackId));
    if (currentTrackId === trackId) {
      setCurrentTrackId(undefined);
      setLockedTrackId(undefined);
      setIsBgmPlaying(false);
    }
  }

  return (
    <main
      className={`app-shell reader-theme-${theme}`}
    >
      <aside className="library-panel">
        <div className="panel-content library-content">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden="true">
              <Icon name="book" />
            </div>
            <h1>ImmerseRead</h1>
          </div>

          <section className="library-section">
            <div className="section-title-row">
              <h2>本地书库</h2>
              <button className="icon-button subtle" aria-label="折叠本地书库" type="button">
                <Icon name="chevron" />
              </button>
            </div>

            <label className="upload-control">
              <span>
                <Icon name="upload" />
                导入 TXT
              </span>
              <input aria-label="上传 TXT 小说" accept=".txt,text/plain" type="file" onChange={handleTxtUpload} />
            </label>

            <article className="book-card">
              <img alt="默认书籍封面" className="book-cover" src={defaultBookCover} />
              <div className="book-meta">
                <h3>{readerState?.book.title ?? "暂无书籍"}</h3>
                <p>{readerState ? "本地 TXT" : "匿名作者"}</p>
                {readerState && <p>{readerState.book.sourceFileName}</p>}
                <small>{readerState ? `${readerState.segments.length} 个片段` : "文件大小未知"}</small>
              </div>
            </article>

            <div className="progress-block">
              <div>
                <span>阅读进度</span>
                <strong>{bookProgressPercent}%</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${bookProgressPercent}%` }} />
              </div>
            </div>

            <p className="import-status" role="status">
              {importStatus}
            </p>
          </section>

          <nav aria-label="章节列表" className="chapter-list">
            <div className="section-title-row">
              <h2>章节目录</h2>
              <button className="icon-button subtle" aria-label="章节设置" type="button">
                <Icon name="settings" />
              </button>
            </div>
            {readerState ? (
              readerState.segments.map((segment) => (
                <button
                  aria-current={segment.id === activeSegment?.id ? "true" : undefined}
                  aria-label={segment.title}
                  className="chapter-button"
                  key={segment.id}
                  onClick={() => void selectSegment(segment)}
                  title={segment.title}
                  type="button"
                >
                  <Icon name="note" />
                  <span>{truncateLabel(segment.title)}</span>
                </button>
              ))
            ) : (
              <p className="empty-hint">导入 TXT 后会在这里显示章节。</p>
            )}
          </nav>

          <button className="library-manage-button" type="button">
            <Icon name="book" />
            管理书籍
          </button>
        </div>
      </aside>

      <section className="reading-stage" aria-label="阅读区">
        <div className="reader-floating-toolbar" aria-label="阅读设置">
          <button type="button" onClick={() => setFontSize((value) => Math.max(14, value - 1))}>
            A-
          </button>
          <button type="button" onClick={() => setFontSize((value) => Math.min(24, value + 1))}>
            A+
          </button>
          <button type="button" onClick={() => setLineHeight((value) => Number(Math.min(2.2, value + 0.1).toFixed(2)))}>
            行距
          </button>
          <button type="button" onClick={() => setTheme(theme === "paper" ? "sepia" : "paper")}>
            主题
          </button>
          <button type="button" onClick={() => setTheme(theme === "night" ? "paper" : "night")}>
            夜视
          </button>
        </div>

        <article className="reader-page" ref={readerPageRef} onScroll={updateReadingProgressFromScroll}>
          {activeSegment ? (
            <>
              <header className="segment-header">
                <h2>{activeSegment.title}</h2>
              </header>
              <div className="segment-text" onMouseUp={captureSelection} style={{ fontSize: `${fontSize}px`, lineHeight }}>
                {activeSegment.text.split(/\r?\n/).map((line, index) => (
                  <p key={`${activeSegment.id}-${index}`}>{line || "\u00a0"}</p>
                ))}
              </div>
            </>
          ) : (
            <div className="reader-empty">
              <h2>导入 TXT 后开始阅读。</h2>
              <p>阅读内容只来自你本地上传的小说文件。</p>
            </div>
          )}
        </article>

        <footer className="reader-footer">
          <span>本章进度 {activeSegment ? `${chapterProgressPercent}%` : "--"}</span>
          <div className="footer-line" />
          <span>本章 {chapterWordCount} 字</span>
        </footer>
      </section>

      <aside aria-label="阅读陪伴面板" className="companion-panel">
        <div className="panel-content companion-content">
          <div className="panel-tabs">
            {(Object.keys(TAB_META) as RightPanelTab[]).map((tabName) => (
              <button
                aria-pressed={rightTab === tabName}
                key={tabName}
                onClick={() => setRightTab(tabName)}
                type="button"
              >
                <Icon name={TAB_META[tabName].icon} />
                {TAB_META[tabName].label}
              </button>
            ))}
          </div>

          <div className="side-tab-content">
            {rightTab === "companion" && (
              <CompanionPanel
                activeSegment={activeSegment}
                annotationNote={companionContext?.note}
                bookId={readerState?.book.id}
                messages={chatMessages}
                onPersistMessage={persistChatMessage}
                progress={progress}
                segments={readerState?.segments ?? []}
                selectedText={companionContext?.selectedText}
              />
            )}

            {rightTab === "annotations" && (
              <section className="assistant-card annotation-panel">
                <h2>批注</h2>
                {annotationDraft ? (
                  <AnnotationToolbar
                    draft={annotationDraft}
                    onAskCompanion={askCompanionWithAnnotation}
                    onSave={(draft) => void persistAnnotation(draft)}
                  />
                ) : (
                  <p>选中正文后，可以在这里保存批注或带着片段问书搭子。</p>
                )}
                <details className="panel-section annotation-list-section" open>
                  <summary>
                    <span>
                      <Icon name="note" />
                      本章批注
                    </span>
                    <Icon name="chevron" />
                  </summary>
                  <div className="section-body annotation-list" aria-label="本章批注记录">
                    {annotations.length > 0 ? (
                      annotations.map((annotation) => (
                        <article className="annotation-item" key={annotation.id}>
                          <strong>{annotation.selectedText}</strong>
                          {annotation.note && <p>{annotation.note}</p>}
                          <button className="button-secondary" onClick={() => askCompanionWithAnnotation(annotation)} type="button">
                            问书搭子
                          </button>
                        </article>
                      ))
                    ) : (
                      <p>暂无批注记录。</p>
                    )}
                  </div>
                </details>
              </section>
            )}

            {rightTab === "bgm" && (
              <section className="assistant-card">
                <h2>BGM 曲库</h2>
                <BgmDock
                  currentTrackId={currentTrackId}
                  isAnalyzing={isAnalyzingAtmosphere}
                  isPlaying={isBgmPlaying}
                  lockedTrackId={lockedTrackId}
                  onAnalyze={() => void runAtmosphereAnalysis()}
                  onConfirmSwitch={confirmBgmSwitch}
                  onDeleteTrack={(trackId) => void removeBgmTrack(trackId)}
                  onToggleLock={toggleBgmLock}
                  onTogglePlay={() => setIsBgmPlaying((value) => !value)}
                  onUploadTrack={(input) => void uploadBgmTrack(input)}
                  recommendations={bgmRecommendations}
                  showPlayer={false}
                  showRecommendations={false}
                  tracks={allBgmTracks}
                />
              </section>
            )}
          </div>

          <div className="persistent-bgm-dock">
            <BgmDock
              currentTrackId={currentTrackId}
              isAnalyzing={isAnalyzingAtmosphere}
              isPlaying={isBgmPlaying}
              lockedTrackId={lockedTrackId}
              onAnalyze={() => void runAtmosphereAnalysis()}
              onConfirmSwitch={confirmBgmSwitch}
              onDeleteTrack={(trackId) => void removeBgmTrack(trackId)}
              onToggleLock={toggleBgmLock}
              onTogglePlay={() => setIsBgmPlaying((value) => !value)}
              onUploadTrack={(input) => void uploadBgmTrack(input)}
              recommendations={bgmRecommendations}
              showLibrary={false}
              showRecommendations={false}
              showUpload={false}
              tracks={allBgmTracks}
            />
          </div>
        </div>
      </aside>
    </main>
  );
}

function createProgress(segment: Segment, charOffsetInSegment: number): ReadingProgress {
  return {
    bookId: segment.bookId,
    segmentId: segment.id,
    charOffsetInSegment,
    absoluteCharOffset: segment.startChar + charOffsetInSegment,
    updatedAt: new Date().toISOString()
  };
}

function readTextFile(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("File read failed")));
    reader.readAsText(file);
  });
}

function hydrateBgmTrack(track: BgmTrack): BgmTrack {
  if (!track.audioBlob || typeof URL.createObjectURL !== "function") {
    return track;
  }

  return {
    ...track,
    fileRef: URL.createObjectURL(track.audioBlob)
  };
}

function calculateScrollProgress(element: HTMLElement): number {
  const maxScroll = element.scrollHeight - element.clientHeight;
  if (maxScroll <= 0) {
    return 100;
  }

  return Math.min(100, Math.max(0, Math.round((element.scrollTop / maxScroll) * 100)));
}

function truncateLabel(value: string, maxLength = 15): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}
