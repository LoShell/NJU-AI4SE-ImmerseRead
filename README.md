# NJU-AI4SE-ImmerseRead

ImmerseRead 是南京大学《智能化软件工程师训练营》期末 B 类应用项目：一个面向小说和网文读者的本地优先沉浸式 TXT 阅读器。

30 秒介绍：

> 用户上传自己的 TXT 小说，在本地阅读；系统根据当前剧情推荐氛围 BGM，并提供一个只知道已读内容的 AI 书搭子，陪用户吐槽、回忆和一起猜剧情，避免被未读内容剧透。

## 当前状态

- 已完成 `SPEC.md`。
- 已完成 `PLAN.md`。
- 已完成 `SPEC_PROCESS.md` 初稿。
- 已完成 `AGENT_LOG.md` 初稿。
- 已创建 Spring Boot 4.1.0 后端骨架，当前 `mvn test` 可通过。
- 正式实现前还需要完成冷启动验证，并根据反馈修订 SPEC / PLAN。

## 目录结构

```text
.
├── SPEC.md
├── PLAN.md
├── SPEC_PROCESS.md
├── AGENT_LOG.md
├── README.md
├── backend/
├── docs/
│   ├── COLD_START_PROMPT.md
│   └── superpowers/
└── 作业要求/
```

## 安全边界

- 小说 TXT、批注、阅读进度、聊天记录和用户上传 BGM 默认保存在浏览器本地。
- 后端不持久化小说正文。
- LLM API key 不进入前端。
- 凭据方案优先使用系统凭据管理器；`.env` 仅作为开发、Docker Compose 和课程冷启动验证 fallback。
- `.env` 是明文文件，必须加入 `.gitignore`，不得提交真实 key。

## 后端验证

```bash
cd backend
mvn test
```

当前后端骨架预期结果：

```text
Tests run: 1, Failures: 0, Errors: 0
```

## 冷启动验证

正式实现前，请新开一个不同类型或不同入口的 agent 对话，不导入本对话历史，只提供根目录 `SPEC.md`、`PLAN.md` 和 `docs/COLD_START_PROMPT.md`。

冷启动完成后，需要把第二个 agent 的暂停点、误解、问题和建议补充到 `SPEC_PROCESS.md`。

## 后续分发目标

实现完成后，项目需要提供：

- `docker compose up --build` 本地启动。
- `docker build` / `docker run --env-file .env` 容器分发说明。
- `.gitlab-ci.yml`，包含名为 `unit-test` 的 job。
- 最终可访问的 WebUI URL。

