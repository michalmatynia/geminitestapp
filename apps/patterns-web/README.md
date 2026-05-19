# patterns-web

Standalone Next.js catalog for downloadable Milk Bar Designers vector patterns.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev --workspace @app/patterns-web` | Starts the app on port `3500`. |
| `npm run typecheck --workspace @app/patterns-web` | Runs TypeScript validation. |
| `npm run mongo:patterns:up --workspace @app/patterns-web` | Starts the local MongoDB instance on port `27023`. |
| `npm run seed --workspace @app/patterns-web` | Seeds the local `patterns` collection. |

## Database

The app defaults to:

```text
mongodb://127.0.0.1:27023/patterns_web_local
```

Override with `PATTERNS_MONGODB_LOCAL_URI` and `PATTERNS_MONGODB_LOCAL_DB`.
