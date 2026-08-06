# ImmerseRead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个本地优先的沉浸式 TXT 小说阅读器，支持章节解析、滚动阅读、轻量批注、BGM 推荐、Spring Boot LLM 代理和严格防剧透的“书搭子”聊天。

**Architecture:** 前端使用 React + TypeScript + Vite，负责 TXT 解析、IndexedDB 本地存储、阅读 UI、批注、BGM 播放与防剧透上下文构造。后端使用 Spring Boot，仅作为 LLM 代理、凭据隔离、请求校验、结构化输出规范化和脱敏日志层，不持久化小说正文、批注、聊天记录或音频。

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library, Playwright, IndexedDB, Java 17, Spring Boot 3, JUnit 5, Docker Compose, OpenAI-compatible Chat Completions API.

## Global Constraints

- 第一版只支持 TXT，不支持 EPUB 或 PDF。
- 小说正文、批注、阅读进度、聊天记录和用户上传 BGM 默认只保存在浏览器本地。
- 第一版不使用 MySQL。
- LLM API key 只存在于后端环境变量，前端不得接触凭据。
- 书搭子默认严格防剧透，LLM 请求不得包含当前阅读位置之后的正文。
- 书搭子默认回复较短，通常为 1-4 句。
- LLM 调用是用户动作或单次分析触发，不做自主 agent 循环或 LLM 工具调用。
- BGM 切换需要用户确认，第一版不自动切歌。
- 前端参考 Open Design，阅读器界面保持安静、沉浸、内容优先。
- 每个开发任务必须先写测试，再实现，再运行对应测试。
- 每个任务完成后单独提交。

---

## File Structure

```text
NJU-AI4SE-ImmerseRead/
  frontend/
    package.json
    vite.config.ts
    tsconfig.json
    index.html
    src/
      app/App.tsx
      app/App.test.tsx
      app/routes.ts
      main.tsx
      styles/global.css
      domain/models.ts
      reader/txtParser.ts
      reader/txtParser.test.ts
      reader/readingProgress.ts
      storage/db.ts
      storage/libraryRepository.ts
      storage/libraryRepository.test.ts
      spoiler/spoilerGuard.ts
      spoiler/spoilerGuard.test.ts
      bgm/bgmTypes.ts
      bgm/bgmMatcher.ts
      bgm/bgmMatcher.test.ts
      bgm/builtInTracks.ts
      llm/client.ts
      llm/prompts.ts
      annotations/annotationRanges.ts
      annotations/annotationRanges.test.ts
      components/ReaderView.tsx
      components/LibraryImport.tsx
      components/AnnotationToolbar.tsx
      components/CompanionPanel.tsx
      components/BgmDock.tsx
      e2e/reader-flow.spec.ts
  backend/
    pom.xml
    src/main/java/cn/immerseread/ImmerseReadApplication.java
    src/main/java/cn/immerseread/config/LlmProperties.java
    src/main/java/cn/immerseread/health/HealthController.java
    src/main/java/cn/immerseread/llm/LlmController.java
    src/main/java/cn/immerseread/llm/LlmService.java
    src/main/java/cn/immerseread/llm/OpenAiChatClient.java
    src/main/java/cn/immerseread/llm/dto/AtmosphereRequest.java
    src/main/java/cn/immerseread/llm/dto/AtmosphereResponse.java
    src/main/java/cn/immerseread/llm/dto/ChatRequest.java
    src/main/java/cn/immerseread/llm/dto/ChatResponse.java
    src/main/java/cn/immerseread/llm/dto/ErrorResponse.java
    src/test/java/cn/immerseread/health/HealthControllerTest.java
    src/test/java/cn/immerseread/llm/LlmControllerTest.java
    src/test/java/cn/immerseread/llm/LlmServiceTest.java
  docker-compose.yml
  .env.example
  .gitignore
  README.md
  .github/workflows/ci.yml
```

---

### Task 1: 项目脚手架与一键命令

**Files:**

- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/App.tsx`
- Create: `frontend/src/app/App.test.tsx`
- Create: `frontend/src/styles/global.css`
- Create: `backend/pom.xml`
- Create: `backend/src/main/java/cn/immerseread/ImmerseReadApplication.java`
- Create: `backend/src/main/java/cn/immerseread/health/HealthController.java`
- Create: `backend/src/test/java/cn/immerseread/health/HealthControllerTest.java`
- Create: `.gitignore`
- Create: `.env.example`
- Modify: `README.md`

**Interfaces:**

- Produces frontend command: `npm run test`, `npm run build`, `npm run dev`.
- Produces backend command: `./mvnw test` or `mvn test`.
- Produces backend endpoint: `GET /api/health`.
- Produces environment variables: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`.

- [ ] **Step 1: Create frontend failing smoke test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the reader product shell", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "ImmerseRead" })).toBeInTheDocument();
    expect(screen.getByText("上传 TXT，开始本地沉浸阅读")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run frontend test and verify it fails**

Run: `cd frontend && npm run test -- App.test.tsx`

Expected: the command fails because the frontend scaffold does not exist yet.

- [ ] **Step 3: Create frontend scaffold**

Implement `frontend/package.json` with these scripts:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  }
}
```

Implement `App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <h1>ImmerseRead</h1>
      <p>上传 TXT，开始本地沉浸阅读</p>
    </main>
  );
}
```

- [ ] **Step 4: Create backend failing health test**

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthControllerTest {
    @Autowired
    TestRestTemplate rest;

    @Test
    void healthReportsServiceStatus() {
        ResponseEntity<Map> response = rest.getForEntity("/api/health", Map.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("status", "ok");
    }
}
```

- [ ] **Step 5: Implement Spring Boot scaffold and health endpoint**

Implement `HealthController`:

```java
@RestController
@RequestMapping("/api")
class HealthController {
    @GetMapping("/health")
    Map<String, Object> health() {
        return Map.of("status", "ok", "llmConfigured", false);
    }
}
```

- [ ] **Step 6: Run scaffold tests**

Run: `cd frontend && npm run test -- App.test.tsx`

Expected: PASS.

Run: `cd backend && mvn test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend backend .gitignore .env.example README.md
git commit -m "chore: scaffold ImmerseRead app"
```

---

### Task 2: 领域模型与 TXT 解析器

**Files:**

- Create: `frontend/src/domain/models.ts`
- Create: `frontend/src/reader/txtParser.ts`
- Create: `frontend/src/reader/txtParser.test.ts`

**Interfaces:**

- Produces type: `Book`.
- Produces type: `Segment`.
- Produces function: `parseTxtBook(input: ParseTxtBookInput): ParsedBook`.

```ts
export interface ParseTxtBookInput {
  fileName: string;
  text: string;
  chunkSize?: number;
}

export interface ParsedBook {
  book: Book;
  segments: Segment[];
}
```

- [ ] **Step 1: Write parser tests**

```ts
import { describe, expect, it } from "vitest";
import { parseTxtBook } from "./txtParser";

describe("parseTxtBook", () => {
  it("recognizes Chinese chapter headings", () => {
    const parsed = parseTxtBook({
      fileName: "demo.txt",
      text: "第一章 初见\n她推开门。\n\n第二章 夜雨\n雨声很急。"
    });

    expect(parsed.book.title).toBe("demo");
    expect(parsed.segments).toHaveLength(2);
    expect(parsed.segments[0]).toMatchObject({
      title: "第一章 初见",
      type: "chapter",
      parseConfidence: "high",
      startChar: 0
    });
    expect(parsed.segments.map((segment) => segment.text).join("")).toContain("雨声很急。");
  });

  it("falls back to chunks when chapter headings are unreliable", () => {
    const parsed = parseTxtBook({
      fileName: "plain.txt",
      text: "一段普通正文。\n".repeat(20),
      chunkSize: 30
    });

    expect(parsed.segments.length).toBeGreaterThan(1);
    expect(parsed.segments[0].title).toBe("片段 1");
    expect(parsed.segments[0].type).toBe("chunk");
    expect(parsed.segments[0].parseConfidence).toBe("low");
  });

  it("preserves text order after parsing", () => {
    const text = "第一章 起\n甲乙丙。\n第二章 承\n丁戊己。";
    const parsed = parseTxtBook({ fileName: "order.txt", text });
    expect(parsed.segments.map((segment) => segment.text).join("")).toBe(text);
  });
});
```

- [ ] **Step 2: Run parser tests and verify they fail**

Run: `cd frontend && npm run test -- txtParser.test.ts`

Expected: FAIL because `parseTxtBook` is not implemented.

- [ ] **Step 3: Implement domain models**

```ts
export type SegmentType = "chapter" | "chunk";
export type ParseConfidence = "high" | "medium" | "low";

export interface Book {
  id: string;
  title: string;
  author?: string;
  sourceFileName: string;
  createdAt: string;
  updatedAt: string;
  totalChars: number;
  parserVersion: string;
}

export interface Segment {
  id: string;
  bookId: string;
  index: number;
  title: string;
  startChar: number;
  endChar: number;
  text: string;
  type: SegmentType;
  parseConfidence: ParseConfidence;
  atmosphereStatus: "pending" | "ready" | "failed";
}
```

- [ ] **Step 4: Implement `parseTxtBook`**

Use regexes for:

```ts
const CHAPTER_PATTERNS = [
  /^第[一二三四五六七八九十百千万零〇0-9]+[章节回].*$/gm,
  /^卷[一二三四五六七八九十百千万零〇0-9]+.*$/gm,
  /^Chapter\s+\d+.*$/gim,
  /^\d+[.、]\s*.+$/gm
];
```

Implementation requirements:

- Use `crypto.randomUUID()` for ids.
- Remove `.txt` suffix from file name for title.
- Treat fewer than 2 recognized headings as unreliable.
- In chunk mode, split near paragraph boundaries before the configured `chunkSize`.
- Preserve every original character in segment text.

- [ ] **Step 5: Run parser tests**

Run: `cd frontend && npm run test -- txtParser.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/domain/models.ts frontend/src/reader/txtParser.ts frontend/src/reader/txtParser.test.ts
git commit -m "feat: parse txt books into readable segments"
```

---

### Task 3: IndexedDB 本地书库

**Files:**

- Create: `frontend/src/storage/db.ts`
- Create: `frontend/src/storage/libraryRepository.ts`
- Create: `frontend/src/storage/libraryRepository.test.ts`
- Modify: `frontend/package.json`

**Interfaces:**

- Consumes: `Book`, `Segment`, `ReadingProgress`, `Annotation`, `ChatMessage`, `AtmosphereProfile`, `BgmTrack`.
- Produces function: `saveParsedBook(parsed: ParsedBook): Promise<void>`.
- Produces function: `getBookWithSegments(bookId: string): Promise<BookWithSegments | undefined>`.
- Produces function: `saveReadingProgress(progress: ReadingProgress): Promise<void>`.
- Produces function: `getReadingProgress(bookId: string): Promise<ReadingProgress | undefined>`.

- [ ] **Step 1: Add storage dependency**

Install `idb`:

Run: `cd frontend && npm install idb`

- [ ] **Step 2: Write repository tests**

```ts
import { describe, expect, it } from "vitest";
import { parseTxtBook } from "../reader/txtParser";
import { getBookWithSegments, getReadingProgress, saveParsedBook, saveReadingProgress } from "./libraryRepository";

describe("libraryRepository", () => {
  it("saves and restores a parsed book with ordered segments", async () => {
    const parsed = parseTxtBook({
      fileName: "demo.txt",
      text: "第一章 起\n正文一。\n第二章 承\n正文二。"
    });

    await saveParsedBook(parsed);
    const restored = await getBookWithSegments(parsed.book.id);

    expect(restored?.book.title).toBe("demo");
    expect(restored?.segments.map((segment) => segment.index)).toEqual([0, 1]);
  });

  it("saves and restores reading progress", async () => {
    const progress = {
      bookId: "book-1",
      segmentId: "segment-1",
      charOffsetInSegment: 12,
      absoluteCharOffset: 80,
      updatedAt: new Date().toISOString()
    };

    await saveReadingProgress(progress);
    await expect(getReadingProgress("book-1")).resolves.toMatchObject({
      segmentId: "segment-1",
      absoluteCharOffset: 80
    });
  });
});
```

- [ ] **Step 3: Run repository tests and verify they fail**

Run: `cd frontend && npm run test -- libraryRepository.test.ts`

Expected: FAIL because repository functions are not implemented.

- [ ] **Step 4: Implement IndexedDB schema**

Create stores:

```ts
const DB_NAME = "immerseread";
const DB_VERSION = 1;
const STORES = ["books", "segments", "progress", "annotations", "chatMessages", "atmosphereProfiles", "bgmTracks"];
```

Use `idb.openDB` and indexes:

- `segments` by `bookId`.
- `annotations` by `bookId` and `segmentId`.
- `chatMessages` by `bookId`.
- `bgmTracks` by `source`.

- [ ] **Step 5: Implement repository functions**

Implementation requirements:

- `saveParsedBook` writes book and all segments in one transaction.
- `getBookWithSegments` sorts segments by `index`.
- `saveReadingProgress` overwrites progress by `bookId`.
- `getReadingProgress` returns `undefined` when missing.

- [ ] **Step 6: Run repository tests**

Run: `cd frontend && npm run test -- libraryRepository.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/storage
git commit -m "feat: persist local reader library"
```

---

### Task 4: SpoilerGuard 防剧透上下文

**Files:**

- Create: `frontend/src/spoiler/spoilerGuard.ts`
- Create: `frontend/src/spoiler/spoilerGuard.test.ts`
- Modify: `frontend/src/domain/models.ts`

**Interfaces:**

- Consumes: `Segment`, `ReadingProgress`.
- Produces type: `SpoilerRisk = "low" | "high"`.
- Produces function: `buildAllowedContext(input: BuildAllowedContextInput): AllowedContext`.

```ts
export interface BuildAllowedContextInput {
  segments: Segment[];
  progress: ReadingProgress;
  question: string;
  selectedText?: string;
  annotationNote?: string;
  maxChars?: number;
}

export interface AllowedContext {
  text: string;
  contextStartChar: number;
  contextEndChar: number;
  spoilerRisk: SpoilerRisk;
  instruction: string;
}
```

- [ ] **Step 1: Write SpoilerGuard tests**

```ts
import { describe, expect, it } from "vitest";
import { buildAllowedContext } from "./spoilerGuard";

const segments = [
  { id: "s1", bookId: "b1", index: 0, title: "第一章", startChar: 0, endChar: 12, text: "前文线索。", type: "chapter", parseConfidence: "high", atmosphereStatus: "pending" },
  { id: "s2", bookId: "b1", index: 1, title: "第二章", startChar: 12, endChar: 28, text: "未读真相：凶手是乙。", type: "chapter", parseConfidence: "high", atmosphereStatus: "pending" }
] as const;

describe("buildAllowedContext", () => {
  it("excludes unread text after reading progress", () => {
    const context = buildAllowedContext({
      segments: [...segments],
      progress: { bookId: "b1", segmentId: "s1", charOffsetInSegment: 5, absoluteCharOffset: 12, updatedAt: "now" },
      question: "凶手是谁？",
      maxChars: 1000
    });

    expect(context.text).toContain("前文线索");
    expect(context.text).not.toContain("凶手是乙");
    expect(context.contextEndChar).toBeLessThanOrEqual(12);
  });

  it("marks future-oriented questions as high risk", () => {
    const context = buildAllowedContext({
      segments: [...segments],
      progress: { bookId: "b1", segmentId: "s1", charOffsetInSegment: 5, absoluteCharOffset: 12, updatedAt: "now" },
      question: "他后来是不是背叛了？"
    });

    expect(context.spoilerRisk).toBe("high");
    expect(context.instruction).toContain("只能基于已读内容");
  });
});
```

- [ ] **Step 2: Run SpoilerGuard tests and verify they fail**

Run: `cd frontend && npm run test -- spoilerGuard.test.ts`

Expected: FAIL because `buildAllowedContext` is not implemented.

- [ ] **Step 3: Implement `buildAllowedContext`**

Implementation requirements:

- Sort segments by `startChar`.
- Trim each segment to `progress.absoluteCharOffset`.
- Keep at most `maxChars ?? 6000` characters from the end of read-so-far context.
- Detect high-risk questions with keywords: `后来`, `结局`, `真相`, `凶手`, `最终`, `boss`, `背叛`, `死了吗`, `是不是反派`.
- Include selected text and annotation note only if present.
- Return instruction: `只能基于已读内容回答；不要暗示、确认或引用未读剧情。`

- [ ] **Step 4: Run SpoilerGuard tests**

Run: `cd frontend && npm run test -- spoilerGuard.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/domain/models.ts frontend/src/spoiler
git commit -m "feat: enforce spoiler-safe context"
```

---

### Task 5: BGM 类型、内置曲目和推荐算法

**Files:**

- Create: `frontend/src/bgm/bgmTypes.ts`
- Create: `frontend/src/bgm/builtInTracks.ts`
- Create: `frontend/src/bgm/bgmMatcher.ts`
- Create: `frontend/src/bgm/bgmMatcher.test.ts`

**Interfaces:**

- Produces type: `BgmTrack`.
- Produces type: `AtmosphereProfile`.
- Produces function: `recommendBgm(profile: AtmosphereProfile, tracks: BgmTrack[], options?: RecommendOptions): BgmRecommendation[]`.

- [ ] **Step 1: Write matcher tests**

```ts
import { describe, expect, it } from "vitest";
import { recommendBgm } from "./bgmMatcher";
import type { AtmosphereProfile, BgmTrack } from "./bgmTypes";

const profile: AtmosphereProfile = {
  segmentId: "s1",
  moods: ["悬疑", "紧张"],
  scenes: ["夜晚"],
  pace: "medium",
  intensity: 0.7,
  energy: 0.55,
  darkness: 0.8,
  warmth: 0.2,
  tags: ["低音"],
  chapterEndPrompt: "这章明显在藏东西，要不要一起捋捋？",
  modelName: "test",
  createdAt: "now"
};

const tracks: BgmTrack[] = [
  { id: "night", title: "夜色疑云", source: "built-in", fileRef: "/audio/night.ogg", moods: ["悬疑"], scenes: ["夜晚"], energy: 0.5, darkness: 0.85, warmth: 0.2, tempo: "medium", licenseNote: "demo", createdAt: "now" },
  { id: "daily", title: "午后日常", source: "built-in", fileRef: "/audio/daily.ogg", moods: ["轻松"], scenes: ["日常"], energy: 0.2, darkness: 0.1, warmth: 0.9, tempo: "slow", licenseNote: "demo", createdAt: "now" }
];

describe("recommendBgm", () => {
  it("ranks tracks by mood, scene, and numeric similarity", () => {
    const recommendations = recommendBgm(profile, tracks);
    expect(recommendations[0]).toMatchObject({ trackId: "night" });
    expect(recommendations[0].reason).toContain("悬疑");
  });

  it("respects locked current track", () => {
    const recommendations = recommendBgm(profile, tracks, { lockedTrackId: "daily" });
    expect(recommendations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run matcher tests and verify they fail**

Run: `cd frontend && npm run test -- bgmMatcher.test.ts`

Expected: FAIL because BGM modules are not implemented.

- [ ] **Step 3: Implement BGM types and built-in metadata**

Create at least these built-in track metadata records:

- `night-suspense`: 悬疑、夜晚、紧张。
- `battle-rise`: 战斗、燃、快节奏。
- `daily-warm`: 日常、轻松、温暖。
- `sad-memory`: 回忆、伤感、慢节奏。

- [ ] **Step 4: Implement `recommendBgm`**

Scoring rules:

- `+3` for each mood overlap.
- `+2` for each scene overlap.
- `+1` if tempo matches profile pace.
- Subtract numeric distance: `abs(energy diff) + abs(darkness diff) + abs(warmth diff)`.
- Return top 3 recommendations with positive scores.
- If `lockedTrackId` exists, return an empty list because the user chose not to be interrupted.

- [ ] **Step 5: Run matcher tests**

Run: `cd frontend && npm run test -- bgmMatcher.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/bgm
git commit -m "feat: recommend bgm from atmosphere tags"
```

---

### Task 6: Spring Boot LLM 代理

**Files:**

- Create: `backend/src/main/java/cn/immerseread/config/LlmProperties.java`
- Create: `backend/src/main/java/cn/immerseread/llm/LlmController.java`
- Create: `backend/src/main/java/cn/immerseread/llm/LlmService.java`
- Create: `backend/src/main/java/cn/immerseread/llm/OpenAiChatClient.java`
- Create: `backend/src/main/java/cn/immerseread/llm/dto/AtmosphereRequest.java`
- Create: `backend/src/main/java/cn/immerseread/llm/dto/AtmosphereResponse.java`
- Create: `backend/src/main/java/cn/immerseread/llm/dto/ChatRequest.java`
- Create: `backend/src/main/java/cn/immerseread/llm/dto/ChatResponse.java`
- Create: `backend/src/main/java/cn/immerseread/llm/dto/ErrorResponse.java`
- Create: `backend/src/test/java/cn/immerseread/llm/LlmControllerTest.java`
- Create: `backend/src/test/java/cn/immerseread/llm/LlmServiceTest.java`
- Modify: `backend/src/main/java/cn/immerseread/health/HealthController.java`

**Interfaces:**

- Produces endpoint: `POST /api/llm/chat`.
- Produces endpoint: `POST /api/llm/atmosphere`.
- Produces Java service: `LlmService.chat(ChatRequest request): ChatResponse`.
- Produces Java service: `LlmService.analyzeAtmosphere(AtmosphereRequest request): AtmosphereResponse`.

- [ ] **Step 1: Write controller tests**

```java
@WebMvcTest(LlmController.class)
class LlmControllerTest {
    @Autowired
    MockMvc mvc;

    @MockBean
    LlmService llmService;

    @Test
    void rejectsOversizedChatContext() throws Exception {
        String oversized = "x".repeat(12001);
        mvc.perform(post("/api/llm/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"bookId":"b1","segmentId":"s1","question":"聊聊","allowedContext":"%s","contextStartChar":0,"contextEndChar":12,"spoilerRisk":"low"}
                    """.formatted(oversized)))
            .andExpect(status().isPayloadTooLarge());
    }

    @Test
    void returnsChatResponseFromService() throws Exception {
        given(llmService.chat(any())).willReturn(new ChatResponse("目前看这人确实怪。", "test-model"));

        mvc.perform(post("/api/llm/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"bookId":"b1","segmentId":"s1","question":"他可疑吗","allowedContext":"前文线索","contextStartChar":0,"contextEndChar":12,"spoilerRisk":"high"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").value("目前看这人确实怪。"));
    }
}
```

- [ ] **Step 2: Write service tests**

```java
class LlmServiceTest {
    @Test
    void missingApiKeyDisablesChatGracefully() {
        LlmService service = new LlmService(new DisabledOpenAiChatClient(), new LlmProperties("", "", "gpt-4.1-mini"));
        ChatResponse response = service.chat(new ChatRequest("b1", "s1", "问题", "上下文", 0, 10, "low"));
        assertThat(response.content()).contains("LLM 功能尚未配置");
    }
}
```

- [ ] **Step 3: Run backend tests and verify they fail**

Run: `cd backend && mvn test`

Expected: FAIL because LLM classes are not implemented.

- [ ] **Step 4: Implement DTOs**

Use Java records:

```java
public record ChatRequest(
    String bookId,
    String segmentId,
    String question,
    String allowedContext,
    int contextStartChar,
    int contextEndChar,
    String spoilerRisk
) {}

public record ChatResponse(String content, String modelName) {}
```

Create analogous atmosphere records with fields from `AtmosphereProfile`.

- [ ] **Step 5: Implement request validation**

Rules:

- `question` must be non-blank.
- `allowedContext.length() <= 12000`.
- `contextStartChar >= 0`.
- `contextEndChar >= contextStartChar`.
- On oversized context, return HTTP `413`.
- On invalid fields, return HTTP `400`.

- [ ] **Step 6: Implement `LlmService` and `OpenAiChatClient`**

Implementation requirements:

- `LlmProperties` reads `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL`.
- If key is blank, return a disabled-feature response without calling provider.
- Chat prompt includes: short answer, casual web-novel buddy tone, and spoiler-safe instruction.
- Atmosphere prompt asks for structured JSON only.
- Logs must include request metadata, not raw novel text.

- [ ] **Step 7: Run backend tests**

Run: `cd backend && mvn test`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend
git commit -m "feat: proxy llm requests through spring boot"
```

---

### Task 7: 阅读器主流程 UI

**Files:**

- Create: `frontend/src/components/LibraryImport.tsx`
- Create: `frontend/src/components/ReaderView.tsx`
- Create: `frontend/src/components/ReaderView.test.tsx`
- Modify: `frontend/src/app/App.tsx`
- Modify: `frontend/src/styles/global.css`

**Interfaces:**

- Consumes: `parseTxtBook`.
- Consumes: `saveParsedBook`, `getBookWithSegments`, `saveReadingProgress`.
- Produces UI states: empty library, import success, reader open.

- [ ] **Step 1: Write UI tests**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReaderView } from "./ReaderView";

describe("ReaderView", () => {
  it("renders segment title and text", () => {
    render(
      <ReaderView
        bookTitle="测试书"
        segment={{ title: "第一章 初见", text: "她推开门。雨声很急。" }}
        preferences={{ fontSize: 20, lineHeight: 1.8, theme: "paper", width: "normal" }}
        onPreferenceChange={() => undefined}
        onProgressChange={() => undefined}
      />
    );

    expect(screen.getByRole("heading", { name: "第一章 初见" })).toBeInTheDocument();
    expect(screen.getByText("她推开门。雨声很急。")).toBeInTheDocument();
  });

  it("changes font size from controls", () => {
    const changes: unknown[] = [];
    render(
      <ReaderView
        bookTitle="测试书"
        segment={{ title: "第一章", text: "正文" }}
        preferences={{ fontSize: 18, lineHeight: 1.7, theme: "paper", width: "normal" }}
        onPreferenceChange={(next) => changes.push(next)}
        onProgressChange={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "增大字号" }));
    expect(changes).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run UI tests and verify they fail**

Run: `cd frontend && npm run test -- ReaderView.test.tsx`

Expected: FAIL because reader components are not implemented.

- [ ] **Step 3: Implement import flow**

Implementation requirements:

- File input accepts `.txt`.
- Use `FileReader` or `file.text()` for UTF-8.
- Provide encoding fallback UI label for GBK as a visible future option, but first implementation may show a clear unsupported-encoding message.
- Parse file with `parseTxtBook`.
- Save parsed book with repository.
- Open the first segment.

- [ ] **Step 4: Implement reader controls**

Controls:

- Font size decrease/increase buttons.
- Line height select.
- Theme select with at least `paper`, `night`, `green`.
- Reading width select with `narrow`, `normal`, `wide`.

CSS requirements:

- No viewport-scaled font sizes.
- No nested cards around reading content.
- Text column uses `max-width` and responsive padding.
- Buttons use accessible names.

- [ ] **Step 5: Run UI tests**

Run: `cd frontend && npm run test -- ReaderView.test.tsx App.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app frontend/src/components frontend/src/styles
git commit -m "feat: build local txt reader flow"
```

---

### Task 8: 批注与书搭子面板集成

**Files:**

- Create: `frontend/src/annotations/annotationRanges.ts`
- Create: `frontend/src/annotations/annotationRanges.test.ts`
- Create: `frontend/src/components/AnnotationToolbar.tsx`
- Create: `frontend/src/components/CompanionPanel.tsx`
- Create: `frontend/src/llm/client.ts`
- Create: `frontend/src/llm/prompts.ts`
- Modify: `frontend/src/storage/libraryRepository.ts`
- Modify: `frontend/src/components/ReaderView.tsx`

**Interfaces:**

- Consumes: `buildAllowedContext`.
- Produces function: `createAnnotationFromSelection(input: SelectionInput): AnnotationDraft`.
- Produces function: `sendCompanionChat(request: CompanionChatRequest): Promise<CompanionChatResponse>`.

- [ ] **Step 1: Write annotation range tests**

```ts
import { describe, expect, it } from "vitest";
import { createAnnotationFromSelection } from "./annotationRanges";

describe("createAnnotationFromSelection", () => {
  it("creates an annotation draft for a valid text range", () => {
    const draft = createAnnotationFromSelection({
      bookId: "b1",
      segmentId: "s1",
      segmentText: "她推开门。雨声很急。",
      startChar: 0,
      endChar: 5,
      note: "这里有点不对劲",
      color: "yellow"
    });

    expect(draft.selectedText).toBe("她推开门");
    expect(draft.note).toBe("这里有点不对劲");
  });

  it("rejects empty ranges", () => {
    expect(() =>
      createAnnotationFromSelection({
        bookId: "b1",
        segmentId: "s1",
        segmentText: "正文",
        startChar: 1,
        endChar: 1,
        note: "",
        color: "yellow"
      })
    ).toThrow("请选择要批注的文本");
  });
});
```

- [ ] **Step 2: Run annotation tests and verify they fail**

Run: `cd frontend && npm run test -- annotationRanges.test.ts`

Expected: FAIL because annotation utilities are not implemented.

- [ ] **Step 3: Implement annotation utilities and repository methods**

Add repository functions:

```ts
export async function saveAnnotation(annotation: Annotation): Promise<void>;
export async function listAnnotations(bookId: string, segmentId: string): Promise<Annotation[]>;
export async function deleteAnnotation(annotationId: string): Promise<void>;
export async function saveChatMessage(message: ChatMessage): Promise<void>;
export async function listChatMessages(bookId: string): Promise<ChatMessage[]>;
```

- [ ] **Step 4: Implement CompanionPanel**

UI behavior:

- Shows local chat messages.
- 输入框占位文案：`和书搭子聊聊当前剧情`.
- Submit builds spoiler-safe context with `buildAllowedContext`.
- Calls `/api/llm/chat` through `sendCompanionChat`.
- Displays disabled message when backend reports missing key.

- [ ] **Step 5: Wire annotation-to-chat action**

Behavior:

- Selected text can create highlight and note.
- Annotation toolbar has `问书搭子` button.
- Button opens CompanionPanel with selected text and note prefilled as context.
- LLM payload includes `contextStartChar` and `contextEndChar`.

- [ ] **Step 6: Run tests**

Run: `cd frontend && npm run test -- annotationRanges.test.ts spoilerGuard.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/annotations frontend/src/components frontend/src/llm frontend/src/storage
git commit -m "feat: add annotations and companion chat"
```

---

### Task 9: 氛围分析与 BGM 播放体验

**Files:**

- Create: `frontend/src/components/BgmDock.tsx`
- Create: `frontend/src/components/BgmDock.test.tsx`
- Modify: `frontend/src/bgm/builtInTracks.ts`
- Modify: `frontend/src/llm/client.ts`
- Modify: `frontend/src/storage/libraryRepository.ts`
- Modify: `frontend/src/components/ReaderView.tsx`

**Interfaces:**

- Consumes: `recommendBgm`.
- Consumes backend endpoint: `POST /api/llm/atmosphere`.
- Produces UI: current track, recommendation prompt, upload local audio, metadata editing.

- [ ] **Step 1: Write BgmDock component tests**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BgmDock } from "./BgmDock";

describe("BgmDock", () => {
  it("asks for confirmation before switching to a recommendation", () => {
    const switches: string[] = [];
    render(
      <BgmDock
        currentTrackId={undefined}
        recommendations={[{ trackId: "night", title: "夜色疑云", reason: "匹配悬疑和夜晚氛围" }]}
        onConfirmSwitch={(trackId) => switches.push(trackId)}
        onLockCurrent={() => undefined}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "切换到夜色疑云" }));
    expect(screen.getByText("确认切换 BGM？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认" }));
    expect(switches).toEqual(["night"]);
  });
});
```

- [ ] **Step 2: Run BgmDock tests and verify they fail**

Run: `cd frontend && npm run test -- BgmDock.test.tsx`

Expected: FAIL because `BgmDock` is not implemented.

- [ ] **Step 3: Implement atmosphere client**

Add function:

```ts
export async function analyzeAtmosphere(segmentId: string, text: string): Promise<AtmosphereProfile>;
```

Behavior:

- POST to `/api/llm/atmosphere`.
- On missing key or provider failure, return neutral fallback profile with `moods: ["平静"]`.

- [ ] **Step 4: Implement BgmDock**

UI behavior:

- Shows play/pause.
- Shows current track title.
- Shows top recommendation reason.
- Requires confirmation before switching.
- Has lock-current-track toggle.
- Allows local audio upload metadata form for title, moods, scenes, energy, darkness, warmth, tempo.

- [ ] **Step 5: Wire BGM into ReaderView**

Behavior:

- When opening a segment, show existing profile or request atmosphere analysis by user action.
- Use `recommendBgm` with built-in and uploaded tracks.
- Store profile and uploaded BGM metadata locally.
- Do not upload audio blobs to backend.

- [ ] **Step 6: Run BGM tests**

Run: `cd frontend && npm run test -- bgmMatcher.test.ts BgmDock.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/bgm frontend/src/components/BgmDock.tsx frontend/src/components/BgmDock.test.tsx frontend/src/llm frontend/src/storage
git commit -m "feat: add atmosphere-based bgm experience"
```

---

### Task 10: Docker、CI、E2E 和文档

**Files:**

- Create: `docker-compose.yml`
- Create: `frontend/Dockerfile`
- Create: `backend/Dockerfile`
- Create: `frontend/e2e/reader-flow.spec.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`
- Create: `docs/SPEC_PROCESS.md`
- Create: `docs/AGENT_LOG.md`

**Interfaces:**

- Consumes all previous modules.
- Produces command: `docker compose up --build`.
- Produces command: `npm run test`, `mvn test`, `npm run e2e`.

- [ ] **Step 1: Write E2E test**

```ts
import { test, expect } from "@playwright/test";

test("reader flow uploads txt, creates annotation, and opens companion", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("上传 TXT").setInputFiles({
    name: "demo.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("第一章 初见\n她推开门。雨声很急。\n第二章 真相\n凶手是乙。")
  });

  await expect(page.getByRole("heading", { name: "第一章 初见" })).toBeVisible();
  await page.getByText("她推开门").dblclick();
  await page.getByRole("button", { name: "添加批注" }).click();
  await page.getByLabel("批注内容").fill("这里像是在铺垫");
  await page.getByRole("button", { name: "保存批注" }).click();
  await page.getByRole("button", { name: "问书搭子" }).click();
  await expect(page.getByText("和书搭子聊聊当前剧情")).toBeVisible();
});
```

- [ ] **Step 2: Run E2E and verify it fails before Docker wiring is complete**

Run: `cd frontend && npm run e2e`

Expected: FAIL because the full app flow is not wired for Playwright yet.

- [ ] **Step 3: Add Docker Compose**

Requirements:

- Frontend service exposes `5173`.
- Backend service exposes `8080`.
- Backend reads `.env`.
- Frontend uses `VITE_API_BASE_URL=http://localhost:8080`.

Compose shape:

```yaml
services:
  backend:
    build: ./backend
    env_file: .env
    ports:
      - "8080:8080"
  frontend:
    build: ./frontend
    environment:
      - VITE_API_BASE_URL=http://localhost:8080
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

- [ ] **Step 4: Add CI workflow**

Workflow jobs:

- `frontend`: install dependencies, run `npm run test`, run `npm run build`.
- `backend`: run `mvn test`.

- [ ] **Step 5: Update README**

README must include:

- 30-second product explanation.
- Local-first copyright/privacy boundary.
- `.env` setup.
- `docker compose up --build`.
- Test commands.
- Note that missing API key disables LLM features while local reader still works.

- [ ] **Step 6: Add process docs**

Create `docs/SPEC_PROCESS.md` summarizing:

- Brainstorming decisions.
- Why Spring Boot was chosen.
- Why MySQL was excluded from first version.
- Why spoiler prevention is engineering-controlled instead of prompt-only.

Create `docs/AGENT_LOG.md` summarizing:

- Design spec creation.
- Implementation plan creation.
- Each future implementation task and verification result.

- [ ] **Step 7: Run full verification**

Run: `cd frontend && npm run test`

Expected: PASS.

Run: `cd frontend && npm run build`

Expected: PASS.

Run: `cd backend && mvn test`

Expected: PASS.

Run: `docker compose config`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml frontend/Dockerfile backend/Dockerfile frontend/e2e .github README.md docs/SPEC_PROCESS.md docs/AGENT_LOG.md
git commit -m "chore: add distribution ci and process docs"
```

---

## Self-Review

### Spec Coverage

- 问题陈述和目标用户：由 README 与 SPEC 文档覆盖，Task 10 更新 README。
- 用户故事 1：Task 2 和 Task 7 覆盖 TXT 解析与阅读入口。
- 用户故事 2：Task 7 覆盖阅读 UI 和偏好。
- 用户故事 3：Task 5、Task 6、Task 9 覆盖氛围分析和 BGM 推荐。
- 用户故事 4：Task 9 覆盖本地 BGM 上传与播放。
- 用户故事 5：Task 8 覆盖批注创建与恢复。
- 用户故事 6：Task 8 覆盖批注带入书搭子。
- 用户故事 7：Task 4、Task 6、Task 8 覆盖防剧透聊天。
- 非功能性需求：Task 6 覆盖凭据安全和日志脱敏，Task 7/9 覆盖可用性，Task 10 覆盖分发、CI 和文档。
- 系统架构：Task 1 建立前后端骨架，Task 3 建立本地存储，Task 6 建立后端代理。
- 数据模型：Task 2、Task 3、Task 4、Task 5、Task 8 定义并使用主要实体。
- 凭据与分发：Task 1 创建 `.env.example`，Task 6 实现凭据读取，Task 10 实现 Docker Compose。
- 技术选型：Task 1 和 Task 10 固化 React、Spring Boot、IndexedDB 和 Docker。
- 验收标准：Task 2-10 均包含对应测试和命令。

### Red-Flag Scan

本计划不包含未完成标记、延期实现说明、笼统错误处理要求或未定义接口。每个任务都有明确文件、接口、测试、实现要求和提交点。

### Type Consistency

- `Book`、`Segment`、`ReadingProgress`、`Annotation`、`ChatMessage`、`AtmosphereProfile`、`BgmTrack` 在前端模型中统一定义或从 BGM 类型模块导出。
- `buildAllowedContext` 输出的 `contextStartChar`、`contextEndChar` 和 `spoilerRisk` 与后端 `ChatRequest` 字段一致。
- BGM 推荐中的 `trackId` 与 `BgmTrack.id` 一致。
- 后端 DTO 字段与前端 `sendCompanionChat` 和 `analyzeAtmosphere` 请求字段一致。
