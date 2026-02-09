CLAUDE INVESTIGATION 

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Real-time Redis Pub/Sub for AI Paths Run Streaming                            
                                                                                
 Context                                                                       

 Server-side AI Paths runs currently use a 500ms polling-based SSE mechanism:
 the SSE route queries the database every 500ms for run/node/event updates,
 diffs against previous state, and sends changes. This adds unnecessary latency
  and database load. Since the executor already writes to the DB on each node
 completion, we can publish notifications instantly via Redis pub/sub.

 Current Architecture

 - SSE route (src/app/api/ai-paths/runs/[runId]/stream/route.ts): Polls DB
 every 500ms, queries pathRun + pathRunNodes + pathRunEvents, diffs, sends SSE
 events (run, nodes, events, done, error).
 - Executor (src/features/ai/ai-paths/services/path-run-executor.ts): Executes
 graph server-side, writes node results/events to DB via callbacks.
 - Client (useAiPathsRuntime.ts): Opens EventSource to SSE route, processes
 messages.
 - Redis (src/shared/lib/redis.ts): Singleton ioredis client via
 getRedisClient(), isRedisEnabled() check.

 Proposed Flow

 Executor (writes DB) → PUBLISH to Redis → SSE Route (subscribed) → instant SSE
  push → Client

 Channel: ai-paths:run:{runId}

 Files to Create

 1. src/shared/lib/redis-pubsub.ts (NEW)

 Dedicated Redis subscriber connection + publish helper.

 - getRedisSubscriber(): Redis — Lazy singleton, separate ioredis instance
 (subscriber mode blocks all other commands). Same connection config as
 getRedisClient().
 - closeSubscriber(): Promise<void> — Graceful shutdown (disconnect + null
 singleton).
 - publishRunEvent(channel, data): void — Fire-and-forget PUBLISH via existing
 getRedisClient() (PUBLISH is non-blocking, doesn't need dedicated connection).

 2. src/features/ai/ai-paths/services/run-stream-publisher.ts (NEW)

 Convenience wrapper:

 export function publishRunUpdate(
   runId: string,
   type: 'run' | 'nodes' | 'events' | 'done' | 'error',
   data: unknown
 ): void

 - Calls publishRunEvent(ai-paths:run:${runId}, { type, data, ts })
 - Fire-and-forget — errors caught and logged, never throws
 - No-op if !isRedisEnabled()

 Files to Modify

 3. src/features/ai/ai-paths/services/path-run-executor.ts

 Add publishRunUpdate calls after each DB write callback:
 Callback: onNodeStart (after upsert)
 Publish: publishRunUpdate(runId, 'nodes', { nodeId, status: 'running' })
 ────────────────────────────────────────
 Callback: onNodeComplete (after update)
 Publish: publishRunUpdate(runId, 'nodes', { nodeId, status, outputs })
 ────────────────────────────────────────
 Callback: onEvent (after create)
 Publish: publishRunUpdate(runId, 'events', { event })
 ────────────────────────────────────────
 Callback: onRunComplete (after update)
 Publish: publishRunUpdate(runId, 'done', { status, summary })
 ────────────────────────────────────────
 Callback: onRunError (after update)
 Publish: publishRunUpdate(runId, 'error', { error })
 All fire-and-forget — executor unchanged if Redis is down.

 4. src/app/api/ai-paths/runs/[runId]/stream/route.ts

 Replace polling with Redis subscription + fallback:

 1. Subscribe to ai-paths:run:{runId}
 2. Catch-up query (fetch current DB state, send initial SSE burst)
 3. On Redis message → parse → send SSE event
 4. On done/error message → unsubscribe → close stream
 5. Fallback: If Redis unavailable → revert to existing 500ms polling
 6. Timeout: No message for 60s → unsubscribe → close

 Subscribe-then-query order prevents race condition (events during catch-up are
  buffered by subscription).

 5. src/features/ai/ai-paths/services/path-run-service.ts

 Publish on cancel/resume/retry:
 - cancelRun → publishRunUpdate(runId, 'done', { status: 'cancelled' })
 - resumeRun → publishRunUpdate(runId, 'run', { status: 'running' })
 - retryRun → publishRunUpdate(runId, 'run', { status: 'running' })

 6. src/features/jobs/processors/ai-path-run-processor.ts

 Publish on failure/dead-letter:
 - Failed job → publishRunUpdate(runId, 'error', { error: failedReason })
 - Dead letter → publishRunUpdate(runId, 'error', { error: 'Max retries
 exceeded' })

 Key Design Decisions

 - Publisher uses existing client: PUBLISH is non-blocking, no dedicated
 connection needed
 - Subscriber needs dedicated connection: SUBSCRIBE puts ioredis in subscriber
 mode
 - Fire-and-forget: Executor never awaits publish; DB is the source of truth
 - Polling fallback: Zero breaking changes if Redis is unavailable
 - No client changes: SSE event format stays identical — useAiPathsRuntime.ts
 EventSource code unchanged
 - Channel auto-cleanup: Redis channels expire when all subscribers disconnect

 Implementation Order

 1. redis-pubsub.ts — Foundation
 2. run-stream-publisher.ts — Convenience wrapper
 3. path-run-executor.ts — Add publish calls
 4. stream/route.ts — Subscription-based SSE with fallback
 5. path-run-service.ts — Publish on cancel/resume/retry
 6. ai-path-run-processor.ts — Publish on failure/dead-letter

 Verification

 1. Start a server-side path run → node updates arrive instantly (not 500ms
 delayed)
 2. Open mapper config during run → live preview updates in real-time
 3. Cancel a run → client receives done event immediately
 4. Kill Redis → SSE falls back to polling transparently
 5. Multiple browser tabs watching same run → all receive updates
 simultaneously
 6. Check Redis CLI: SUBSCRIBE ai-paths:run:{runId} shows messages flowing
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌



---

run npx tsc and address the issues one by one 
run npx eslint and address the issues one by one 
run npm build and address the issues one by one 
run vitest and address the issues ony by one
npm audit fix
npm run test:e2e

PRISMA
npx prisma generate
npx prisma migrate dev
npx prisma migrate reset
npx prisma db push


address vitest Prisma mock issues
---
INNESTIGATION AN PLANNING
-Carry out investigation into *** 
-I would like to introduce a new feature, prepare a plan, main concerns, areas of interest and fallback strategies for ***
-Run a thorough scan of the application and identify areas of improvement
-Identify potential areas of optimization and improvement in the application and prepare a plan to address them
-Scan the application and Prepare a thorough GEMINI.MD
-Scan the application and tell me if there are any modules or application that I could you to improve the app


---

ERROR DETECTION
Scan the ****** feature and build logical try and Catch Blocks with error explanantion around potential areas of failure
Add Error Boundary components to catch uncaught UI errors and forward them to your logger (via componentDidCatch)
-Replace ad-hoc try/catch patterns with a consistent error boundary: server action wrapper + route handler wrapper + job wrapper. Each wrapper must: normalize errors, attach context, log centrally, and return a typed result.
-Find all console.* usage; replace with structured logger calls. Enforce: log levels, stable event names, correlation ID, and redaction of secrets.
-Implement UI Error Boundaries for React trees and ensure boundary events flow into the centralized error pipeline (including component stack, route, and last user action).
-Add a ‘safe error serializer’ for client responses: keep user-facing error codes/messages stable; never include raw stack traces or DB error strings.



STATE MANAGEMENT
-Scan the application for potential areas of props-drilling and apply useContext as a refactor
-Reduce prop drilling by leveraging React Context or other state-management. Where many nested components receive the same prop, create a Context provider so children can consume values directly
.For example, the React docs note that “Context lets a parent component provide data to the entire tree below it…without passing it explicitly through props”
-Scan for deeply nested props (prop drilling) and introduce React Context (with useContext) to supply common data/state
-If multiple components need access to user data, create a UserContext that provides this data to all children without prop drilling.

UI CONSOLIDATION
-Identify UI components for consolidation and props-drilling refactor opportunities.
-Consolidate UI elements. Search for similar components with a potential to apply a unifying pattern and UI cosolidation
-Apply consistent look of components, buttons etc. to make components should be as reusable as possible.
-Consolidate similar UI elements into reusable components. Scan the UI for duplicate or nearly-identical components (e.g. buttons, cards, form fields) and extract them into parameterized “dumb” components. Avoid massive components with long conditional blocks; instead, compose small stateless components with HOCs or wrapper components
-Identify similar form or display components and refactor into shared, parametric components (with a shared props interface)
-Replace repetitive UI code by creating higher-order or composite components

RESTRUCTURING
-Carry out File Segmentation for bloated code files
improve application Architecture segmentation and restructuring
-Locate large files and propose file segmentation and architecture restructuring.
-Adopt a modular, feature-based project structure. For large apps, using a monorepo (via Nx, Turborepo, etc.) allows sharing code and types between frontend and backend.
-Reorganize code into feature folders or an Nx monorepo so shared utilities/types live centrally
-Move service/repository logic into domain-specific modules rather than global files

TYPES & DTOS
-Scan for redundant types and propose unified DTOs and TanStack Query integration.
-Identify redundant or duplicated TypeScript types/interfaces and consolidate them into shared Data Transfer Objects
(DTOs) or schemas. Ensure that both frontend and backend use the same interfaces to reduce maintenance overhead and improve type safety.
-Define API request/response schemas (e.g. with Zod or OpenAPI) in a shared module so that validation, documentation, and types all come from a single source of truth. Alternatively, use a monorepo to share TypeScript types across layers.
-Scan the application for potential areas of unnecessary types or type clusters that can be moved into unified into DTOs
-Scan  Types and Type Clusters and move them over to the respective features localised or shared types folder.
Detect redundant types and propose unified DTOs and TanStack Query integration.
-Consolidate redundant type definitions into shared DTOs or schemas. Ensure frontend and backend use the same interfaces. One approach is to define API request/response schemas (with Zod) in a shared module.
-Define DTO contracts as zod objects in a shared package
-Search for duplicate TS types/interfaces and move them into a common dto/ module
Use a schema (Zod) to auto-generate shared types for API payloads

FEATURE - DATA FETCHING API IMPROVEMENT - TANSTACK QUERY
implement tanstack query all across application
Connect tanstack queries to a unified error logging and handling system.
-Create a single QueryClient with global QueryCache + MutationCache callbacks that forward errors into the central error handler (with queryKey/mutationKey). Do not throw from global callbacks.
-Define a global retry policy: do not retry 4xx, limit retries for 5xx/timeouts, and align SSR/server retries to be fast.
-Standardize query keys and introduce a key factory per domain (usersKeys.list(), ordersKeys.detail(id)), then refactor existing hooks to use it.
Integrate React Query (TanStack Query) properly. Create a single QueryClient instance and configure its global handlers. 
React Query supports global onError/onSuccess callbacks at the QueryCache level. You can use these hooks to funnel all query/mutation errors into your logging system. 
Initialize a shared QueryClient with default onError callback that logs errors centrally
Convert existing data fetching hooks to use TanStack Query and remove ad-hoc fetch logic. Connect those error callbacks to your central error logger.

LOGGING
-Search for error reporting code blocks and connect them to centralised Error logging and Error handling system
connect all API to Error logging and handling system
-Search for action reporting code blocks and connect them to centralised Logging and handling system
-Connect Activity logging to a centralised logging system 
-Scan repository for error handling and centralized logging integration points.
-Replace ad-hoc console.log calls with a logging library (e.g. Winston or Pino) to produce structured log output
-Integrate an error-tracking service to capture exceptions in both client and server code
-Audit code for bare console.error/console.log and replace with our centralized logger” and “Wrap top-level React components in Error Boundaries that send exceptions to the log service
-Add OpenTelemetry instrumentation via instrumentation.ts and export traces/logs/metrics. Ensure server spans include route, requestId, userId (if available), and DB timing.
-Instrument Prisma query timings, Redis timings, and external API timings into traces + structured logs. Produce a ‘top 10 slow operations’ report from local runs.
-Implement a ‘diagnostic mode’ for production troubleshooting: enable additional logging/tracing via feature flag and auto-disable after TTL.


TESTING
Prepare a suite tests in vitests for feature ***
write tests for critical components and API routes
write end-to-end tests (Playwright) for key flows
include npm test in your build pipeline.
Write and integrate automated tests. Unit and integration tests catch regressions early.
Set up Jest and React Testing Library ? - Don't I have that alrady ? Is vitest better than React Testing Licrary ?

CODE PERFORMANCE
Scan for optimization opportunities Optimization and speed up processes
check *** section optimization opportunities and avoidance of unnecessary re-renders.

WEB NETWORK PERFORMANCE
! Use tools like Lighthouse and Next.js Analytics to identify slow pages. Lighthouse audits can reveal bundle bloat, render-blocking resources, and accessibility issues.
- Run Lighthouse audit; fix any high severity issues (e.g. large images, slow scripts)
-Enable reportWebVitals in Next.js to log core web vitals (TTFB, FID, CLS)
-Review bundle size (e.g. via next build --profile) and code-split large modules or use dynamic imports where beneficial.
-Scan all server-side network calls (fetch/axios/db/redis) and enforce defaults: timeout, abort support, retry policy, and correlation IDs. Ensure retries are safe (idempotent) and add idempotency keys for mutations.
-Audit all async workflows for failure modes (DB/Redis/network). Add ‘typed errors’ (AppError subclasses) and map them to consistent HTTP responses and user-safe messages. Ensure stack traces are kept for logs but not leaked to clients.
-Implement circuit-breaker behavior for flaky downstream dependencies: detect repeated failures, short-circuit for a cooldown, and return degraded responses + log structured events.
-Add concurrency guards for expensive endpoints: request coalescing (single-flight) so concurrent identical requests share one in-flight computation.
-Add a global request context (requestId, userId, route, build version) that is attached to every log, error report, and tracing span.
-Run bundle analysis and remove/replace heavy dependencies. Apply dynamic imports and optimize package imports where possible.
-Adopt next/font for all fonts and remove runtime Google Fonts requests. Verify reduced layout shift and improved privacy.
-Find and fix React render hotspots: memoize derived props, remove unnecessary state, stabilize callbacks, and measure rerenders before/after.
-Audit images: ensure next/image usage, correct sizing, responsive formats, and remove oversized assets.

FILE & MODULE SPLITTING
-Break up large files and components
-Long React components (hundreds of lines) often mix concerns; splitting them improves maintainability.
Splitting a component into smaller ones is the best way to spread that complexity. If a file does UI layout, data fetching, and business logic all at once, that’s a sign to refactor. 
Locate any component or file over ~300 lines and split it: separate presentation vs logic
Extract complex logic or JSX branches into child components

CACHING
-Audit all data fetching paths and explicitly choose caching semantics: force-cache, no-store, or next.revalidate. Document the rationale for each route.
-Introduce tag-based cache invalidation and wire it to mutations (Server Actions / Route Handlers): when data changes, call revalidateTag for impacted tags.
-Identify endpoints/pages with repeated identical reads; implement server-side caching (Next Data Cache + Redis) with TTL and invalidation rules.

DATABASE - REDIS
-Implement cache stampede prevention for hot keys: mutex locking (SET NX PX) + safe unlock token. Ensure only one worker rebuilds cache on miss.
-Add a cache policy registry: every cached key must define TTL, stale strategy, invalidation triggers, and max payload size.

DATABASE - PRISMA
-Scan Prisma queries for over-fetching and missing indexes; add indexes in schema for where/orderBy hot paths. Provide before/after timings.
-Ensure PrismaClient is instantiated once per runtime and reused to avoid connection exhaustion; refactor any per-request instantiation.
-Introduce bulk operations (createMany, updateMany, etc.) for heavy write paths; verify correctness with tests.
-Add query monitoring/optimization workflow (Prisma Optimize or equivalent): record slow queries, group by pattern, and fix the highest-impact items first.

DATABASE - MONGODB

SECURITY
-Ensure dependencies are up-to-date and secure. 
-Run npm audit fix (or Snyk scan) and resolve any critical vulnerabilities in dependencies
- Use HTTPS and environment variable checks.
-add Vulnerability scanning to CI.
-Implement baseline security headers in next.config.js (HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, etc.) and document why each is set.
-Add a strict Content Security Policy with nonces; ensure compatibility with Next.js scripts and remove unsafe inline scripts where possible.
-Scan for secrets leakage: ensure no sensitive data is logged, no tokens in URLs, and all config is via env vars with validation on boot.
-Add rate limiting / abuse protection (especially auth + write endpoints), ideally backed by Redis, with clear error responses and logging.

CODE QUALITY
-Add CI gates: typecheck, lint, test, build. Fail fast and surface the first actionable error. Enforce consistent node version + lockfile integrity.
-Create performance budgets: bundle size thresholds, API latency targets, DB query count per request. Fail CI if budgets regress.
-Add integration tests for the error/logging pipeline: simulate failures in server actions, route handlers, queries, and UI boundaries; assert the central logger receives normalized events.

DOCUMENTATION & TOOLING
-Maintain clear docs and pipeline
-Generate/update API documentation (e.g. Swagger/OpenAPI) for backend routes
-Document key architectural decisions and patterns in a central README
Set up automated code formatting and pre-commit hooks (Prettier)

---

GOLD STANDARD
“You are the senior engineer responsible for reliability and performance. Implement [CHANGE]. Constraints: (1) do not change external behavior except to fix bugs, (2) add/adjust tests, (3) keep types strict, (4) no new deps unless justified, (5) update docs. Deliverables: (a) code changes, (b) brief design notes, (c) verification steps + commands run, (d) risks and rollout plan.”