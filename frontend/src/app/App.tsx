import { useMemo, useState } from "react";
import type { Book, Segment } from "../domain/models";
import { parseTxtBook } from "../reader/txtParser";
import { saveParsedBook, saveReadingProgress } from "../storage/libraryRepository";

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

export function App() {
  const [readerState, setReaderState] = useState<ReaderState>();
  const [activeSegmentId, setActiveSegmentId] = useState<string>();
  const [theme, setTheme] = useState<ReaderTheme>("paper");
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.85);
  const [rightTab, setRightTab] = useState<RightPanelTab>("companion");
  const [importStatus, setImportStatus] = useState("等待上传本地 TXT");

  const activeSegment = useMemo(() => {
    if (!readerState) {
      return undefined;
    }
    return readerState.segments.find((segment) => segment.id === activeSegmentId) ?? readerState.segments[0];
  }, [activeSegmentId, readerState]);

  async function handleTxtUpload(event: React.ChangeEvent<HTMLInputElement>) {
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
      setReaderState(parsed);
      setActiveSegmentId(parsed.segments[0]?.id);
      setImportStatus(`已导入 ${parsed.segments.length} 个阅读片段`);
    } catch {
      setImportStatus("导入失败，请确认文件可读取");
    } finally {
      event.target.value = "";
    }
  }

  async function selectSegment(segment: Segment) {
    setActiveSegmentId(segment.id);
    await saveReadingProgress({
      bookId: segment.bookId,
      segmentId: segment.id,
      charOffsetInSegment: 0,
      absoluteCharOffset: segment.startChar,
      updatedAt: new Date().toISOString()
    });
  }

  return (
    <main className={`app-shell reader-theme-${theme}`}>
      <aside className="library-panel">
        <div className="brand-block">
          <p className="eyebrow">local-first novel reader</p>
          <h1>ImmerseRead</h1>
          <p>上传自己的 TXT，把阅读、章节和进度留在本地。</p>
        </div>

        <label className="upload-control">
          <span>上传 TXT 小说</span>
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
      </aside>

      <section className="reading-stage" aria-label="阅读区">
        <div className="reader-toolbar">
          <div>
            <p className="eyebrow">{readerState?.book.sourceFileName ?? "未选择书籍"}</p>
            <h2>{readerState?.book.title ?? "准备开始阅读"}</h2>
          </div>

          <div className="reader-controls" aria-label="阅读设置">
            <button type="button" onClick={() => setFontSize((value) => Math.max(14, value - 1))}>
              A-
            </button>
            <button type="button" onClick={() => setFontSize((value) => Math.min(26, value + 1))}>
              A+
            </button>
            <button type="button" onClick={() => setLineHeight((value) => Number(Math.max(1.5, value - 0.1).toFixed(2)))}>
              行距-
            </button>
            <button type="button" onClick={() => setLineHeight((value) => Number(Math.min(2.3, value + 0.1).toFixed(2)))}>
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
              <div className="segment-text" style={{ fontSize: `${fontSize}px`, lineHeight }}>
                {activeSegment.text.split(/\r?\n/).map((line, index) => (
                  <p key={`${activeSegment.id}-${index}`}>{line || "\u00a0"}</p>
                ))}
              </div>
            </>
          ) : (
            <div className="reader-empty">
              <h2>把 TXT 拖进你的阅读空间</h2>
              <p>阅读内容不会联网；后续书搭子只会看到你已经读过的上下文。</p>
            </div>
          )}
        </article>
      </section>

      <aside aria-label="阅读陪伴面板" className="companion-panel">
        <div className="theme-switcher" aria-label="阅读主题">
          {(Object.keys(THEME_LABELS) as ReaderTheme[]).map((themeName) => (
            <button
              aria-pressed={theme === themeName}
              key={themeName}
              onClick={() => setTheme(themeName)}
              type="button"
            >
              {THEME_LABELS[themeName]}
            </button>
          ))}
        </div>

        <div className="panel-tabs">
          <button aria-pressed={rightTab === "companion"} onClick={() => setRightTab("companion")} type="button">
            书搭子
          </button>
          <button aria-pressed={rightTab === "annotations"} onClick={() => setRightTab("annotations")} type="button">
            批注
          </button>
          <button aria-pressed={rightTab === "bgm"} onClick={() => setRightTab("bgm")} type="button">
            BGM
          </button>
        </div>

        {rightTab === "companion" && (
          <section className="assistant-card">
            <p className="eyebrow">anti-spoiler companion</p>
            <h2>书搭子</h2>
            <p>这里会接入仿剧透聊天：短回复、陪伴感、只基于已读上下文。</p>
            <button type="button" disabled>
              等待读者提问
            </button>
          </section>
        )}

        {rightTab === "annotations" && (
          <section className="assistant-card">
            <p className="eyebrow">local notes</p>
            <h2>批注</h2>
            <p>后续选中文本后，会在这里保存想法、疑问和角色线索。</p>
          </section>
        )}

        {rightTab === "bgm" && (
          <section className="assistant-card">
            <p className="eyebrow">atmosphere</p>
            <h2>BGM 推荐</h2>
            <p>根据当前章节氛围推荐内置或用户上传音频，播放前需要读者确认。</p>
          </section>
        )}
      </aside>
    </main>
  );
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
