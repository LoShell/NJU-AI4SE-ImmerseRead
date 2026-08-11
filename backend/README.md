# ImmerseRead Backend

Spring Boot LLM proxy for ImmerseRead. The backend keeps provider credentials out of the frontend and exposes `/api/health`, `/api/llm/chat`, and `/api/llm/atmosphere`.

## Local Run

```bash
./mvnw spring-boot:run
```

On Windows PowerShell:

```powershell
.\mvnw.cmd spring-boot:run
```

## Environment

The backend reads these variables from the process environment:

```text
LLM_PROVIDER=deepseek
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash
```

Do not commit real `.env` files. Use `backend/.env.example` or root `.env.example` as templates only.

## Docker

Build and run the whole application from the repository root:

```bash
docker compose up --build
```

The root compose file builds this backend image and passes `LLM_*` variables from the root `.env` file or shell environment.
