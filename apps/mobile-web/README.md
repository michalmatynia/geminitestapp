# Kangur Mobile Web

`apps/mobile-web` is reserved for a future dedicated Expo or React Native Web
target for Kangur.

## Current status

- This workspace is not the canonical public web app.
- The active desktop and public web deployment still lives at the repository root
  in the Next.js application.
- `apps/mobile` can be previewed on Expo web, but that preview is a validation
  path for the native shell rather than the production web surface.

## Ownership boundary

- Put learner-facing native routes and native runtime wiring in `apps/mobile`.
- Keep CMS composition, public web routing ownership, `/admin/kangur`, and
  `/api/kangur/*` in the root app until a deliberate web migration exists.
- Add code here only when the team explicitly decides to support a standalone
  Expo or React Native Web target.

## Related docs

- `../../docs/kangur/studiq-application.md`
- `../../docs/kangur/react-native-monorepo-scaffold.md`
- `../mobile/README.md`
