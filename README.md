# geminitestapp

This repository contains a large Next.js platform application, the Kangur
learner product, an Expo-based native mobile app, and shared cross-platform
packages for contracts, domain logic, transport, and platform ports.

## Main surfaces

- Root app: Next.js App Router web, admin, and API surface at the repository
  root.
- Kangur web: learner-facing StudiQ and Kangur experience inside the root app.
- Kangur mobile: Expo Router app in `apps/mobile`.
- Shared Kangur packages:
  - `packages/kangur-contracts`
  - `packages/kangur-core`
  - `packages/kangur-api-client`
  - `packages/kangur-platform`

## Workspaces

- `apps/mobile`: active native Kangur app for iOS, Android, and Expo web preview.
- `apps/mobile-web`: reserved for a future dedicated React Native Web target.
- `packages/kangur-*`: shared Kangur contracts, logic, transport, and platform boundaries.

## Common commands

- `npm run dev`: start the root Next.js platform app.
- `npm run dev:mobile`: start the Expo development server for Kangur mobile.
- `npm run typecheck`: run the root TypeScript check.
- `npm run typecheck:mobile`: run the mobile workspace TypeScript check.
- `npm run lint`: run the main ESLint lane.
- `npm run test:unit`: run the main unit Vitest project.
- `npm run docs:structure:check`: validate docs structure, hubs, and canonical metadata.
- `npm run repair:kangur:content`: backfill built-in Kangur lessons/content into MongoDB and verify the result strictly.

## Documentation

- Repo docs index: [`docs/README.md`](./docs/README.md)
- Deep architecture reference: [`GEMINI.md`](./GEMINI.md)
- Frontend route-group layout: [`src/app/(frontend)/README.md`](./src/app/%28frontend%29/README.md)
- Kangur feature layout: [`src/features/kangur/README.md`](./src/features/kangur/README.md)
- Kangur hub: [`docs/kangur/README.md`](./docs/kangur/README.md)
- Mobile app runtime guide: [`apps/mobile/README.md`](./apps/mobile/README.md)
- Reserved mobile web boundary: [`apps/mobile-web/README.md`](./apps/mobile-web/README.md)
- Package entry docs:
  - [`packages/kangur-contracts/README.md`](./packages/kangur-contracts/README.md)
  - [`packages/kangur-core/README.md`](./packages/kangur-core/README.md)
  - [`packages/kangur-api-client/README.md`](./packages/kangur-api-client/README.md)
  - [`packages/kangur-platform/README.md`](./packages/kangur-platform/README.md)

## Where to start

- Product and platform overview: [`docs/README.md`](./docs/README.md)
- Kangur runtime topology: [`docs/kangur/studiq-application.md`](./docs/kangur/studiq-application.md)
- Cross-platform Kangur workspace rules:
  [`docs/kangur/react-native-monorepo-scaffold.md`](./docs/kangur/react-native-monorepo-scaffold.md)
