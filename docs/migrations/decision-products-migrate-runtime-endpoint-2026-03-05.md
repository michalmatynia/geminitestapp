# Decision Record: `products-migrate-runtime-endpoint` (2026-03-05)

Date: 2026-03-05  
Status: Accepted + Implemented (2026-03-05)  
Owner: products  
Reviewers: platform-architecture, operations  
Backlog ID: `products-migrate-runtime-endpoint`

## Context

Runtime exposes migration handlers at:

- `src/app/api/v2/products/migrate/handler.ts`
- `src/app/api/v2/products/migrate/route.ts`

This endpoint performs batch migration and can trigger full database backup behavior. It is currently classified as a `breakglass_surface` compatibility debt item.

## Decision

1. Remove `/api/v2/products/migrate` from runtime API surface.
2. Keep migration execution script-driven via controlled operator workflows:
   - `products:normalize:v2`
   - wave verification scripts (`wave1:verify:*`)
3. Keep migration operations in runbooks and script lifecycle governance only, not in public runtime route handlers.

## Rationale

1. Migration endpoints are operational tooling, not product runtime behavior.
2. Removing the route reduces accidental invocation risk and simplifies canonical API policy.
3. Script-based workflows already exist and are explicitly tracked in migration governance.

## Implementation Scope

1. Remove runtime route/handler:
   - `src/app/api/v2/products/migrate/handler.ts`
   - `src/app/api/v2/products/migrate/route.ts`
2. Update tests and references:
   - `__tests__/api/products/migration.test.ts`
   - Any internal links/docs that mention runtime endpoint usage.
3. Update migration docs:
   - `docs/canonical-prune-backlog-2026-03-05.csv`
   - `docs/migrations/script-lifecycle-register-2026-03-05.md` (if classification changes)

## Rollback Plan

1. Restore endpoint in a dedicated rollback PR if script-only operations prove insufficient.
2. Any restored endpoint must be breakglass-only with explicit authorization policy and sunset date.
3. Register any temporary restoration in the exception register.

## Acceptance Criteria

1. `api/v2/products/migrate` route is removed from runtime tree.
2. Migration can still be executed through approved scripts and runbooks.
3. API tests and canonical checks pass after route removal:
   - `npm run test:unit`
   - `npm run canonical:check:sitewide`
