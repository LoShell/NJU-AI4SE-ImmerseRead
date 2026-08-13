# ImmerseRead 后端

ImmerseRead 的 Spring Boot LLM 代理。后端负责隔离供应商凭据，避免前端接触 key，并暴露 `/api/health`、`/api/llm/chat` 和 `/api/llm/atmosphere`。

## 本地运行

```bash
./mvnw spring-boot:run
```

Windows PowerShell：

```powershell
.\mvnw.cmd spring-boot:run
```

## 环境变量

后端从进程环境变量读取以下配置：

```text
LLM_PROVIDER=deepseek
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash
```

不要提交真实 `.env` 文件。`backend/.env.example` 或根目录 `.env.example` 只能作为模板使用。

## Docker

在仓库根目录构建并运行完整应用：

```bash
docker compose up --build
```

根目录 compose 文件会构建该后端镜像，并从根目录 `.env` 文件或 shell 环境变量传入 `LLM_*`。
