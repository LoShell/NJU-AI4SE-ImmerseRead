// UI directly imported from the supplied Figma Make export; business bindings live in useReader.
import { useState, useRef, useEffect, type CSSProperties } from "react";
import { EMPTY_DRAFT, useReader, type AnnotationDraft, type ViewTrack } from "./useReader";
import { selectionOffsets } from "../reader/readingPosition";
import { ReaderAction, ReaderDialog, ReaderHint } from "../components/ReaderUi";
import {
  BookOpen, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Upload, Settings, MessageSquare, Sparkles, Play, Pause,
  Volume2, Music, Plus, Lock, RefreshCw, Copy, Shield,
  X, Send, List, Headphones, Bookmark, WifiOff, Pen, Radio,
  ZoomIn, ZoomOut, Trash2, Unlock, Repeat, Repeat1, Info,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────────────────────── */
type ReadingTheme = "paper" | "night" | "sepia" | "forest";
type RightTab = "companion" | "annotations" | "atmosphere";

/* ── Reading theme configs ───────────────────────────────────────────── */
const RT = {
  paper:  { label: "纸页", bg: "#F9F6F0", text: "#2C2318", sub: "#8C7B6A", border: "rgba(44,35,24,0.1)",  card: "rgba(255,255,255,0.55)" },
  night:  { label: "夜间", bg: "#141210", text: "#C8BCA8", sub: "#7A6E5E", border: "rgba(200,188,168,0.09)", card: "rgba(255,255,255,0.04)" },
  sepia:  { label: "温黄", bg: "#F4ECD6", text: "#3D2C1A", sub: "#8A6D50", border: "rgba(61,44,26,0.1)",  card: "rgba(255,255,255,0.45)" },
  forest: { label: "竹绿", bg: "#EEF2EC", text: "#1E2E22", sub: "#5A7060", border: "rgba(30,46,34,0.1)",  card: "rgba(255,255,255,0.5)" },
} satisfies Record<ReadingTheme, { label: string; bg: string; text: string; sub: string; border: string; card: string }>;

/* ── Helpers ─────────────────────────────────────────────────────────── */
function chromeColor(theme: ReadingTheme) {
  return theme === "night" ? "#161310" : "#EDE9DF";
}
function chromeBorder(theme: ReadingTheme) {
  return theme === "night" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
}
function chromeText(theme: ReadingTheme) {
  return theme === "night" ? "#C8BCA8" : "#2C2318";
}

/* ── Component ───────────────────────────────────────────────────────── */
function preference<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(`immerseread:ui:${key}`) ?? "null") ?? fallback; }
  catch { return fallback; }
}

export default function App() {
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const reader = useReader(contentRef, scrollRef);
  const { book, currentChapterId, selectChapter, navigateChapter, handleFileUpload, readProgress,
    annotations, messages, currentTrack, setCurrentTrack, bgmPlaying, setBgmPlaying,
    isLlmConfigured, isSending, atmosphereResult, isAnalyzing, analyzeAtmosphere } = reader;
  const [leftCollapsed, setLeftCollapsed] = useState(window.innerWidth < 900);
  const [rightCollapsed, setRightCollapsed] = useState(window.innerWidth < 1100);
  const [rightTab, setRightTab] = useState<RightTab>("companion");
  const [bgmExpanded, setBgmExpanded] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(() => Math.max(0, Math.min(100, Number(preference("volume", 62)) || 0)));
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>(() => {
    const saved = preference("theme", "paper"); return typeof saved === "string" && Object.hasOwn(RT, saved) ? saved as ReadingTheme : "paper";
  });
  const [fontSize, setFontSize] = useState(() => Math.max(14, Math.min(26, Number(preference("fontSize", 19)) || 19)));
  const [lineHeight, setLineHeight] = useState(() => Math.max(1.4, Math.min(2.5, Number(preference("lineHeight", 1.95)) || 1.95)));
  const [readingWidth, setReadingWidth] = useState(() => Math.max(480, Math.min(880, Number(preference("readingWidth", 660)) || 660)));
  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [deletion, setDeletion] = useState<{ kind: "annotation" | "music"; id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [musicTags, setMusicTags] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [pendingTrack, setPendingTrack] = useState<ViewTrack | null>(null);
  const [floatingToolbar, setFloatingToolbar] = useState({ visible: false, x: 0, y: 0, selectedText: "", start: 0, end: 0 });
  const [annotationDraft, setAnnotationDraft] = useState<AnnotationDraft>(EMPTY_DRAFT);
  const currentChapter = book.chapters.find(c => c.id === currentChapterId) || book.chapters[0];
  const t = RT[readingTheme];

  useEffect(() => {
    try {
      for (const [key, value] of Object.entries({ theme: readingTheme, fontSize, lineHeight, readingWidth, volume: bgmVolume })) {
        localStorage.setItem(`immerseread:ui:${key}`, JSON.stringify(value));
      }
    } catch { /* Reading remains available if preferences cannot be saved. */ }
  }, [readingTheme, fontSize, lineHeight, readingWidth, bgmVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = bgmVolume / 100;
  }, [bgmVolume]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let active = true;
    if (bgmPlaying && reader.currentAudioUrl) {
      void audio.play().catch(() => { if (active) { setBgmPlaying(false); reader.setNotice("音频播放失败，请重新选择曲目或点击播放。"); } });
    } else audio.pause();
    return () => { active = false; };
  }, [bgmPlaying, reader.currentAudioUrl]);
  useEffect(() => {
    setAnnotationDraft(EMPTY_DRAFT); setFloatingToolbar(p => ({ ...p, visible: false }));
    setPendingTrack(null); setInputValue("");
  }, [currentChapterId, reader.bookId]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (deletion) { if (!isDeleting) setDeletion(null); return; }
      setShowSettings(false); setShowLibrary(false); setShowMusic(false); setFloatingToolbar(p => ({ ...p, visible: false }));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [deletion, isDeleting]);
  useEffect(() => { setPendingTrack(null); }, [reader.isTrackLocked]);
  useEffect(() => {
    if (!annotationDraft.visible || !annotationDraft.note) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [annotationDraft]);

  /* ── Text selection ───────────────────────────────────────────────── */
  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setFloatingToolbar(p => ({ ...p, visible: false }));
        return;
      }
      const textRoot = contentRef.current?.querySelector<HTMLElement>("[data-reader-text]");
      if (!textRoot) return;
      const offsets = selectionOffsets(textRoot, sel);
      if (!offsets) { setFloatingToolbar(p => ({ ...p, visible: false })); return; }
      const text = currentText(textRoot).slice(offsets.start, offsets.end);
      const range = sel.getRangeAt(0);
      if (!contentRef.current?.contains(range.commonAncestorContainer)) {
        setFloatingToolbar(p => ({ ...p, visible: false }));
        return;
      }
      const rect = range.getBoundingClientRect();
      setFloatingToolbar({ visible: true, x: Math.max(130, Math.min(window.innerWidth - 130, rect.left + rect.width / 2)), y: Math.max(90, rect.top - 10), selectedText: text, ...offsets });
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  /* ── Chat scroll ─────────────────────────────────────────────────── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);

  /* ── Hide floating bar on outside click ──────────────────────────── */
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest("[data-floating-toolbar]")) {
        setFloatingToolbar(p => ({ ...p, visible: false }));
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const sendMessage = (content?: string) => {
    const text = (content ?? inputValue).trim();
    if (!text || !reader.hasBook || isSending) return;
    setInputValue("");
    void reader.sendMessage(text);
  };
  const saveAnnotation = async () => {
    if (await reader.saveAnnotation(annotationDraft)) {
      setAnnotationDraft(EMPTY_DRAFT);
      window.getSelection()?.removeAllRanges();
    }
  };
  const confirmDeletion = async () => {
    if (!deletion || isDeleting) return;
    setIsDeleting(true);
    try {
      const deleted = await (deletion.kind === "annotation" ? reader.removeAnnotation(deletion.id) : reader.removeMusic(deletion.id));
      if (deleted) setDeletion(null);
    } finally { setIsDeleting(false); }
  };

  /* ── Shared style atoms ──────────────────────────────────────────── */
  const bg = chromeColor(readingTheme);
  const bd = chromeBorder(readingTheme);
  const tx = chromeText(readingTheme);

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className={`figma-reader h-screen flex flex-col overflow-hidden select-none reader-theme-${readingTheme}`} style={{ background: bg, fontFamily: "'DM Sans', system-ui, sans-serif",
      "--reader-text": tx, "--reader-muted": t.sub, "--reader-card": t.card, "--reader-border": t.border,
      "--reader-surface": readingTheme === "night" ? "#1C1915" : "#FDFAF4" } as CSSProperties}>

      {/* ── Global reading-content selection colour ── */}
      <style>{`
        .reading-content ::selection { background: rgba(193,122,60,0.28); }
        .reading-content *::-webkit-scrollbar { display: none; }
        .thin-scroll::-webkit-scrollbar { width: 4px; }
        .thin-scroll::-webkit-scrollbar-track { background: transparent; }
        .thin-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
        .thin-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.12) transparent; }
        input[type=range] { accent-color: #C17A3C; }
      `}</style>

      {/* ══ TOP BAR ════════════════════════════════════════════════════ */}
      <header className="reader-topbar flex items-center gap-3 px-4 h-11 flex-shrink-0 z-30 relative" style={{ background: bg, borderBottom: `1px solid ${bd}` }}>
        {/* Logo */}
        <div className="flex items-center gap-2 mr-1">
          <BookOpen size={15} style={{ color: "#C17A3C" }} />
          <h1 className="text-sm font-semibold tracking-wide" style={{ color: tx, fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 16 }}>
            ImmerseRead
          </h1>
        </div>
        <span className="text-xs opacity-40 truncate max-w-[160px]" style={{ color: tx }}>{book.title}</span>

        <div className="flex-1" />

        {/* Anti-spoiler badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs flex-shrink-0"
          style={{ background: "rgba(34,197,94,0.12)", color: "#16A34A", border: "1px solid rgba(34,197,94,0.25)" }}>
          <Shield size={10} /><span>仅讨论已读</span>
        </div>

        {/* LLM badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs flex-shrink-0"
          style={{
            background: isLlmConfigured ? "rgba(59,130,246,0.12)" : "rgba(120,113,108,0.12)",
            color: isLlmConfigured ? "#3B82F6" : "#78716C",
            border: `1px solid ${isLlmConfigured ? "rgba(59,130,246,0.25)" : "rgba(120,113,108,0.2)"}`,
          }}>
          {!isLlmConfigured && <WifiOff size={10} />}
          <span>{({ checking: "连接中", ready: "LLM 已配置", unconfigured: "LLM 未配置", offline: "后端未连接" })[reader.llmStatus]}</span>
        </div>

        {/* Settings toggle */}
        <button aria-label="阅读设置" aria-expanded={showSettings} onClick={() => setShowSettings(p => !p)} className="p-1.5 rounded-md transition-opacity hover:opacity-60" style={{ color: tx }}>
          <Settings size={15} />
        </button>
      </header>

      {/* ══ SETTINGS PANEL ═════════════════════════════════════════════ */}
      {showSettings && (
        <div className="absolute top-11 right-2 z-50 rounded-2xl shadow-2xl p-4 w-72 border"
          style={{ background: readingTheme === "night" ? "#1C1915" : "#FDFAF4", borderColor: bd, color: tx }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">阅读设置</span>
            <button aria-label="关闭阅读设置" onClick={() => setShowSettings(false)} className="opacity-40 hover:opacity-80"><X size={14} /></button>
          </div>

          {/* Font size */}
          <div className="mb-4">
            <div className="text-xs opacity-50 mb-2">字号 {fontSize}px</div>
            <div className="flex items-center gap-2">
              <button aria-label="缩小字号" onClick={() => setFontSize(s => Math.max(14, s - 1))} className="p-1 rounded hover:opacity-60"><ZoomOut size={14} /></button>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.1)" }}>
                <div className="h-1 rounded-full" style={{ width: `${((fontSize - 14) / 12) * 100}%`, background: "#C17A3C" }} />
              </div>
              <button aria-label="放大字号" onClick={() => setFontSize(s => Math.min(26, s + 1))} className="p-1 rounded hover:opacity-60"><ZoomIn size={14} /></button>
            </div>
          </div>

          {/* Line height */}
          <div className="mb-4">
            <div className="text-xs opacity-50 mb-2">行高 {lineHeight.toFixed(1)}</div>
            <input type="range" min="1.4" max="2.5" step="0.1" value={lineHeight}
              aria-label="行高" onChange={e => setLineHeight(Number(e.target.value))} className="w-full" />
          </div>

          {/* Reading width */}
          <div className="mb-4">
            <div className="text-xs opacity-50 mb-2">正文宽度 {readingWidth}px</div>
            <input type="range" min="480" max="880" step="20" value={readingWidth}
              aria-label="正文宽度" onChange={e => setReadingWidth(Number(e.target.value))} className="w-full" />
          </div>

          {/* Themes */}
          <div>
            <div className="text-xs opacity-50 mb-2">阅读主题</div>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(RT) as [ReadingTheme, typeof RT.paper][]).map(([key, cfg]) => (
                <button aria-pressed={readingTheme === key} key={key} onClick={() => setReadingTheme(key)} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-7 rounded-lg border-2 transition-all"
                    style={{ background: cfg.bg, borderColor: readingTheme === key ? "#C17A3C" : "transparent" }} />
                  <span className="text-xs opacity-50">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ MAIN LAYOUT ════════════════════════════════════════════════ */}
      <div className="reader-workspace flex-1 flex min-h-0 overflow-hidden">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
        <aside aria-label="本地书库" className="figma-library flex-shrink-0 flex flex-col transition-all duration-300 overflow-hidden"
          style={{ width: leftCollapsed ? 40 : 232, background: bg, borderRight: `1px solid ${bd}` }}>

          {leftCollapsed ? (
            <div className="flex flex-col items-center pt-3 gap-3">
              <button aria-label="展开书架" onClick={() => setLeftCollapsed(false)} className="p-1.5 rounded-md opacity-40 hover:opacity-80" style={{ color: tx }}>
                <ChevronRight size={16} />
              </button>
              <button aria-label="打开本地书库" onClick={() => setShowLibrary(true)} className="p-1.5 opacity-30" style={{ color: tx }}><List size={15} /></button>
              <button aria-label="查看批注" onClick={() => { setRightTab("annotations"); setRightCollapsed(false); }} className="p-1.5 opacity-30" style={{ color: tx }}><Bookmark size={15} /></button>
            </div>
          ) : (
            <>
              {/* Sidebar header */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
                <button onClick={() => setShowLibrary(true)} className="text-xs font-medium opacity-60" style={{ color: tx }}>书架 <ChevronDown size={11} className="inline" /></button>
                <button aria-label="折叠书架" onClick={() => setLeftCollapsed(true)} className="opacity-30 hover:opacity-70 transition-opacity" style={{ color: tx }}>
                  <ChevronLeft size={15} />
                </button>
              </div>

              {/* Upload */}
              <div className="px-3 pb-2 flex-shrink-0">
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-85"
                  style={{ background: "#C17A3C", color: "#FFF8F0" }}>
                  <Upload size={12} /><span>上传 TXT</span>
                </button>
                <input aria-label="上传 TXT 小说" ref={fileInputRef} type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
                <p className="text-xs leading-relaxed mt-2" style={{ color: t.sub }}>已导入的书请从「书架」打开；重复上传会创建新副本。</p>
              </div>

              {/* Current book card */}
              <div className="px-3 pb-3 flex-shrink-0">
                <div className="rounded-xl p-3 border" style={{ background: t.card, borderColor: t.border }}>
                  <div className="text-xs font-medium truncate" style={{ color: tx, fontFamily: "'Crimson Pro', serif" }}>
                    {book.title}
                  </div>
                  <div className="text-xs mt-0.5 opacity-45" style={{ color: tx }}>{book.author} · {book.totalWords >= 10000 ? `${(book.totalWords / 10000).toFixed(1)}万字` : `${book.totalWords.toLocaleString()} 字`}</div>
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.1)" }}>
                    <div className="h-1 rounded-full transition-all" style={{ width: `${readProgress}%`, background: "#C17A3C" }} />
                  </div>
                  <div className="text-xs mt-1 opacity-35" style={{ color: tx }}>已读 {readProgress}%</div>
                </div>
              </div>

              {/* Divider */}
              <div className="px-3 mb-1 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-35" style={{ color: tx }}>目录</span>
                  <div className="flex-1 h-px" style={{ background: bd }} />
                  <span className="text-xs opacity-25" style={{ color: tx }}>{reader.hasBook ? book.chapters.length : 0}章</span>
                </div>
              </div>

              {/* Chapter list */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 thin-scroll">
                {(reader.hasBook ? book.chapters : []).map(ch => (
                  <button aria-label={ch.title} aria-current={currentChapterId === ch.id ? "true" : undefined} title={ch.title} key={ch.id} onClick={() => selectChapter(ch.id)}
                    className="w-full text-left px-2.5 py-2 rounded-xl mb-0.5 transition-all group"
                    style={{
                      background: currentChapterId === ch.id ? "rgba(193,122,60,0.13)" : "transparent",
                    }}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-px transition-all"
                        style={{ background: ch.isRead ? "#C17A3C" : "transparent", border: ch.isRead ? "none" : `1px solid ${t.sub}`, opacity: ch.isRead ? 0.7 : 0.4 }} />
                      <span className="text-xs truncate" style={{
                        color: currentChapterId === ch.id ? "#C17A3C" : t.sub,
                        fontWeight: currentChapterId === ch.id ? 500 : 400,
                      }}>{ch.title}</span>
                    </div>
                    <div className="text-xs mt-0.5 pl-3.5 opacity-35" style={{ color: tx }}>
                      {ch.wordCount.toLocaleString()} 字
                    </div>
                  </button>
                ))}
              </div>

              {!reader.hasBook && <p className="px-4 py-6 text-xs opacity-45">上传一本 TXT，让故事从这里开始。</p>}
              {/* Privacy notice */}
              <div className="px-3 py-2.5 flex-shrink-0" style={{ borderTop: `1px solid ${bd}` }}>
                <p className="text-xs leading-relaxed opacity-35" style={{ color: tx }}>
                  TXT · 批注 · BGM 默认仅保存在本机；API Key 不在前端显示。
                </p>
              </div>
            </>
          )}
        </aside>

        {/* ── READING AREA ──────────────────────────────────────────── */}
        <main aria-label="阅读区" className="min-w-0 flex-1 flex flex-col overflow-hidden" style={{ background: t.bg }}>

          {/* Chapter nav bar */}
          <div className="flex items-center justify-between px-6 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
            <button onClick={() => navigateChapter("prev")}
              disabled={currentChapterId === book.chapters[0].id}
              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80 disabled:opacity-20"
              style={{ color: t.sub }}>
              <ChevronLeft size={13} /><span>上一章</span>
            </button>
            <div className="text-center">
              <h2 className="text-sm font-medium" style={{ color: t.text, fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 15 }}>
                {currentChapter.title}
              </h2>
              <div className="text-xs mt-0.5 opacity-35" style={{ color: t.text }}>
                {reader.hasBook ? `第 ${currentChapterId} / ${book.chapters.length} 章` : "TXT · 本地阅读"}
              </div>
            </div>
            <button onClick={() => navigateChapter("next")}
              disabled={currentChapterId === book.chapters[book.chapters.length - 1].id}
              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80 disabled:opacity-20"
              style={{ color: t.sub }}>
              <span>下一章</span><ChevronRight size={13} />
            </button>
          </div>

          {/* Scrollable reading content */}
          <div ref={scrollRef} onScroll={() => { reader.updateReadingPosition(); setFloatingToolbar(p => p.visible ? { ...p, visible: false } : p); }} className="reader-scroll flex-1 overflow-y-auto thin-scroll">
            <div ref={contentRef}
              className="mx-auto py-12 px-8 reading-content select-text"
              style={{ maxWidth: readingWidth, fontSize: fontSize, lineHeight: lineHeight, color: t.text, fontFamily: "'Crimson Pro', Georgia, 'Noto Serif SC', serif" }}>
              {reader.hasBook ? <div data-reader-text className="whitespace-pre-wrap break-words">{currentChapter.content}</div> : (
                <div className="py-24 text-center">
                  <BookOpen size={36} className="mx-auto mb-6 opacity-30" />
                  <h2 className="mb-3" style={{ fontSize: 24 }}>把故事，留给此刻。</h2>
                  <p className="text-sm opacity-50 mb-6">导入一本本地 TXT，开始你的沉浸阅读。</p>
                  <button onClick={() => fileInputRef.current?.click()} className="text-sm px-5 py-2.5 rounded-xl" style={{ background: "#C17A3C", color: "#FFF8F0" }}>上传 TXT</button>
                </div>
              )}
              <div className="mt-16 flex items-center gap-4" style={{ opacity: 0.25 }}>
                <div className="flex-1 h-px" style={{ background: t.text }} />
                <span className="text-sm" style={{ color: t.text, fontFamily: "'Crimson Pro', serif" }}>{reader.hasBook ? "· 本章完 ·" : "· 慢慢读，不必赶路 ·"}</span>
                <div className="flex-1 h-px" style={{ background: t.text }} />
              </div>
              <div className="h-20" />
            </div>
          </div>
        </main>

        {/* ── RIGHT PANEL ───────────────────────────────────────────── */}
        <aside aria-label="阅读陪伴面板" className="figma-companion flex-shrink-0 flex flex-col transition-all duration-300 overflow-hidden"
          style={{ width: rightCollapsed ? 40 : 296, background: bg, borderLeft: `1px solid ${bd}` }}>

          {rightCollapsed ? (
            <div className="flex flex-col items-center pt-3 gap-3">
              <button aria-label="展开陪伴面板" onClick={() => setRightCollapsed(false)} className="p-1.5 opacity-40 hover:opacity-80" style={{ color: tx }}>
                <ChevronLeft size={16} />
              </button>
              <button aria-label="打开书搭子" onClick={() => { setRightTab("companion"); setRightCollapsed(false); }} className="p-1.5 opacity-30" style={{ color: tx }}>
                <MessageSquare size={15} />
              </button>
              <button aria-label="打开批注" onClick={() => { setRightTab("annotations"); setRightCollapsed(false); }} className="p-1.5 opacity-30" style={{ color: tx }}>
                <Bookmark size={15} />
              </button>
              <button aria-label="打开氛围" onClick={() => { setRightTab("atmosphere"); setRightCollapsed(false); }} className="p-1.5 opacity-30" style={{ color: tx }}>
                <Sparkles size={15} />
              </button>
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex items-center flex-shrink-0 px-1 pt-1" style={{ borderBottom: `1px solid ${bd}` }}>
                {([
                  { key: "companion" as RightTab, label: "书搭子", icon: MessageSquare },
                  { key: "annotations" as RightTab, label: "批注", icon: Bookmark },
                  { key: "atmosphere" as RightTab, label: "氛围", icon: Sparkles },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button aria-pressed={rightTab === key} key={key} onClick={() => setRightTab(key)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition-all border-b-2"
                    style={{
                      borderColor: rightTab === key ? "#C17A3C" : "transparent",
                      color: rightTab === key ? "#C17A3C" : `${tx}60`,
                    }}>
                    <Icon size={12} /><span>{label}</span>
                  </button>
                ))}
                <button aria-label="折叠陪伴面板" onClick={() => setRightCollapsed(true)} className="p-1.5 mx-1 opacity-30 hover:opacity-70" style={{ color: tx }}>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-hidden flex flex-col">

                {/* ── COMPANION TAB ───────────────────────────────── */}
                {rightTab === "companion" && (
                  <div className="flex flex-col h-full">
                    {!isLlmConfigured && (
                      <div className="mx-3 mt-3 p-3 rounded-xl text-xs leading-relaxed flex-shrink-0"
                        style={{ background: "rgba(120,113,108,0.1)", color: `${tx}90`, border: `1px solid ${bd}` }}>
                        {reader.llmStatus === "offline" ? "后端尚未连接。启动后端后即可使用书搭子；本地阅读、批注和音乐可照常使用。" : "在后端配置 LLM 后即可和书搭子聊天；API Key 不在前端填写。"}
                      </div>
                    )}

                    {/* Quick actions */}
                    <div className="px-3 pt-3 pb-1 flex-shrink-0">
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: "总结已读内容", msg: "请总结我已读的章节内容" },
                          { label: "解释一下", msg: "帮我解释一下当前读到的情节" },
                          { label: "帮我捋一下", msg: "帮我梳理目前的故事脉络" },
                          { label: "角色关系", msg: "梳理一下目前出现的人物关系" },
                        ].map(({ label, msg }) => (
                          <button disabled={!reader.hasBook || isSending} key={label} onClick={() => sendMessage(msg)}
                            className="text-xs py-1.5 px-2 rounded-xl text-left transition-opacity hover:opacity-80"
                            style={{ background: t.card, color: `${tx}b0`, border: `1px solid ${t.border}` }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Messages */}
                    {reader.hiddenMessageCount > 0 && <div className="mx-3 mt-2"><ReaderHint icon={Shield}>有 {reader.hiddenMessageCount} 条对话因当前阅读范围暂时隐藏。回到原阅读位置后可查看。</ReaderHint></div>}
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 thin-scroll">
                      {messages.length === 0 && reader.hiddenMessageCount === 0 && <div className="py-8 text-center text-xs opacity-45 leading-loose"><MessageSquare size={24} className="mx-auto mb-3" />读到有意思的地方，<br />就来聊聊吧。</div>}
                      {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[88%] text-xs leading-relaxed px-3 py-2 rounded-2xl"
                            style={{
                              background: msg.role === "user" ? "#C17A3C" : t.card,
                              color: msg.role === "user" ? "#FFF8F0" : `${tx}e0`,
                              border: msg.role === "assistant" ? `1px solid ${t.border}` : "none",
                              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            }}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isSending && <div className="flex items-center justify-between gap-2 text-xs" style={{ color: t.sub }} role="status"><span>正在阅读你提供的上下文…</span><ReaderAction icon={X} label="取消回复" onClick={reader.cancelRequests}>取消</ReaderAction></div>}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="flex-shrink-0 p-3" style={{ borderTop: `1px solid ${bd}` }}>
                      <div className="flex gap-2 mb-2">
                        <button disabled={isSending || !messages.some(m => m.role === "user")} onClick={() => sendMessage([...messages].reverse().find(m => m.role === "user")?.content)} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-xl opacity-50 hover:opacity-80 transition-opacity"
                          style={{ background: t.card, color: tx, border: `1px solid ${t.border}` }}>
                          <RefreshCw size={10} /><span>重新生成</span>
                        </button>
                      </div>
                      <div className="flex items-end gap-2 rounded-2xl px-3 py-2"
                        style={{ background: t.card, border: `1px solid ${t.border}` }}>
                        <textarea aria-label="给书搭子的消息" disabled={!reader.hasBook || isSending} value={inputValue} onChange={e => setInputValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendMessage(); } }}
                          placeholder="问问书搭子…" rows={2}
                          className="flex-1 text-xs resize-none outline-none bg-transparent leading-relaxed"
                          style={{ color: tx }} />
                        <button aria-label="发送消息" disabled={!reader.hasBook || isSending || !inputValue.trim()} onClick={() => sendMessage()}
                          className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
                          style={{ background: "#C17A3C", color: "#FFF8F0" }}>
                          <Send size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── ANNOTATIONS TAB ─────────────────────────────── */}
                {rightTab === "annotations" && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 thin-scroll">
                      {annotations.length === 0 && !annotationDraft.visible && (
                        <div className="text-center py-10 text-xs opacity-35" style={{ color: tx }}>
                          选中文字后点击「批注」
                        </div>
                      )}
                      {annotations.map(ann => (
                        <div key={ann.id} className="rounded-2xl p-3 text-xs"
                          style={{ background: t.card, border: `1px solid ${t.border}` }}>
                          <div className="italic mb-2 pb-2 leading-relaxed" style={{ color: "#C17A3C", borderBottom: "1px solid rgba(193,122,60,0.2)" }}>
                            「{ann.selectedText}」
                          </div>
                          <p className="leading-relaxed" style={{ color: `${tx}c0` }}>{ann.note}</p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs" style={{ color: tx }}>
                            <span className="opacity-45">{ann.chapterTitle} · {ann.chapterLabel}</span>
                            <ReaderAction icon={Trash2} label={`删除批注 ${ann.selectedText}`} title="删除这条批注" tone="danger" onClick={() => setDeletion({ kind: "annotation", id: ann.id, label: ann.selectedText })} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Annotation draft form */}
                    {annotationDraft.visible && (
                      <div className="flex-shrink-0 p-3" style={{ borderTop: `1px solid ${bd}` }}>
                        <div className="text-xs italic mb-1.5 opacity-55" style={{ color: "#C17A3C" }}>
                          「{annotationDraft.text.slice(0, 28)}{annotationDraft.text.length > 28 ? "…" : ""}」
                        </div>
                        <textarea aria-label="批注内容" value={annotationDraft.note} onChange={e => setAnnotationDraft(p => ({ ...p, note: e.target.value }))}
                          placeholder="写下你的想法…" rows={3}
                          className="w-full text-xs resize-none outline-none rounded-xl p-2.5 leading-relaxed"
                          style={{ background: t.card, color: tx, border: `1px solid ${t.border}` }} />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => setAnnotationDraft(EMPTY_DRAFT)}
                            className="flex-1 text-xs py-1.5 rounded-xl opacity-50 hover:opacity-80"
                            style={{ background: t.card, color: tx, border: `1px solid ${t.border}` }}>
                            取消
                          </button>
                          <button onClick={saveAnnotation} className="flex-1 text-xs py-1.5 rounded-xl"
                            style={{ background: "#C17A3C", color: "#FFF8F0" }}>
                            保存批注
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── ATMOSPHERE TAB ──────────────────────────────── */}
                {rightTab === "atmosphere" && (
                  <div className="p-3 overflow-y-auto thin-scroll h-full">
                    {reader.isTrackLocked && <div className="mb-3"><ReaderHint icon={Lock}>当前配乐已锁定，AI 换曲建议已暂停。手动切歌和列表播放仍可用。</ReaderHint><ReaderAction icon={Unlock} label="解除 AI 换曲锁定" className="mt-2 w-full" onClick={reader.toggleTrackLock}>解除锁定</ReaderAction></div>}
                    <div className="rounded-2xl p-3 mb-3 text-xs leading-relaxed"
                      style={{ background: t.card, border: `1px solid ${t.border}`, color: `${tx}90` }}>
                      <p>基于当前章节中已阅读的片段分析氛围，推荐曲库中适合的 BGM。</p>
                      <p className="mt-1 opacity-60">AI 只分析你已读过的段落，不会剧透后续内容。</p>
                    </div>

                    <button onClick={() => void analyzeAtmosphere()} disabled={isAnalyzing || !reader.hasBook}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-medium mb-4 transition-opacity hover:opacity-85 disabled:opacity-50"
                      style={{ background: "#C17A3C", color: "#FFF8F0" }}>
                      <Sparkles size={13} />
                      <span>{isAnalyzing ? "分析中…" : "分析当前氛围"}</span>
                    </button>

                    {atmosphereResult && (
                      <div className="rounded-2xl p-3 mb-4 text-xs leading-relaxed whitespace-pre-line"
                        style={{ background: "rgba(193,122,60,0.1)", border: "1px solid rgba(193,122,60,0.22)", color: readingTheme === "night" ? "#C8BCA8" : "#5C3D1C" }}>
                        <div className="font-medium mb-1.5" style={{ color: "#C17A3C" }}>氛围分析</div>
                        {atmosphereResult}
                      </div>
                    )}

                    {atmosphereResult && !reader.isTrackLocked && (
                      <>
                        <div className="text-xs mb-2 opacity-40" style={{ color: tx }}>推荐 BGM（需确认后才会切换）</div>
                        {reader.recommendedTracks.length === 0 && <p className="text-xs opacity-50 mb-3">曲库里还没有匹配的音乐，可以添加带标签的本地音频。</p>}
                        {reader.recommendedTracks.map(track => (
                          <div key={track.id} className="flex items-center gap-2.5 p-2.5 rounded-2xl mb-2 transition-all"
                            style={{
                              background: currentTrack.id === track.id ? "rgba(193,122,60,0.12)" : t.card,
                              border: `1px solid ${currentTrack.id === track.id ? "rgba(193,122,60,0.28)" : t.border}`,
                            }}>
                            <Music size={13} style={{ color: "#C17A3C", opacity: 0.7, flexShrink: 0 }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate" style={{ color: tx }}>{track.title}</div>
                              <div className="text-xs opacity-40 truncate" style={{ color: tx }}>{track.artist} · {track.duration}</div>
                            </div>
                            {pendingTrack?.id === track.id ? (
                              <div className="flex gap-1">
                                <button disabled={reader.isTrackLocked} onClick={() => { reader.setRecommendedTrack(track); setPendingTrack(null); }}
                                  className="text-xs px-2 py-1 rounded-lg" style={{ background: "#C17A3C", color: "#FFF8F0" }}>确认</button>
                                <button onClick={() => setPendingTrack(null)}
                                  className="text-xs px-2 py-1 rounded-lg" style={{ background: t.card, color: `${tx}80`, border: `1px solid ${t.border}` }}>取消</button>
                              </div>
                            ) : (
                              <button onClick={() => currentTrack.id === track.id ? null : setPendingTrack(track)}
                                className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0 transition-all"
                                style={{
                                  background: currentTrack.id === track.id ? "#C17A3C" : "rgba(193,122,60,0.14)",
                                  color: currentTrack.id === track.id ? "#FFF8F0" : "#C17A3C",
                                }}>
                                {currentTrack.id === track.id ? "当前" : "切换"}
                              </button>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      <audio ref={audioRef} aria-label="本地音频播放器" src={reader.currentAudioUrl} loop={reader.repeatOne} onEnded={() => { if (!reader.repeatOne) reader.skipTrack(1); }} onError={() => { setBgmPlaying(false); reader.setNotice("音频无法播放，请检查文件格式或重新选择曲目。"); }} />
      {/* ══ BGM DOCK ═══════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 transition-all duration-300" style={{ background: bg, borderTop: `1px solid ${bd}` }}>
        {bgmExpanded ? (
          <div className="flex items-center gap-3 px-4 h-[60px]">
            {/* Track info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(193,122,60,0.14)" }}>
                <Music size={16} style={{ color: "#C17A3C" }} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: tx }}>{currentTrack.title}</div>
                <div className="text-xs opacity-40 truncate" style={{ color: tx }}>{currentTrack.artist}</div>
              </div>
            </div>

            <button aria-label="上一首" onClick={() => reader.skipTrack(-1)} className="p-1 opacity-55"><ChevronLeft size={16} /></button>
            {/* Play/Pause */}
            <button aria-label={bgmPlaying ? "暂停音乐" : "播放音乐"} disabled={!currentTrack.playable} onClick={() => setBgmPlaying(p => !p)}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ background: "#C17A3C", color: "#FFF8F0" }}>
              {bgmPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>

            <button aria-label="下一首" onClick={() => reader.skipTrack(1)} className="p-1 opacity-55"><ChevronRight size={16} /></button>
            <ReaderAction icon={reader.repeatOne ? Repeat1 : Repeat} label={reader.repeatOne ? "切换列表循环" : "切换单曲循环"} title={reader.repeatOne ? "单曲循环 · 点击切换列表循环" : "列表循环 · 点击切换单曲循环"} onClick={() => reader.setRepeatOne(p => !p)} />
            {/* Volume */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <Volume2 size={12} style={{ color: `${tx}50` }} />
              <input aria-label="音量" type="range" min="0" max="100" value={bgmVolume}
                onChange={e => setBgmVolume(Number(e.target.value))} className="w-16" />
            </div>

            {/* Lock */}
            <button onClick={reader.toggleTrackLock} disabled={!currentTrack.playable} aria-pressed={reader.isTrackLocked} aria-label={reader.isTrackLocked ? "解除 AI 换曲锁定" : "锁定 AI 换曲"} title={reader.isTrackLocked ? "AI 换曲已锁定 · 点击解锁；手动切歌仍可用" : "锁定 AI 换曲，手动切歌仍可用"}
              className="p-1.5 rounded-xl transition-all flex-shrink-0"
              style={{
                background: currentTrack.isLocked ? "rgba(193,122,60,0.14)" : "transparent",
                color: currentTrack.isLocked ? "#C17A3C" : `${tx}40`,
              }}>
              {reader.isTrackLocked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>

            {/* Add local */}
            <button onClick={() => setShowMusic(true)} title="添加本地音频" aria-label="打开音乐曲库" className="p-1.5 rounded-xl flex-shrink-0 opacity-35 hover:opacity-70 transition-opacity" style={{ color: tx }}>
              <Plus size={13} />
            </button>

            {/* Recommend BGM */}
            <button aria-label="打开氛围" onClick={() => { setRightTab("atmosphere"); setRightCollapsed(false); }}
              className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ background: "rgba(193,122,60,0.12)", color: "#C17A3C", border: "1px solid rgba(193,122,60,0.22)" }}>
              <Radio size={11} /><span>推荐 BGM</span>
            </button>

            {/* Collapse */}
            <button aria-label="收起音乐栏" onClick={() => setBgmExpanded(false)} className="p-1 opacity-30 hover:opacity-70 flex-shrink-0" style={{ color: tx }}>
              <ChevronDown size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-4 h-8">
            <Headphones size={12} style={{ color: `${tx}40` }} />
            <span className="text-xs opacity-35 flex-1 truncate" style={{ color: tx }}>
              {bgmPlaying ? "▶ " : ""}{currentTrack.title}
            </span>
            <button aria-label="展开音乐栏" onClick={() => setBgmExpanded(true)} className="p-0.5 opacity-30 hover:opacity-70" style={{ color: tx }}>
              <ChevronUp size={13} />
            </button>
          </div>
        )}
      </div>

      {reader.notice && <div role="status" className="reader-toast"><Info size={14} className="flex-shrink-0 text-[#C17A3C]" /><span>{reader.notice}</span><ReaderAction icon={X} label="关闭提示" onClick={() => reader.setNotice("")} /></div>}
      {(showLibrary || showMusic) && <ReaderDialog title={showMusic ? "音乐曲库" : "本地书库"} onClose={() => { setShowLibrary(false); setShowMusic(false); }}>
          {showLibrary && <>
            <div className="mb-4"><ReaderHint>已导入的书请从书架打开，阅读位置和批注会保留。重复上传 TXT 会创建新副本。</ReaderHint></div>
            {reader.books.length === 0 && <p className="reader-dialog-description py-5 text-center">书架还是空的，导入一本 TXT 吧。</p>}
            {reader.books.map(item => <button key={item.id} className="reader-library-row hover:opacity-80 transition-opacity" onClick={() => { void reader.openBook(item.id); setShowLibrary(false); }}><BookOpen size={16} /><div className="reader-library-meta"><p className="reader-library-title">{item.title}</p><p className="reader-library-detail">{item.totalChars.toLocaleString()} 字 · {item.sourceFileName}</p></div><ChevronRight size={14} /></button>)}
            <ReaderAction icon={Upload} label="上传 TXT" tone="primary" className="w-full mt-2" onClick={() => { fileInputRef.current?.click(); setShowLibrary(false); }}>上传 TXT</ReaderAction>
          </>}
          {showMusic && <>
            <label className="reader-field">音乐标签（用于氛围推荐）<input aria-label="音乐标签" placeholder="例如：治愈 古风 雨夜" value={musicTags} onChange={e => setMusicTags(e.target.value)} /></label>
            <label className="reader-upload"><Plus size={14} />添加本地音频<input aria-label="上传本地音频" type="file" accept="audio/*" onChange={e => { const file = e.target.files?.[0]; if (file) void reader.uploadMusic(file, musicTags); e.target.value = ""; }} /></label>
            {reader.tracks.map(track => <div key={track.id} className="reader-library-row"><Music size={16} /><div className="reader-library-meta"><p className="reader-library-title">{track.title}</p><p className="reader-library-detail">{track.artist}</p></div><ReaderAction icon={Play} label={`播放 ${track.title}`} disabled={!track.playable} onClick={() => setCurrentTrack(track)} />{track.duration === "本地" && <ReaderAction icon={Trash2} label={`删除音乐 ${track.title}`} title="删除这首本地音乐" tone="danger" onClick={() => setDeletion({ kind: "music", id: track.id, label: track.title })} />}</div>)}
          </>}
      </ReaderDialog>}
      {deletion && <ReaderDialog title={deletion.kind === "annotation" ? "删除这条批注？" : "删除这首音乐？"} compact busy={isDeleting} onClose={() => { if (!isDeleting) setDeletion(null); }}>
        <p className="reader-dialog-description">{deletion.kind === "annotation" ? "删除后无法恢复，小说原文会保留。" : "将从当前浏览器的曲库移除，电脑中的原始音频文件会保留。"}</p>
        <blockquote className="reader-dialog-quote">{deletion.label.length > 120 ? `${deletion.label.slice(0, 120)}…` : deletion.label}</blockquote>
        <div className="reader-dialog-actions"><ReaderAction label="取消删除" disabled={isDeleting} onClick={() => setDeletion(null)}>取消</ReaderAction><ReaderAction icon={Trash2} label="确认删除" tone="danger" disabled={isDeleting} onClick={() => void confirmDeletion()}>{isDeleting ? "删除中…" : "确认删除"}</ReaderAction></div>
      </ReaderDialog>}

      {/* ══ FLOATING SELECTION TOOLBAR ═════════════════════════════════ */}
      {floatingToolbar.visible && (
        <div data-floating-toolbar onMouseDown={e => e.preventDefault()}
          className="fixed z-50 flex items-center gap-0.5 rounded-2xl shadow-2xl px-1.5 py-1.5"
          style={{
            left: floatingToolbar.x,
            top: floatingToolbar.y,
            transform: "translate(-50%, -100%)",
            background: readingTheme === "night" ? "#262118" : "#2A2016",
            border: "1px solid rgba(255,255,255,0.1)",
            marginTop: -6,
          }}>
          {[
            {
              icon: Pen, label: "批注",
              action: () => {
                setAnnotationDraft({ visible: true, text: floatingToolbar.selectedText, note: "", start: floatingToolbar.start, end: floatingToolbar.end });
                setRightTab("annotations");
                setRightCollapsed(false);
                setFloatingToolbar(p => ({ ...p, visible: false }));
                window.getSelection()?.removeAllRanges();
              },
            },
            {
              icon: MessageSquare, label: "问书搭子",
              action: () => {
                reader.setSelectedContext(floatingToolbar.selectedText);
                setInputValue(`关于这段话「${floatingToolbar.selectedText.slice(0, 40)}${floatingToolbar.selectedText.length > 40 ? "…" : ""}」，你有什么解读？`);
                setRightTab("companion");
                setRightCollapsed(false);
                setFloatingToolbar(p => ({ ...p, visible: false }));
                window.getSelection()?.removeAllRanges();
              },
            },
            {
              icon: Copy, label: "复制",
              action: () => {
                void navigator.clipboard.writeText(floatingToolbar.selectedText).catch(() => reader.setNotice("复制失败，请使用 Ctrl+C。"));
                setFloatingToolbar(p => ({ ...p, visible: false }));
                window.getSelection()?.removeAllRanges();
              },
            },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-white transition-colors hover:bg-white/10">
              <Icon size={12} /><span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function currentText(element: HTMLElement) { return element.textContent ?? ""; }

export { App };
