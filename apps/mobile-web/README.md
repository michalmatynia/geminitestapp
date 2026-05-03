---
owner: 'Kangur Team'
last_reviewed: '2026-04-17'
status: 'reserved'
doc_type: 'overview'
scope: 'workspace:@kangur/mobile-web'
canonical: true
---

# Kangur Mobile Web

`apps/mobile-web` is reserved for a future dedicated Expo or React Native Web
target for Kangur.

## Current status

- This workspace is not the canonical public web app.
- The active desktop and public web deployment still lives at the repository root
  in the Next.js application.
- `apps/mobile` can be previewed on Expo web, but that preview is a validation
  path for the native shell rather than the production web surface.
- There is no active standalone runtime, route tree, or deployment contract in
  this workspace today.

## Current workflow

- Use `npm run dev` for the canonical public web and admin application.
- Use `npm run dev:mobile:web` when you need the Expo web preview of the native
  app shell.
- Do not use `npm run build -w @kangur/mobile-web` as a normal workflow today.
  The only defined workspace script intentionally exits with a scaffold warning
  until the workspace is explicitly activated.
- Treat Expo web preview as a parity and validation aid for `apps/mobile`, not
  as a sign that `apps/mobile-web` should own real web traffic.

## Current workspace contract

- Workspace name: `@kangur/mobile-web`
- Current script surface: `build` only, and it intentionally fails with a
  scaffold-only message
- Runtime status: no active app shell, route tree, or deploy target
- Documentation status: keep this README aligned with the reserved-workspace
  rule until the repo explicitly activates the workspace

## Ownership boundary

- Put learner-facing native routes and native runtime wiring in `apps/mobile`.
- Keep CMS composition, public web routing ownership, `/admin/kangur`, and
  `/api/kangur/*` in the root app until a deliberate web migration exists.
- Add code here only when the team explicitly decides to support a standalone
  Expo or React Native Web target.

## Do not put here

- Public marketing or learner web routes that belong to the root Next.js app.
- `/api/kangur/*` handlers, admin surfaces, or CMS composition logic.
- Shared Kangur contracts, domain logic, or platform adapters that belong in
  `packages/kangur-*`.
- Temporary Expo web experiments that should instead live in `apps/mobile`.

## Activation rule

Only treat this workspace as active after all of the following are true:

- there is an explicit decision to support a dedicated React Native Web target
- ownership of specific routes or shells has been moved out of the root app
- runtime, build, and deployment docs are updated alongside that migration
- the reserved-workspace language in the repo and Kangur hubs is removed

## Related docs

- `../../docs/kangur/studiq-application.md`
- `../../docs/kangur/react-native-monorepo-scaffold.md`
- `../mobile/README.md`
