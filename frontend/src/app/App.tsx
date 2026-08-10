import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { createAnnotationFromSelection, type AnnotationDraft } from "../annotations/annotationRanges";
import { builtInTracks } from "../bgm/builtInTracks";
import { recommendBgm } from "../bgm/bgmMatcher";
import type { AtmosphereProfile, BgmRecommendation, BgmTrack } from "../bgm/bgmTypes";
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
  const [rightTab, setRightTab] = useState<RightPanelTab>("companion");
  const [importStatus, setImportStatus] = useState("等待上传本地 TXT");
  const [userBgmTracks, setUserBgmTracks] = useState<BgmTrack[]>([]);
  const [atmosphereProfile, setAtmosphereProfile] = useState<AtmosphereProfile>();
  const [bgmRecommendations, setBgmRecommendations] = useState<BgmRecommendation[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string>();
  const [lockedTrackId, setLockedTrackId] = useState<string>();
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [isAnalyzingAtmosphere, setIsAnalyzingAtmosphere] = useState(false);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [isCompanionCollapsed, setIsCompanionCollapsed] = useState(false);

  const allBgmTracks = useMemo(() => [...builtInTracks, ...userBgmTracks], [userBgmTracks]);

  const activeSegment = useMemo(() => {
    if (!readerState) {
      return undefined;
    }
    return readerState.segments.find((segment) => segment.id === activeSegmentId) ?? readerState.segments[0];
  }, [activeSegmentId, readerState]);

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
    setIsCompanionCollapsed(false);
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
    setIsCompanionCollapsed(false);
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
      licenseNote: "用户本地上传，仅保存在当前浏览器。",
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
      className={`app-shell reader-theme-${theme}${isLibraryCollapsed ? " library-collapsed" : ""}${
        isCompanionCollapsed ? " companion-collapsed" : ""
      }`}
    >
      <aside className="library-panel">
        <button
          aria-label={isLibraryCollapsed ? "展开章节栏" : "折叠章节栏"}
          className="icon-button panel-toggle"
          onClick={() => setIsLibraryCollapsed((value) => !value)}
          type="button"
        >
          <Icon name="book" />
        </button>

        <div className="panel-content">
          <div className="brand-block">
            <p className="eyebrow">local-first novel reader</p>
            <h1>ImmerseRead</h1>
            <p>上传自己的 TXT，把阅读、章节和进度留在本地。</p>
          </div>

          <label className="upload-control">
            <span><Icon name="upload" />上传 TXT 小说</span>
            <input aria-label="上传 TXT 小说" accept=".txt,text/plain" type="file" onChange={handleTxtUpload} />
          </label>

          <p className="import-status" role="status">
            {importStatus}
          </p>

          <nav aria-label="章节列表" className="chapter-list">
            <h2>章节</h2>
            {readerState ? (
              readerState.segments.map((segment) => (
                <button
                  aria-current={segment.id === activeSegment?.id ? "true" : undefined}
                  aria-label={segment.title}
                  className="chapter-button"
                  key={segment.id}
                  onClick={() => void selectSegment(segment)}
                  type="button"
                >
                  <span>{segment.title}</span>
                  <small>{segment.type === "chapter" ? "章节" : "片段"}</small>
                </button>
              ))
            ) : (
              <p className="empty-hint">还没有书。先导入一本 TXT。</p>
            )}
          </nav>
        </div>
      </aside>

      <section className="reading-stage" aria-label="阅读区">
        <div className="storage-notice" role="status" aria-label="本地保存提醒">
          书籍、批注和 BGM 保存在当前浏览器；刷新通常不会丢失，清除浏览器数据会删除本地记录。
        </div>

        <div className="reader-toolbar">
          <div>
            <p className="eyebrow">{readerState?.book.sourceFileName ?? "未选择书籍"}</p>
            <h2>{readerState?.book.title ?? "准备开始阅读"}</h2>
          </div>

          <div className="reader-controls" aria-label="阅读设置">
            <button className="button-secondary" type="button" onClick={() => setFontSize((value) => Math.max(14, value - 1))}>
              A-
            </button>
            <button className="button-secondary" type="button" onClick={() => setFontSize((value) => Math.min(24, value + 1))}>
              A+
            </button>
            <button className="button-secondary" type="button" onClick={() => setLineHeight((value) => Number(Math.max(1.5, value - 0.1).toFixed(2)))}>
              行距-
            </button>
            <button className="button-secondary" type="button" onClick={() => setLineHeight((value) => Number(Math.min(2.2, value + 0.1).toFixed(2)))}>
              行距+
            </button>
          </div>
        </div>

        <article className="reader-page">
          {activeSegment ? (
            <>
              <header className="segment-header">
                <p>
                  {activeSegment.index + 1} / {readerState?.segments.length}
                </p>
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
              <h2>把 TXT 拖进你的阅读空间</h2>
              <p>阅读内容不会联网；书搭子只会看到你已经读过的上下文。</p>
            </div>
          )}
        </article>
      </section>

      <aside aria-label="阅读陪伴面板" className="companion-panel">
        <button
          aria-label={isCompanionCollapsed ? "展开陪伴面板" : "折叠陪伴面板"}
          className="icon-button panel-toggle"
          onClick={() => setIsCompanionCollapsed((value) => !value)}
          type="button"
        >
          <Icon name="message" />
        </button>

        <div className="panel-content">
          <div className="theme-switcher" aria-label="阅读主题">
            {(Object.keys(THEME_LABELS) as ReaderTheme[]).map((themeName) => (
              <button
                aria-pressed={theme === themeName}
                className="button-secondary"
                key={themeName}
                onClick={() => setTheme(themeName)}
                type="button"
              >
                {THEME_LABELS[themeName]}
              </button>
            ))}
          </div>

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
              <p className="eyebrow">local notes</p>
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
                  <span><Icon name="note" />本章批注</span>
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
              <p className="eyebrow">atmosphere</p>
              <h2>BGM 推荐</h2>
              {atmosphereProfile?.chapterEndPrompt && <p>{atmosphereProfile.chapterEndPrompt}</p>}
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
                tracks={allBgmTracks}
              />
            </section>
          )}
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
