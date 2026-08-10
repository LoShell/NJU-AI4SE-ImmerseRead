# NJU-AI4SE-ImmerseRead

ImmerseRead 是一个本地优先的沉浸式 TXT 小说阅读器。小说正文、阅读进度、批注和聊天记录默认保存在浏览器本地；LLM 功能只通过 Spring Boot 后端代理请求，前端不会保存或接触 API key。

## 当前功能

- 上传本地 `.txt` 小说并解析为章节或阅读片段。
- 本地阅读、章节切换、阅读主题、字体大小和行距调整。
- 本地批注与“带着批注问书搭子”。
- 防剧透上下文构造：只把已读范围发送给后端。
- 后端 LLM 代理：支持 OpenAI Responses API 和 DeepSeek Chat Completions。
- 缺少 API key 时，LLM 功能禁用，但本地阅读功能仍可使用。

## 本地启动

### 1. 前端

```powershell
cd frontend
npm install
npm run dev
```

Vite 已配置开发代理：前端请求 `/api/**` 会转发到 `http://localhost:8080`。

### 2. 后端

```powershell
cd backend
mvn spring-boot:run
```

## LLM 配置

不要把真实 key 写进仓库。老师或测试者应使用自己的 key，通过环境变量注入。

### DeepSeek 示例

DeepSeek 使用 OpenAI-compatible Chat Completions 接口。根据 DeepSeek 官方文档，`base_url` 可使用 `https://api.deepseek.com`，当前推荐模型包括 `deepseek-v4-flash` 和 `deepseek-v4-pro`。

```powershell
$env:LLM_PROVIDER="deepseek"
$env:LLM_API_KEY="你的 DeepSeek key"
$env:LLM_BASE_URL="https://api.deepseek.com"
$env:LLM_MODEL="deepseek-v4-flash"

cd backend
mvn spring-boot:run
```

### OpenAI 示例

```powershell
$env:LLM_PROVIDER="openai"
$env:LLM_API_KEY="你的 OpenAI key"
$env:LLM_BASE_URL="https://api.openai.com/v1/responses"
$env:LLM_MODEL="gpt-4.1-mini"

cd backend
mvn spring-boot:run
```

### 兼容变量

后端优先读取通用变量：

- `LLM_PROVIDER`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

也保留旧变量兼容：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `DEEPSEEK_API_KEY`

## 验证

```powershell
cd frontend
npm run test
npm run build

cd ../backend
mvn test
```

## 安全边界

- 仓库不得提交真实 `.env` 或真实 API key。
- 前端不接触供应商凭据。
- 后端不持久化小说正文。
- 日志不得输出 API key 或小说正文。
- 没有 key 时应显示 LLM 未配置状态，而不是影响本地阅读、批注和 BGM 逻辑。
