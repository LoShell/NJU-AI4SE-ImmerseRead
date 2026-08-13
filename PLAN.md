# ImmerseRead 实现计划

> **给智能体执行者：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐步执行本计划。步骤使用复选框（`- [ ]`）语法跟踪。

**目标：** 构建一个本地优先的沉浸式 TXT 小说阅读器，支持章节解析、滚动阅读、轻量批注、BGM 推荐、Spring Boot LLM 代理和严格防剧透的“书搭子”聊天。

**架构：** 前端使用 React + TypeScript + Vite，负责 TXT 解析、IndexedDB 本地存储、阅读 UI、批注、BGM 播放与防剧透上下文构造。后端使用 Spring Boot，仅作为 LLM 代理、凭据隔离、请求校验、结构化输出规范化和脱敏日志层，不持久化小说正文、批注、聊天记录或音频。

**技术栈：** React、TypeScript、Vite、Vitest、React Testing Library、Playwright、IndexedDB、Java 17、Spring Boot 4.1.0、JUnit 5、GitLab CI、Docker Compose、OpenAI-compatible Chat Completions API。

## 实现进度

> 本节持续更新，用于满足课程要求：每个已完成 task 都需要标记对应 commit hash。

- [x] Task 1: 项目脚手架与一键命令
  - 实现：`281876b` (`chore: scaffold ImmerseRead app`)，由子智能体 Avicenna 完成。
  - 环境修复：`e8d5d2c` (`chore: prepare local verification tools`)，由 Codex/用户环境修复完成。
  - 评审修复：`c3405ef` (`docs: update scaffold verification notes`)，由 Codex 在子智能体评审后完成。
  - 人工验证：App smoke test 于 2026-08-07 在本地通过。
- [x] Task 2: 领域模型与 TXT 解析器
  - 实现：`fd186e1` (`feat: parse txt books into readable segments`)，由子智能体 Einstein 完成。
  - 人工/Codex 修复：`14a0553` (`fix: restore readable txt parser fixtures`) 恢复可读中文 fixture 与解析规则。
  - 评审：子智能体 Hypatia 返回 `NO_BLOCKING_FINDINGS`。
  - 人工验证：`txtParser.test.ts` 于 2026-08-07 在本地通过。
- [x] Task 3: IndexedDB 本地书库
  - 实现：`eca67ca` (`feat: persist local reader library`)，由子智能体 Carson 完成。
  - 评审：子智能体 Copernicus 返回 `NO_BLOCKING_FINDINGS`。
  - 人工验证：`libraryRepository.test.ts` 于 2026-08-07 在本地通过。
- [x] Task 4: SpoilerGuard 防剧透上下文
  - 实现：`9c50758` (`feat: enforce spoiler-safe context`)，由子智能体 Linnaeus 完成。
  - 人工/Codex 修复：`0b66009` (`fix: restore readable spoiler guard rules`) 恢复可读中文规则与测试。
  - 人工验证：`spoilerGuard.test.ts` 于 2026-08-07 在本地通过。
- [x] Task 5: BGM 类型、内置音轨与推荐规则
  - 实现：`7190db7` (`feat: recommend bgm from atmosphere tags`)，由子智能体 Averroes 完成。
  - 人工/Codex 修复：`cf9798f` (`fix: align bgm metadata with atmosphere scale`) 将内置元数据对齐到中文氛围标签和 0-1 评分范围。
  - 人工验证：`bgmMatcher.test.ts` 于 2026-08-07 在本地通过。
- [x] Task 6: Spring Boot LLM 代理与凭据边界
  - 实现：`d9044f0` (`feat: secure llm credentials and proxy requests`)，由子智能体 Heisenberg 完成。
  - 人工/Codex 修复：`3a5032e` (`fix: align llm proxy messages and atmosphere scale`) 恢复可读提示词/消息，并将氛围数值对齐到前端 0-1 范围。
  - 验证：`mvn test` 于 2026-08-07 通过 11 个测试。

### 当前主对话前端打磨

- [x] Task 10：阅读器 BGM 队列、真实进度与夜视模式打磨
  - 实现：`2dbb545` (`前端体验良好，初版告成`)，由 Codex 主对话完成，未使用子智能体。
  - 范围：可播放 BGM 上一首/下一首、播放结束后下一首、滚动推导章节/全文进度、夜间阅读模式和文档更新。
  - 验证：`cd frontend && npm run test -- App.test.tsx BgmDock.test.tsx` 于 2026-08-11 在本地通过。
- [x] Task 11：提交准备文档与 GitLab CI 基线
  - 实现：`8197f6c` (`chore: add ci and submission docs`)，由 Codex 主对话完成，未使用子智能体。
  - 范围：根目录 `.gitlab-ci.yml` 包含要求的 `unit-test` job，README 运行/key/CI 说明，以及 SPEC 中当前 MVP 分发与凭据行为对齐。
  - 验证：`cd frontend && npm run test`、`cd frontend && npm run build` 和 `cd backend && .\mvnw.cmd test` 于 2026-08-11 在本地通过。Docker 与远端 GitLab CI 需要用户在目标环境验证。
- [x] Task 12：前端 MVP 打磨与本地演示资源
  - 实现：`8598026` (`feat: 完善阅读器 BGM 与 TXT 导入体验`)，由 Codex 主对话完成，未使用子智能体。
  - 范围：GB18030 TXT 解码 fallback、7 个系统演示 BGM 文件引用、列表/单曲循环播放模式、BGM 推荐题材选择器打磨、移除无功能设置/锁定按钮、`.gitignore` 凭据规则加固和文档对齐。
  - 验证：`cd frontend && npm run test -- BgmDock.test.tsx`、`cd frontend && npm run test` 和 `cd frontend && npm run build` 于 2026-08-12 在本地通过。
- [x] Task 13：Docker Compose 分发配置
  - 实现：`40dcf6a` (`添加 Docker Compose 分发配置`)，由 Codex 主对话完成，未使用子智能体。
  - 范围：根目录 `docker-compose.yml`、前端 Nginx 镜像、后端 Spring Boot 镜像、Docker ignore 文件、根目录 `.env.example` 和 Docker README 说明。
  - 验证：静态仓库检查、前端测试/构建和后端测试已在当前 Windows worktree 通过。用户于 2026-08-12 在 Ubuntu 虚拟机运行 `docker compose up --build`；`curl http://localhost:8080/api/health`、`curl -I http://localhost:5173` 和 `curl -I http://localhost:5173/api/health` 均返回成功响应。

## 全局约束

### 已实现细化项

- BGM 推荐切换仍需要读者确认。普通播放器控件现在支持上一首/下一首、列表循环和单曲循环，并只在可播放的本地/系统音频队列内生效。
- 内置 BGM 元数据位于 `frontend/src/bgm/builtInTracks.ts`。演示音频应放在 `frontend/public/bgm/` 下，并通过 `fileRef: "/bgm/<file>"` 引用。
- TXT 阅读现在先严格使用 UTF-8，失败后对常见 GBK/GB2312 网文文件 fallback 到 GB18030。
- Docker Compose 分发配置位于仓库根目录，并已于 2026-08-12 在用户 Ubuntu 虚拟机中验证。
- 章节进度由中间正文滚动容器推导。全文进度由当前片段偏移量加章节内滚动偏移量重新计算。
- 夜视模式作为独立阅读工具栏按钮，放在主题控制之后。

- 第一版只支持 TXT，不支持 EPUB 或 PDF。
- 小说正文、批注、阅读进度、聊天记录和用户上传 BGM 默认只保存在浏览器本地。
- 第一版不使用 MySQL。
- LLM API key 只存在于后端环境变量，前端不得接触凭据。
- 凭据读取优先级为系统凭据管理器，其次为 `.env` / 环境变量；`.env` 必须作为明文 fallback 风险写入 README。
- 书搭子默认严格防剧透，LLM 请求不得包含当前阅读位置之后的正文。
- 书搭子默认回复较短，通常为 1-4 句。
- LLM 调用是用户动作或单次分析触发，不做自主 agent 循环或 LLM 工具调用。
- BGM 推荐切换需要用户确认；播放器队列内的上一首、下一首和列表循环属于普通播放控制。
- 前端参考 Open Design，阅读器界面保持安静、沉浸、内容优先。
- 每个开发任务必须先写测试，再实现，再运行对应测试。
- 每个任务完成后单独提交。
- 根目录必须提供 `SPEC.md`、`PLAN.md`、`SPEC_PROCESS.md`、`AGENT_LOG.md`、`README.md`、`.gitlab-ci.yml`。
- CI 必须包含名为 `unit-test` 的 job。

---

## 文件结构

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
  .gitlab-ci.yml
  SPEC.md
  PLAN.md
  README.md
  SPEC_PROCESS.md
  AGENT_LOG.md
```

## 当前后端骨架说明

后端骨架已经存在于 `backend/` 下，必须视为用户提供的既有工作：

- `backend/pom.xml` 已使用 Spring Boot `4.1.0` 和 Java `17`；除非项目因版本问题无法构建，否则保留这些版本。
- `backend/src/main/java/cn/immerseread/ImmerseReadApplication.java` 已存在。
- `backend/src/main/java/cn/immerseread/health/HealthController.java` 已存在，但为空。
- `backend/src/main/java/cn/immerseread/llm/` 已包含 `LlmController`、`LlmService`、`ChatClient`、DTO 和部分位置错误的测试占位类。
- `backend/src/main/java/cn/immerseread/config/LlmPropertirs.java` 存在拼写错误；需要重命名或替换为 `LlmProperties.java`。
- 任何当前位于 `src/main/java` 下且名为 `*Test` 的类都是位置错误的测试类，应在创建真实测试类时移动到 `src/test/java` 或删除。
- `backend/README.md`、`backend/docker-compose.yml` 和 `backend/.env.example` 当前为空；在相关任务中补齐或替换。

## 预检环境

执行 Task 1 前，先确认本地工具可用：

- Node.js 22 或更新：`node --version`。在 Codex Desktop 中，可以使用内置 Node：`C:\Users\JHZ\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`。
- npm 10 或更新，或 pnpm 10 或更新：`npm --version` 或 `pnpm --version`。在本 workspace 中，如果系统 npm 过旧，可使用内置 pnpm：`C:\Users\JHZ\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd`。
- Java 17 或更新：`java --version`。
- Maven 3.9 或项目 Maven wrapper：`mvn --version` 或 `backend/mvnw --version`。
- Git: `git --version`.

如果缺少工具，停止并在 `AGENT_LOG.md` 记录 blocker；不要猜测替代命令。如果 Maven 需要下载依赖，它可能写入项目目录外的本地 Maven 仓库。

---

### Task 1: 项目脚手架与一键命令

**文件：**

- 新建：`frontend/package.json`
- 新建：`frontend/vite.config.ts`
- 新建：`frontend/tsconfig.json`
- 新建：`frontend/index.html`
- 新建：`frontend/src/main.tsx`
- 新建：`frontend/src/app/App.tsx`
- 新建：`frontend/src/app/App.test.tsx`
- 新建：`frontend/src/styles/global.css`
- 验证：`backend/pom.xml`
- 修改：`backend/src/main/java/cn/immerseread/ImmerseReadApplication.java`
- 修改：`backend/src/main/java/cn/immerseread/health/HealthController.java`
- 新建：`backend/src/test/java/cn/immerseread/health/HealthControllerTest.java`
- 若仍存在则删除：`backend/src/main/java/cn/immerseread/llm/health/HealthControllerTest.java`
- 修改：`.gitignore`
- 修改：`backend/.env.example`
- 修改：`README.md`

**接口：**

- 产出前端命令：`npm run test`、`npm run build`、`npm run dev`；使用 pnpm 时可用等价命令 `pnpm test`、`pnpm build`、`pnpm dev`。
- 产出后端命令：`./mvnw test` 或 `mvn test`。
- 产出后端接口：`GET /api/health`。
- 产出环境变量：`LLM_PROVIDER`、`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`；保留 `OPENAI_*` 兼容。

- [ ] **Step 1：创建最小前端测试框架**

只创建 Vitest 加载 React 测试所需的文件：

- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/styles/global.css`

第一次运行测试前，`frontend/package.json` 必须包含以下 scripts：

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

这是在搭建测试运行器，不是在实现产品行为。

- [ ] **Step 2：创建前端失败冒烟测试**

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

- [ ] **Step 3：运行前端测试并确认失败**

运行：`cd frontend && npm run test -- App.test.tsx`

预期：FAIL，因为 `App.tsx` 尚未渲染要求的产品外壳。如果命令因依赖未安装而失败，先运行 `npm install` 或 `pnpm install`，再用选定的包管理器重复同一测试命令。

- [ ] **Step 4：实现最小 App 组件**

实现 `App.tsx`：

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

- [ ] **Step 5：验证后端 pom**

打开 `backend/pom.xml`，确认它已经包含：

- Spring Boot parent 版本 `4.1.0`。
- Java 版本 `17`。
- `spring-boot-starter-webmvc`.
- `spring-boot-starter-validation`.
- `spring-boot-starter-webmvc-test`.
- `spring-boot-starter-validation-test`.

如果这些依赖已经存在，Task 1 不需要编辑 `pom.xml`。如果缺少依赖，只添加 `/api/health` 及其测试所需的最小依赖。

- [ ] **Step 6：创建后端失败健康检查测试**

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

- [ ] **Step 7：补齐既有 Spring Boot 脚手架和健康检查接口**

实现 `HealthController`：

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

保留 `backend/pom.xml` 中既有的 Spring Boot `4.1.0` parent。确保测试类位于 `backend/src/test/java`，而不是 `backend/src/main/java`。

- [ ] **Step 8：运行脚手架测试**

运行：`cd frontend && npm run test -- App.test.tsx`

预期：PASS。

运行：`cd backend && mvn test`

预期：PASS。

- [ ] **Step 9：提交**

```bash
git add frontend backend .gitignore README.md
git commit -m "chore: scaffold ImmerseRead app"
```

---

### Task 2: 领域模型与 TXT 解析器

**文件：**

- 新建：`frontend/src/domain/models.ts`
- 新建：`frontend/src/reader/txtParser.ts`
- 新建：`frontend/src/reader/txtParser.test.ts`

**接口：**

- 产出类型：`Book`.
- 产出类型：`Segment`.
- 产出函数：`parseTxtBook(input: ParseTxtBookInput): ParsedBook`.

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

- [ ] **Step 1：编写解析器测试**

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

- [ ] **Step 2：运行解析器测试并确认失败**

运行：`cd frontend && npm run test -- txtParser.test.ts`

预期：FAIL，因为 `parseTxtBook` 尚未实现。

- [ ] **Step 3：实现领域模型**

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

- [ ] **Step 4：实现 `parseTxtBook`**

使用以下正则：

```ts
const CHAPTER_PATTERNS = [
  /^第[一二三四五六七八九十百千万零〇0-9]+[章节回].*$/gm,
  /^卷[一二三四五六七八九十百千万零〇0-9]+.*$/gm,
  /^Chapter\s+\d+.*$/gim,
  /^\d+[.、]\s*.+$/gm
];
```

实现要求：

- 使用 `crypto.randomUUID()` 生成 id。
- 标题从文件名中去掉 `.txt` 后缀。
- 识别出的标题少于 2 个时，视为不可靠。
- chunk 模式下，在配置的 `chunkSize` 之前尽量靠近段落边界切分。
- 保留片段文本中的每个原始字符。

- [ ] **Step 5：运行解析器测试**

运行：`cd frontend && npm run test -- txtParser.test.ts`

预期：PASS。

- [ ] **Step 6：提交**

```bash
git add frontend/src/domain/models.ts frontend/src/reader/txtParser.ts frontend/src/reader/txtParser.test.ts
git commit -m "feat: parse txt books into readable segments"
```

---

### Task 3: IndexedDB 本地书库

**文件：**

- 新建：`frontend/src/storage/db.ts`
- 新建：`frontend/src/storage/libraryRepository.ts`
- 新建：`frontend/src/storage/libraryRepository.test.ts`
- 修改：`frontend/package.json`

**接口：**

- 消费：`Book`, `Segment`, `ReadingProgress`, `Annotation`, `ChatMessage`, `AtmosphereProfile`, `BgmTrack`.
- 产出函数：`saveParsedBook(parsed: ParsedBook): Promise<void>`.
- 产出函数：`getBookWithSegments(bookId: string): Promise<BookWithSegments | undefined>`.
- 产出函数：`saveReadingProgress(progress: ReadingProgress): Promise<void>`.
- 产出函数：`getReadingProgress(bookId: string): Promise<ReadingProgress | undefined>`.

- [ ] **Step 1：添加存储依赖**

Install `idb`:

运行：`cd frontend && npm install idb`

- [ ] **Step 2：编写仓储测试**

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

- [ ] **Step 3：运行仓储测试并确认失败**

运行：`cd frontend && npm run test -- libraryRepository.test.ts`

预期：FAIL，因为仓储函数尚未实现。

- [ ] **Step 4：实现 IndexedDB schema**

创建 stores：

```ts
const DB_NAME = "immerseread";
const DB_VERSION = 1;
const STORES = ["books", "segments", "progress", "annotations", "chatMessages", "atmosphereProfiles", "bgmTracks"];
```

使用 `idb.openDB` 和索引：

- `segments` by `bookId`.
- `annotations` by `bookId` and `segmentId`.
- `chatMessages` by `bookId`.
- `bgmTracks` by `source`.

- [ ] **Step 5：实现仓储函数**

实现要求：

- `saveParsedBook` 在一个事务中写入书籍和所有片段。
- `getBookWithSegments` 按 `index` 排序片段。
- `saveReadingProgress` 按 `bookId` 覆盖进度。
- `getReadingProgress` 缺失时返回 `undefined`。

- [ ] **Step 6：运行仓储测试**

运行：`cd frontend && npm run test -- libraryRepository.test.ts`

预期：PASS。

- [ ] **Step 7：提交**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/storage
git commit -m "feat: persist local reader library"
```

---

### Task 4: SpoilerGuard 防剧透上下文

**文件：**

- 新建：`frontend/src/spoiler/spoilerGuard.ts`
- 新建：`frontend/src/spoiler/spoilerGuard.test.ts`
- 修改：`frontend/src/domain/models.ts`

**接口：**

- 消费：`Segment`, `ReadingProgress`.
- 产出类型：`SpoilerRisk = "low" | "high"`.
- 产出函数：`buildAllowedContext(input: BuildAllowedContextInput): AllowedContext`.

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

- [ ] **Step 1：编写 SpoilerGuard 测试**

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

- [ ] **Step 2：运行 SpoilerGuard 测试并确认失败**

运行：`cd frontend && npm run test -- spoilerGuard.test.ts`

预期：FAIL，因为 `buildAllowedContext` 尚未实现。

- [ ] **Step 3：实现 `buildAllowedContext`**

实现要求：

- 按 `startChar` 排序片段。
- 将每个片段截断到 `progress.absoluteCharOffset`。
- 从已读上下文末尾最多保留 `maxChars ?? 6000` 个字符。
- Detect high-risk questions with keywords: `后来`, `结局`, `真相`, `凶手`, `最终`, `boss`, `背叛`, `死了吗`, `是不是反派`.
- 仅在存在时包含选中文本和批注笔记。
- Return instruction: `只能基于已读内容回答；不要暗示、确认或引用未读剧情。`

- [ ] **Step 4：运行 SpoilerGuard 测试**

运行：`cd frontend && npm run test -- spoilerGuard.test.ts`

预期：PASS。

- [ ] **Step 5：提交**

```bash
git add frontend/src/domain/models.ts frontend/src/spoiler
git commit -m "feat: enforce spoiler-safe context"
```

---

### Task 5: BGM 类型、内置曲目和推荐算法

**文件：**

- 新建：`frontend/src/bgm/bgmTypes.ts`
- 新建：`frontend/src/bgm/builtInTracks.ts`
- 新建：`frontend/src/bgm/bgmMatcher.ts`
- 新建：`frontend/src/bgm/bgmMatcher.test.ts`

**接口：**

- 产出类型：`BgmTrack`.
- 产出类型：`AtmosphereProfile`.
- 产出函数：`recommendBgm(profile: AtmosphereProfile, tracks: BgmTrack[], options?: RecommendOptions): BgmRecommendation[]`.

- [ ] **Step 1：编写匹配器测试**

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

- [ ] **Step 2：运行匹配器测试并确认失败**

运行：`cd frontend && npm run test -- bgmMatcher.test.ts`

预期：FAIL，因为 BGM 模块尚未实现。

- [ ] **Step 3：实现 BGM 类型与内置元数据**

至少创建以下内置曲目元数据记录：

- `night-suspense`: 悬疑、夜晚、紧张。
- `battle-rise`: 战斗、燃、快节奏。
- `daily-warm`: 日常、轻松、温暖。
- `sad-memory`: 回忆、伤感、慢节奏。

- [ ] **Step 4：实现 `recommendBgm`**

评分规则：

- 每个情绪重叠项 `+3`。
- 每个场景重叠项 `+2`。
- tempo 匹配 profile pace 时 `+1`。
- 扣除数值距离：`abs(energy diff) + abs(darkness diff) + abs(warmth diff)`。
- 返回分数为正的前 3 个推荐。
- 如果存在 `lockedTrackId`，返回空列表，因为用户选择不被打扰。

- [ ] **Step 5：运行匹配器测试**

运行：`cd frontend && npm run test -- bgmMatcher.test.ts`

预期：PASS。

- [ ] **Step 6：提交**

```bash
git add frontend/src/bgm
git commit -m "feat: recommend bgm from atmosphere tags"
```

---

### Task 6: Spring Boot 凭据管理与 LLM 代理

**文件：**

- 替换：将 `backend/src/main/java/cn/immerseread/config/LlmPropertirs.java` 替换为 `backend/src/main/java/cn/immerseread/config/LlmProperties.java`
- 新建：`backend/src/main/java/cn/immerseread/config/CredentialStore.java`
- 新建：`backend/src/main/java/cn/immerseread/config/EnvironmentCredentialStore.java`
- 新建：`backend/src/main/java/cn/immerseread/config/SystemCredentialStore.java`
- 新建：`backend/src/main/java/cn/immerseread/credentials/CredentialsCommand.java`
- 修改：`backend/src/main/java/cn/immerseread/llm/LlmController.java`
- 修改：`backend/src/main/java/cn/immerseread/llm/LlmService.java`
- 替换：将 `backend/src/main/java/cn/immerseread/llm/ChatClient.java` 替换为 `backend/src/main/java/cn/immerseread/llm/OpenAiChatClient.java`，需要时增加接口
- 新建：`backend/src/main/java/cn/immerseread/llm/dto/AtmosphereRequest.java`
- 新建：`backend/src/main/java/cn/immerseread/llm/dto/AtmosphereResponse.java`
- 新建：`backend/src/main/java/cn/immerseread/llm/dto/ChatRequest.java`
- 新建：`backend/src/main/java/cn/immerseread/llm/dto/ChatResponse.java`
- 新建：`backend/src/main/java/cn/immerseread/llm/dto/ErrorResponse.java`
- 新建：`backend/src/test/java/cn/immerseread/llm/LlmControllerTest.java`
- 新建：`backend/src/test/java/cn/immerseread/llm/LlmServiceTest.java`
- 新建：`backend/src/test/java/cn/immerseread/config/CredentialStoreTest.java`
- 若仍存在则删除：`backend/src/main/java/cn/immerseread/llm/LlmControllerTest.java`
- 若仍存在则删除：`backend/src/main/java/cn/immerseread/llm/LlmServiceTest.java`
- 修改：`backend/src/main/java/cn/immerseread/health/HealthController.java`

**接口：**

- 产出接口：`POST /api/llm/chat`.
- 产出接口：`POST /api/llm/atmosphere`.
- 产出 Java 服务：`LlmService.chat(ChatRequest request): ChatResponse`.
- 产出 Java 服务：`LlmService.analyzeAtmosphere(AtmosphereRequest request): AtmosphereResponse`.
- 产出凭据命令：`credentials set`, `credentials status`, `credentials clear`.

- [ ] **Step 1：编写 controller 测试**

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

- [ ] **Step 2：编写 service 测试**

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

- [ ] **Step 3：编写 credential store 测试**

```java
class CredentialStoreTest {
    @Test
    void environmentStoreReportsConfiguredWithoutExposingValue() {
        CredentialStore store = new EnvironmentCredentialStore("sk-test", "", "gpt-test");
        assertThat(store.status().configured()).isTrue();
        assertThat(store.status().displayValue()).isEqualTo("configured");
        assertThat(store.resolveApiKey()).contains("sk-test");
    }

    @Test
    void blankEnvironmentStoreReportsUnconfigured() {
        CredentialStore store = new EnvironmentCredentialStore("", "", "gpt-test");
        assertThat(store.status().configured()).isFalse();
        assertThat(store.status().displayValue()).isEqualTo("unconfigured");
    }
}
```

- [ ] **Step 4：运行后端测试并确认失败**

运行：`cd backend && mvn test`

预期：FAIL，因为 LLM 类尚未实现。

- [ ] **Step 5：实现 DTO**

使用 Java record 或普通不可变类。除非 Spring Boot `4.1.0` 项目设置或序列化测试显示兼容性问题，否则优先使用 record：

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

创建类似的氛围 record，字段来自 `AtmosphereProfile`。

- [ ] **Step 6：实现请求校验**

规则：

- `question` 不得为空。
- `allowedContext.length() <= 12000`。
- `contextStartChar >= 0`。
- `contextEndChar >= contextStartChar`。
- 上下文超长时返回 HTTP `413`。
- 字段非法时返回 HTTP `400`。

- [ ] **Step 7：实现 credential stores、`LlmService` 和 `OpenAiChatClient`**

实现要求：

- `LlmProperties` 读取 `LLM_PROVIDER`、`LLM_API_KEY`、`LLM_BASE_URL` 和 `LLM_MODEL`，并兼容 `OPENAI_*`。
- `CredentialStore` 暴露 `resolveApiKey()`、`status()`、`set(char[] key)` 和 `clear()`。
- `SystemCredentialStore` 是本地运行的优先实现。Windows 上应将 `immerseread.openai.api-key` 存入 Windows Credential Manager 或文档化的 Java keyring bridge；如果不可用，返回清晰的未支持信息，而不是静默写入明文。
- `EnvironmentCredentialStore` 是 Docker/CI 兜底方案，读取环境变量或 `.env` 提供的值。
- `CredentialsCommand` 支持 `credentials set`、`credentials status` 和 `credentials clear`；status 绝不打印 key。
- `LlmProperties` 到位后删除拼写错误的 `LlmPropertirs` 类。
- 如果 key 为空，返回功能不可用响应，不调用供应商。
- Task 8 收尾增加 DeepSeek Chat Completions 支持，使老师可配置自己的供应商 key，而不需要获取作者凭据。
- Chat prompt 包含：短回答、轻松网文同好语气和防剧透指令。
- Atmosphere prompt 只要求结构化 JSON。
- 日志只记录请求元数据，不记录小说原文。

- [ ] **Step 8：运行后端测试**

运行：`cd backend && mvn test`

预期：PASS。

- [ ] **Step 9：提交**

```bash
git add backend
git commit -m "feat: secure llm credentials and proxy requests"
```

---

### Task 7: 阅读器主流程 UI

**文件：**

- 修改：`frontend/src/app/App.test.tsx`
- 修改：`frontend/src/app/App.tsx`
- 修改：`frontend/src/styles/global.css`
- 修改：`frontend/src/test/setup.ts`

**接口：**

- 消费：`parseTxtBook`.
- 消费：`saveParsedBook`, `getBookWithSegments`, `saveReadingProgress`.
- 产出 UI 状态：空书库、导入成功、阅读器打开。

- [x] **Step 1：编写 UI 测试**

实现说明：Task 7 继续保留在 `App.tsx` 中，因为当前前端仍是较紧凑的外壳。组件拆分推迟到 Task 8/9 增加真实批注、书搭子和 BGM 行为之后。

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

- [x] **Step 2：运行 UI 测试并确认失败**

运行：`cd frontend && npm run test -- App.test.tsx`

预期：FAIL，因为阅读工作台和 TXT 导入控件尚未实现。

- [x] **Step 3：实现导入流程**

实现要求：

- 文件输入接受 `.txt`。
- Use `FileReader` or `file.text()` for UTF-8.
- 为 GBK 编码 fallback 保留可见的未来选项标签；第一版可以先展示清晰的不支持编码提示。
- 使用 `parseTxtBook` 解析文件。
- 使用 repository 保存解析后的书籍。
- 打开第一个片段。

- [x] **Step 4：实现阅读控制**

控件：

- 字号减小/增大按钮。
- 行距减小/增大按钮。
- 提供 `paper`、`night`、`sepia` 主题按钮。
- 阅读宽度控制推迟到 ReaderView 拆分之后；当前文本列已使用响应式 `max-width`。

CSS 要求：

- 不使用随视口缩放的字号。
- 阅读内容周围不使用嵌套卡片。
- 文本列使用 `max-width` 和响应式 padding。
- 按钮使用可访问名称。

- [x] **Step 5：运行 UI 测试**

验证：

- `cd frontend && npm run test -- App.test.tsx` 通过 2 个测试。
- `cd frontend && npm run test` 通过 20 个测试。
- `cd frontend && npm run build` 通过。

运行：`cd frontend && npm run test -- App.test.tsx`

预期：PASS。

- [ ] **Step 6：提交**

```bash
git add PLAN.md AGENT_LOG.md frontend/src/app frontend/src/styles frontend/src/test/setup.ts
git commit -m "feat: build local txt reader flow"
```

---

### Task 8: 批注与书搭子面板集成

**文件：**

- 新建：`frontend/src/annotations/annotationRanges.ts`
- 新建：`frontend/src/annotations/annotationRanges.test.ts`
- 新建：`frontend/src/components/AnnotationToolbar.tsx`
- 新建：`frontend/src/components/AnnotationToolbar.test.tsx`
- 新建：`frontend/src/components/CompanionPanel.tsx`
- 新建：`frontend/src/components/CompanionPanel.test.tsx`
- 新建：`frontend/src/llm/client.ts`
- 新建：`frontend/src/llm/client.test.ts`
- 修改：`frontend/src/storage/libraryRepository.ts`
- 修改：`frontend/src/storage/libraryRepository.test.ts`
- 修改：`frontend/src/app/App.tsx`
- 修改：`frontend/src/app/App.test.tsx`
- 修改：`frontend/src/styles/global.css`

**接口：**

- 消费：`buildAllowedContext`.
- 产出函数：`createAnnotationFromSelection(input: SelectionInput): AnnotationDraft`.
- 产出函数：`sendCompanionChat(request: CompanionChatRequest): Promise<CompanionChatResponse>`.

- [x] **Step 1：编写批注范围测试**

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

- [x] **Step 2：运行批注测试并确认失败**

运行：`cd frontend && npm run test -- annotationRanges.test.ts`

预期：FAIL，因为批注工具尚未实现。

- [x] **Step 3：实现批注工具与仓储方法**

新增仓储函数：

```ts
export async function saveAnnotation(annotation: Annotation): Promise<void>;
export async function listAnnotations(bookId: string, segmentId: string): Promise<Annotation[]>;
export async function deleteAnnotation(annotationId: string): Promise<void>;
export async function saveChatMessage(message: ChatMessage): Promise<void>;
export async function listChatMessages(bookId: string): Promise<ChatMessage[]>;
```

- [x] **Step 4：实现 CompanionPanel**

UI 行为：

- 展示本地聊天消息。
- 输入框占位文案：`和书搭子聊聊当前剧情`.
- 提交时使用 `buildAllowedContext` 构建防剧透上下文。
- 通过 `sendCompanionChat` 调用 `/api/llm/chat`。
- 当后端报告缺少 key 时，展示不可用提示。

- [x] **Step 5：接入批注转聊天动作**

行为：

- 选中文本可以创建高亮和笔记。
- 批注工具栏包含 `问书搭子` 按钮。
- 按钮打开 CompanionPanel，并将选中文本和笔记预填为上下文。
- LLM payload 包含 `contextStartChar` 和 `contextEndChar`。

- [x] **Step 6：运行测试**

验证：

- `cd frontend && npm run test -- annotationRanges.test.ts client.test.ts CompanionPanel.test.tsx AnnotationToolbar.test.tsx libraryRepository.test.ts App.test.tsx spoilerGuard.test.ts` 通过 21 个测试。
- `cd frontend && npm run test` 通过 30 个测试。
- `cd frontend && npm run build` 通过。

运行：`cd frontend && npm run test -- annotationRanges.test.ts spoilerGuard.test.ts`

预期：PASS。

- [ ] **Step 7：提交**

```bash
git add frontend/src/annotations frontend/src/components frontend/src/llm frontend/src/storage
git commit -m "feat: add annotations and companion chat"
```

---

### Task 9: 氛围分析与 BGM 播放体验

**文件：**

- 新建：`frontend/src/components/BgmDock.tsx`
- 新建：`frontend/src/components/BgmDock.test.tsx`
- 修改：`frontend/src/bgm/builtInTracks.ts`
- 修改：`frontend/src/llm/client.ts`
- 修改：`frontend/src/storage/libraryRepository.ts`
- 修改：`frontend/src/components/ReaderView.tsx`

**接口：**

- 消费：`recommendBgm`.
- 消费后端接口：`POST /api/llm/atmosphere`.
- 产出 UI：当前曲目、推荐提示、本地音频上传、元数据编辑。

- [x] **Step 1：编写 BgmDock 组件测试**

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

- [x] **Step 2：运行 BgmDock 测试并确认失败**

运行：`cd frontend && npm run test -- BgmDock.test.tsx`

预期：FAIL，因为 `BgmDock` 尚未实现。

- [x] **Step 3：实现氛围客户端**

新增函数：

```ts
export async function analyzeAtmosphere(segmentId: string, text: string): Promise<AtmosphereProfile>;
```

行为：

- POST to `/api/llm/atmosphere`.
- key 缺失或供应商失败时，返回 `moods: ["平静"]` 的中性兜底 profile。

- [x] **Step 4：实现 BgmDock**

UI 行为：

- 展示播放/暂停。
- 展示当前曲名。
- 展示最高推荐理由。
- 切换前要求确认。
- 提供锁定当前曲目的开关。
- 允许通过表单上传本地音频元数据，包括标题、情绪、场景、能量、黑暗度、温暖度和节奏。

- [x] **Step 5：将 BGM 接入 ReaderView**

行为：

- 打开片段时展示已有 profile，或由用户动作触发氛围分析。
- 对内置曲目和上传曲目使用 `recommendBgm`。
- 在本地保存 profile 和上传的 BGM 元数据。
- 不向后端上传音频 Blob。

- [x] **Step 6：运行 BGM 测试**

验证：

- 在本地 BGM 曲库后续补充前，`cd frontend && npm run test -- BgmDock.test.tsx client.test.ts libraryRepository.test.ts bgmMatcher.test.ts App.test.tsx AnnotationToolbar.test.tsx CompanionPanel.test.tsx` 通过 25 个测试。
- 增加本地 BGM 曲库和音频 Blob 持久化后，`cd frontend && npm run test -- BgmDock.test.tsx libraryRepository.test.ts App.test.tsx` 通过 17 个测试。
- `cd frontend && npm run test` 通过 42 个测试。
- `cd frontend && npm run build` 通过。

运行：`cd frontend && npm run test -- bgmMatcher.test.ts BgmDock.test.tsx`

预期：PASS。

- [ ] **Step 7：提交**

```bash
git add frontend/src/bgm frontend/src/components/BgmDock.tsx frontend/src/components/BgmDock.test.tsx frontend/src/llm frontend/src/storage
git commit -m "feat: add atmosphere-based bgm experience"
```

---

### Task 10: Docker、GitLab CI、冷启动记录和文档

**文件：**

- 新建：`docker-compose.yml`
- 新建：`frontend/Dockerfile`
- 新建：`backend/Dockerfile`
- 新建：`frontend/e2e/reader-flow.spec.ts`
- 新建：`.gitlab-ci.yml`
- 新建：`SPEC.md`
- 新建：`PLAN.md`
- 新建：`SPEC_PROCESS.md`
- 新建：`AGENT_LOG.md`
- 新建：`docs/COLD_START_PROMPT.md`
- 修改：`README.md`

**接口：**

- 消费此前所有模块。
- 产出命令：`docker compose up --build`.
- 产出命令：`npm run test`, `mvn test`, `npm run e2e`.
- 产出 GitLab CI 作业：`unit-test`.

- [ ] **Step 1：编写 E2E 测试**

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

- [ ] **Step 2：运行 E2E，并确认在 Docker 接线完成前失败**

运行：`cd frontend && npm run e2e`

预期：FAIL，因为完整应用流程尚未接入 Playwright。

- [ ] **Step 3：添加 Docker Compose**

要求：

- 前端服务暴露 `5173`。
- 后端服务暴露 `8080`。
- 后端读取 `.env`。
- 前端使用 `VITE_API_BASE_URL=http://localhost:8080`。

Compose 形态：

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

- [ ] **Step 4：添加 GitLab CI 工作流**

`.gitlab-ci.yml` 要求：

- 必须包含名为 `unit-test` 的 job。
- `unit-test` 运行后端测试和前端测试。
- 如果 CI 环境可用 Docker，增加单独的 `docker-build` job 构建分发镜像。

最小形态：

```yaml
stages:
  - test
  - build

unit-test:
  stage: test
  image: node:22
  script:
    - cd frontend
    - npm ci
    - npm run test
    - npm run build
    - cd ../backend
    - ./mvnw test
```

- [ ] **Step 5：更新 README**

README 必须包含：

- 30 秒产品说明。
- 本地优先的版权/隐私边界。
- 凭据优先通过系统凭据管理器配置，`.env` 作为 Docker/开发 fallback，并明确提示明文风险。
- `docker compose up --build`.
- `docker build` 和 `docker run --env-file .env` 示例。
- 公共镜像仓库发布步骤，或说明为何推迟到最终提交。
- 最终提交前待填写的 WebUI 部署 URL 占位。
- 测试命令。
- 说明缺少 API key 时 LLM 功能不可用，但本地阅读仍可运行。

- [ ] **Step 6：添加根目录过程文档**

创建 `SPEC_PROCESS.md`，总结：

- 头脑风暴决策。
- 为什么选择 Spring Boot。
- 为什么第一版不使用 MySQL。
- 为什么防剧透由工程控制，而不是只依赖提示词。
- 冷启动验证流程与结果。冷启动尚未执行时，加入清晰标记的 `待冷启动验证后补充` 小节。

创建 `AGENT_LOG.md`，总结：

- 设计规格创建记录。
- 实现计划创建记录。
- 后端骨架基线记录。
- 后续每个实现任务及验证结果。

创建 `docs/COLD_START_PROMPT.md`，写入可粘贴到另一个全新 agent 对话中的完整提示词。

- [ ] **Step 7：运行完整验证**

运行：`cd frontend && npm run test`

预期：PASS。

运行：`cd frontend && npm run build`

预期：PASS。

运行：`cd backend && mvn test`

预期：PASS。

运行：`docker compose config`

预期：PASS。

运行：如果可用，执行 `gitlab-ci-local unit-test`；否则手动验证 `.gitlab-ci.yml` 语法，并记录 CI 通过证据将来自 NJU GitLab。

- [ ] **Step 8：提交**

```bash
git add docker-compose.yml frontend/Dockerfile backend/Dockerfile frontend/e2e .gitlab-ci.yml SPEC.md PLAN.md SPEC_PROCESS.md AGENT_LOG.md docs/COLD_START_PROMPT.md README.md
git commit -m "chore: add distribution ci and process docs"
```

---

### Task 11：提交准备文档与 GitLab CI 基线

**文件：**

- 新建：`.gitlab-ci.yml`
- 修改：`README.md`
- 修改：`SPEC.md`
- 修改：`PLAN.md`
- 修改：`AGENT_LOG.md`

**接口：**

- 产出 GitLab CI 作业：`unit-test`.
- 记录 `frontend` 与 `backend` 的本地启动命令。
- 记录 `LLM_*` key 配置方式和明文 `.env` 风险。

- [x] **Step 1：添加 GitLab CI 基线**

添加根目录 `.gitlab-ci.yml`，包含必需的 `unit-test` job；该 job 安装前端依赖、运行前端测试、构建前端并运行后端测试。

- [x] **Step 2：更新 README**

记录产品范围、本地启动、LLM key 配置、验证命令、BGM demo 音频放置方式、CI 状态、Docker 延后验证、线上部署延后说明和已知 MVP 限制。

- [x] **Step 3：将 SPEC 与当前实现对齐**

将尚未实现的操作系统凭据管理器和 Docker Compose 声明，从“第一版行为”降级为“未来工作 / 虚拟机验证”，使提交文档反映真实 MVP。

- [x] **Step 4：运行验证**

运行：

```powershell
cd frontend
npm run test
npm run build
cd ../backend
.\mvnw.cmd test
```

Docker 验证仍延后到作者的 Ubuntu 虚拟机中执行。

- [ ] **Step 5：提交**

```bash
git add .gitlab-ci.yml README.md SPEC.md PLAN.md AGENT_LOG.md
git commit -m "chore: add ci and submission docs"
```

---

## 自检

### SPEC 覆盖

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

### 红旗扫描

本计划不包含未完成标记、延期实现说明、笼统错误处理要求或未定义接口。每个任务都有明确文件、接口、测试、实现要求和提交点。

### 类型一致性

- `Book`、`Segment`、`ReadingProgress`、`Annotation`、`ChatMessage`、`AtmosphereProfile`、`BgmTrack` 在前端模型中统一定义或从 BGM 类型模块导出。
- `buildAllowedContext` 输出的 `contextStartChar`、`contextEndChar` 和 `spoilerRisk` 与后端 `ChatRequest` 字段一致。
- BGM 推荐中的 `trackId` 与 `BgmTrack.id` 一致。
- 后端 DTO 字段与前端 `sendCompanionChat` 和 `analyzeAtmosphere` 请求字段一致。
