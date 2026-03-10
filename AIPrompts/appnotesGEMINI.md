npm run typecheck
npm run lint - most general better run guided
npm run lint:fix:app
npm run lint:fix:features
npm run lint:fix:shared
npm run lint:scanner-scripts
npm run lint:fix:debug - for LIVE Linter

run npm build
run vitest
npm run test:e2e 

npm audit fix

SCANNERS
npm run check:quality:core
npm run check:quality:extended
npm run observability:scan
npm run observability:check
npm run check:security:static (and :strict)
npm run check:security:authz-matrix (and :strict)
npm run check:accessibility:component-policies:strict
npm run check:api-input-validation (and :strict)
npm run check:import-boundaries (and :strict)
npm run check:context-health:strict
npm run check:timer-cleanup (and :strict)
npm run check:test-distribution (and :strict)
npm run check:route-policies:strict
npm run check:api-contract-coverage (and :strict)
npm run check:api-error-sources (and :strict)
npm run check:unsafe-patterns (and :strict)
npm run canonical:check:sitewide
npm run check:factory-meta:strict
npm run quality:weekly-report:strict
npm run metrics:all
npm run metrics:hotspots
npm run metrics:type-clusters
npm run metrics:prop-drilling
npm run metrics:collect
npm run observability:check
npm run observability:scan
npm run health:env-contract (and :strict)
npm run health:storage-and-files (and :strict)
npm run health:queue-runtime (and :strict)

PERFORMANCE
npm run perf:ops:weekly

PRISMA
npx prisma generate
npx prisma migrate dev
npx prisma migrate reset
npx prisma db push

--
INVESTIGATION AN PLANNING
-Carry out investigation into **_
-I would like to introduce a new feature, prepare a plan, main concerns, areas of interest and fallback strategies for _**
-Run a thorough scan of the application and identify areas of improvement
-Identify potential areas of optimization and improvement in the application and prepare a plan to address them
-Scan the application and Prepare a thorough GEMINI.MD
-Scan the application and tell me if there are any modules or application that I could you to improve the app

run application cleanup
---

ERROR DETECTION
Scan the **\*\*** feature and build logical try and Catch Blocks with error explanantion around potential areas of failure
Add Error Boundary components to catch uncaught UI errors and forward them to your logger (via componentDidCatch)
-Replace ad-hoc try/catch patterns with a consistent error boundary: server action wrapper + route handler wrapper + job wrapper. Each wrapper must: normalize errors, attach context, log centrally, and return a typed result.
-Find all console.\* usage; replace with structured logger calls. Enforce: log levels, stable event names, correlation ID, and redaction of secrets.
-Implement UI Error Boundaries for React trees and ensure boundary events flow into the centralized error pipeline (including component stack, route, and last user action).
-Add a ‘safe error serializer’ for client responses: keep user-facing error codes/messages stable; never include raw stack traces or DB error strings.

wire metrics
---

NETWORK
-Scan \*\*\* feature for a potential problem with unnecessary Refetching and CSRF related problems.

Remove legacy solutions and backwards compatibility I want only the newest
pursue project-wide standardization
apply the standardized mutation factories
Develop further robust Tanstack factories for different requests connect them to centralised logging system
migrate products/image-studio/integrations hooks to v2 factories behind flags.
bump application versioning on all features

VALIDATION

- expand mutation-invalidation matrix
- improve mutation-invalidation matrix
  migrate key hooks to centralized factories
  Update feature hooks to use centralized query keys

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
-Define API request/response schemas (with Zod) in a shared module so that validation, documentation, and types all come from a single source of truth. Alternatively, use a monorepo to share TypeScript types across layers.
-Scan the application for potential areas of unnecessary types or type clusters that can be moved into unified into DTOs
-Scan Types and Type Clusters and move them over to the respective features localised or shared types folder.
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
Integrate TanStack Query properly. Create a single QueryClient instance and configure its global handlers.
React Query supports global onError/onSuccess callbacks at the QueryCache level. You can use these hooks to funnel all query/mutation errors into your logging system.
Initialize a shared QueryClient with default onError callback that logs errors centrally
Convert existing data fetching hooks to use TanStack Query and remove ad-hoc fetch logic. Connect those error callbacks to your central error logger.

LOGGING
-Search for error reporting code blocks and connect them to centralised Error logging and Error handling system
-connect all API to Error logging and handling system
-Search for action reporting code blocks and connect them to centralised Logging and handling system
-Connect Activity logging to a centralised logging system
-Scan repository for error handling and centralized logging integration points.
-Replace ad-hoc console.log calls with a centralised logging library to produce structured log output
-Integrate an error-tracking service to capture exceptions in both client and server code
-Audit code for bare console.error/console.log and replace with our centralized logger” and “Wrap top-level React components in Error Boundaries that send exceptions to the log service
-Add OpenTelemetry instrumentation via instrumentation.ts and export traces/logs/metrics. Ensure server spans include route, requestId, userId (if available), and DB timing.
-Instrument Prisma query timings, Redis timings, and external API timings into traces + structured logs. Produce a ‘top 10 slow operations’ report from local runs.
-Implement a ‘diagnostic mode’ for production troubleshooting: enable additional logging/tracing via feature flag and auto-disable after TTL.

MIGRATION
-migrate everything to its newest for and prune backwards compatibility
-make everything canonical 

TESTING
Prepare a suite tests in vitests for feature \*\*\*
write tests for critical components and API routes
write end-to-end tests (Playwright) for key flows
include npm test in your build pipeline.
Write and integrate automated tests. Unit and integration tests catch regressions early.

CODE PERFORMANCE
Scan for optimization opportunities Optimization and speed up processes
check \*\*\* section optimization opportunities and avoidance of unnecessary re-renders.

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
-Scan Prisma/MongoDB queries for over-fetching and missing indexes; add indexes in schema for where/orderBy hot paths. Provide before/after timings.
-Ensure PrismaClient/MongoDBClient is instantiated once per runtime and reused to avoid connection exhaustion; refactor any per-request instantiation.
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
