# Frontend Route Group

This route group owns the public CMS and StudiQ/Kangur frontend surface.

## Root Rules

- Keep the route root thin. Files directly under `src/app/(frontend)/` should be
  route entrypoints or route-group shell files only.
- Shared route support belongs in named sibling folders such as `home/`,
  `cms/`, `shell/`, `preview/`, `products/`, or `route-helpers/`.
- Concrete route folders such as `[...slug]/`, `preview/[id]/`, and
  `products/[id]/` should keep entrypoints only when possible. If a support file
  is reused or contains non-trivial logic, move it up to the owning route-group
  folder.

## Current Ownership

- `home/`: front-page rendering helpers and timing/normalization support
- `cms/`: shared CMS page rendering and slug-resolution data loading
- `shell/`: public-owner shell wiring and shell support code
- `route-helpers/`: shared route logic used by both localized and non-localized
  entrypoints
- `preview/`: preview-specific support and route files
- `products/`: public product route support and entrypoints
- `kangur/`: public StudiQ/Kangur route entrypoints
- `__tests__/`: cross-route loading/layout tests that do not belong to a single
  route folder

## Localized Tree Rule

`src/app/[locale]/(frontend)/` should prefer thin wrappers or re-exports over
duplicating route logic. Shared behavior belongs here in the canonical
`(frontend)` tree first.
