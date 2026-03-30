# Kangur Observability

This folder owns Kangur-specific client and server observability helpers,
knowledge-graph status hooks, and operational summaries.

## Layout

- `client.ts`: client-side error reporting and event helpers
- `hooks.ts`: observability and knowledge-graph status hooks
- `server.ts`: server-owned observability entrypoint
- `server-error-reporting.ts`: server error wrapper/reporting helpers
- `summary.ts`: operational summary builders
- `summary/`: summary support modules
- `__tests__/`: observability tests that are not owned by a narrower nested folder
