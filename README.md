# NJU-AI4SE-ImmerseRead

ImmerseRead 是一个本地优先的沉浸式 TXT 小说阅读器，面向小说和网文读者。它把 TXT 解析、三栏阅读 UI、本地批注、BGM 曲库和不剧透的 LLM 书搭子整合到同一个阅读流程里。

小说正文、阅读进度、批注、聊天记录和用户上传的 BGM 默认保存在浏览器本地。LLM 调用只通过 Spring Boot 后端代理完成，前端不保存、接收或展示供应商 API key。

## 当前功能

- 上传本地 `.txt` 小说，自动解析常见章节标题；支持 UTF-8 与 GB18030/GBK 常见网文编码兜底，章节识别不可靠时回退为固定长度阅读片段。
- 三栏沉浸阅读界面：左侧本地书籍/章节，中间正文独立滚动，右侧书搭子、批注和 BGM。
- 真实阅读进度：本章进度来自正文滚动位置，全文进度结合当前章节位置计算。
- 阅读设置：字号、行距、纸页/暖棕主题切换，以及独立夜视模式。
- 批注：选中正文后在右侧批注区保存批注，也可以带着选中文本询问书搭子。
- 防剧透书搭子：前端构造只包含已读范围的上下文，后端负责 LLM 代理和响应规范化。
- BGM：支持系统 demo 音频、本地音频上传、元数据标签、题材辅助氛围推荐、播放/暂停、上一首/下一首、列表循环和单曲循环。
- 无 LLM key 时，本地阅读、批注和 BGM 功能仍可使用。

## 目录结构

```text
NJU-AI4SE-ImmerseRead/
  frontend/        React + TypeScript + Vite 前端
  backend/         Spring Boot LLM 代理后端
  SPEC.md          产品与系统规格
  PLAN.md          实现计划与任务记录
  SPEC_PROCESS.md  Spec/Plan 生成与冷启动验证过程
  AGENT_LOG.md     AI 协作与人工干预日志
  .gitlab-ci.yml   CI 配置，包含 unit-test job
  docker-compose.yml Docker Compose 分发配置
  .env.example     Docker/后端环境变量示例，不包含真实 key
```

## Demo 文件

仓库提供一个自写 TXT demo，便于老师或测试者不准备额外小说文件也能快速体验导入、章节解析、阅读进度、批注和书搭子：

```text
docs/demo-txt/故梦.txt
```

该文件仅用于课程演示。真实使用时，读者应上传自己本地拥有阅读权限的 TXT 小说；项目不会提供联网小说下载。

## 快速启动

推荐先启动后端，再启动前端。前端开发服务器已经配置 `/api` 代理，因此浏览器只需要访问前端地址即可。

### 1. 安装依赖

```powershell
cd frontend
npm install
cd ../backend
.\mvnw.cmd -v
```

macOS / Linux：

```bash
cd frontend
npm install
cd ../backend
./mvnw -v
```

### 2. 启动后端

Windows PowerShell：

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

macOS / Linux：

```bash
cd backend
./mvnw spring-boot:run
```

后端默认监听 `http://localhost:8080`。可用下面的命令确认健康状态：

```powershell
Invoke-RestMethod http://localhost:8080/api/health
```

macOS / Linux：

```bash
curl http://localhost:8080/api/health
```

### 3. 启动前端

另开一个终端：

```powershell
cd frontend
npm run dev
```

默认 Vite 地址通常是 `http://localhost:5173`。开发代理已配置：前端请求 `/api/**` 会转发到 `http://localhost:8080`。

### 4. 最小冷启动顺序

```powershell
cd backend

# 设置LLM key,以模型deepseek v4 flash为例
$env:LLM_PROVIDER="deepseek"
$env:LLM_API_KEY="你的 DeepSeek key"
$env:LLM_BASE_URL="https://api.deepseek.com"
$env:LLM_MODEL="deepseek-v4-flash"

mvn spring-boot:run

# 另开终端
cd frontend
npm install
npm run dev
```

打开 `http://localhost:5173`，上传本地 `.txt` 文件即可开始阅读。没有 LLM key 时，TXT 阅读、批注和 BGM 仍可使用；书搭子和氛围分析会显示未配置或降级结果。

## LLM Key 配置

测试者使用自己的 key，在目标机器上通过环境变量或 `.env` 注入。**不要把真实 key 写入代码或提交到仓库。**

当前 MVP 使用环境变量 / `.env` 作为凭据来源。`.env` 是明文 fallback，适合本地开发；它不如操作系统凭据管理器安全，且可能被有本机权限的用户读取。

### 方式 A：Windows PowerShell 临时环境变量

只对当前 PowerShell 窗口有效，关掉窗口后失效。

DeepSeek：

```powershell
$env:LLM_PROVIDER="deepseek"
$env:LLM_API_KEY="你的 DeepSeek key"
$env:LLM_BASE_URL="https://api.deepseek.com"
$env:LLM_MODEL="deepseek-chat"

cd backend
.\mvnw.cmd spring-boot:run
```

OpenAI：

```powershell
$env:LLM_PROVIDER="openai"
$env:LLM_API_KEY="你的 OpenAI key"
$env:LLM_BASE_URL="https://api.openai.com/v1/responses"
$env:LLM_MODEL="gpt-4.1-mini"

cd backend
.\mvnw.cmd spring-boot:run
```

### 方式 B：macOS / Linux 临时环境变量

DeepSeek：

```bash
export LLM_PROVIDER=deepseek
export LLM_API_KEY="你的 DeepSeek key"
export LLM_BASE_URL=https://api.deepseek.com
export LLM_MODEL=deepseek-chat

cd backend
./mvnw spring-boot:run
```

OpenAI：

```bash
export LLM_PROVIDER=openai
export LLM_API_KEY="你的 OpenAI key"
export LLM_BASE_URL=https://api.openai.com/v1/responses
export LLM_MODEL=gpt-4.1-mini

cd backend
./mvnw spring-boot:run
```

### 方式 C：根目录 `.env`

适合 Docker Compose 或本地开发复用配置。注意 `.env` 是明文文件，只能放自己的测试 key，不能提交。

```powershell
Copy-Item .env.example .env
notepad .env
```

macOS / Linux：

```bash
cp .env.example .env
nano .env
```

示例内容：

```text
LLM_PROVIDER=deepseek
LLM_API_KEY=你的 DeepSeek key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

### 兼容变量

后端优先读取：

- `LLM_PROVIDER`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

也保留兼容：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `DEEPSEEK_API_KEY`

## 验证

本地验证建议按下面顺序执行。前端和后端测试互不依赖真实 LLM key。

前端：

```powershell
cd frontend
npm run test
npm run build
```

后端：

```powershell
cd backend
mvn test
```

CI 会在 `unit-test` job 中执行前端测试、前端构建和后端测试。

## Docker 启动

Docker 配置位于项目根目录，包含前端 Nginx 静态服务和后端 Spring Boot 服务。

首次运行可以复制示例环境文件：

```bash
cp .env.example .env
```

然后按需编辑 `.env`，填入自己的 LLM key。没有 key 时，本地 TXT 阅读、批注和 BGM 仍可使用，但书搭子和氛围分析会走未配置/降级路径。

在项目根目录执行：

```bash
docker compose up --build
```

启动后访问：

- 前端：`http://localhost:5173`
- 后端健康检查：`http://localhost:8080/api/health`

如果在虚拟机内运行 Docker，需要确认宿主机到虚拟机的端口转发或网络访问方式。

## BGM 曲库

系统曲库元数据位于：

```text
frontend/src/bgm/builtInTracks.ts
```

如果要加入可播放的系统 demo 音频，可以把音频文件放到：

```text
frontend/public/bgm/
```

然后在对应曲目上设置：

```ts
fileRef: "/bgm/example.mp3"
```

不要提交没有授权的大体积版权音乐；GitHub 普通仓库单文件超过 100 MB 会被拒绝推送。用户上传的 BGM 音频只保存在浏览器本地 IndexedDB，不会上传到后端。

## CI/CD 与分发状态

当前仓库提供 `.gitlab-ci.yml`，其中包含作业要求的 `unit-test` job。

仓库提供 Docker Compose 分发配置，并已在作者的 Ubuntu 虚拟机中通过 `docker compose up --build` 验证。验证结果记录在 `AGENT_LOG.md`：前端 `http://localhost:5173`、后端 `http://localhost:8080/api/health`、以及前端 Nginx 反代 `http://localhost:5173/api/health` 均返回成功响应。

线上部署暂未启用。若后续提供公网 WebUI，建议将前端部署为静态站，将 Spring Boot 后端部署到支持环境变量密钥配置的平台，并由部署环境注入 `LLM_*`，不要把 key 打包进前端或镜像。

## 安全边界

- 仓库不得提交真实 `.env` 或真实 API key。
- `.gitignore` 已覆盖根目录和后端 `.env` / `.env.*`，但提交前仍需要用 `git status` 自查未跟踪文件。
- 前端不接触 LLM 供应商凭据。
- 后端不持久化小说正文、用户上传音频或真实 key。
- 日志不得输出 API key 或小说正文。
- 小说正文、批注、阅读进度、聊天记录和用户上传音频默认只保存在当前浏览器本地。
- 清除浏览器站点数据、换浏览器、换设备或换部署域名，可能导致本地书库和批注不可恢复。

## 已知限制

- 第一版只支持 TXT，不支持 EPUB/PDF。
- 本地书库目前偏 MVP：数据依赖浏览器 IndexedDB，不提供账号同步。
- BGM 推荐依赖用户上传或系统 demo 音频；系统曲目的标签质量会直接影响推荐质量。
- 书搭子不是 agent，不进行自主多轮规划或工具调用。
- 公网部署、账号登录、多设备书籍管理和云端同步属于后续扩展方向。
