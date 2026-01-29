Create a Centralized Error Logging System - Done

Logging
5. Logging + Observability: debugging becomes straightforward


Add structured logging lib/log.ts (JSON logs)


Add requestId to every log line inside a request


Log once per request in the wrapper (route handlers stay clean)


Add Sentry (or similar) for stack traces + breadcrumbs


Track:


request duration per endpoint


slow DB queries (where possible)


error counts by code

Central Error Logging system

3. Error handling: move from “try/catch everywhere” to a system


Central error model - V


Create AppError with fields like code, httpStatus, cause, meta.


Distinguish expected errors (validation, auth, not found) vs unexpected (bugs).


One place to map errors → HTTP/UI


Route handlers and server actions should convert errors consistently.


Next.js error boundaries


Use error.tsx per route segment for graceful failures.


Use not-found.tsx + notFound() for missing resources.


Idempotent operations


For actions like “create Product” / “Export Product”: make retries safe (avoid double writes).