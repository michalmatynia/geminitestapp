Shared route rendering and metadata helpers for the frontend route tree.

Use this folder for logic that is intentionally shared between:
- `src/app/(frontend)`
- `src/app/[locale]/(frontend)`

Keep actual route entrypoints in the route folders, keep reusable route
composition here, and keep route-helper tests in `route-helpers/__tests__/`.
