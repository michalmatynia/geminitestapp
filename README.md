# Kangur Platform - Comprehensive Educational & Business Application

This repository contains a large-scale Next.js platform application featuring the Kangur educational product, an Expo-based native mobile app, and shared cross-platform packages for contracts, domain logic, transport, and platform integrations.

## Architecture Overview

The platform is built as a monorepo supporting multiple deployment targets and user experiences, from educational content delivery to business process automation.

## Main Application Surfaces

- **Root App**: Next.js App Router web application with admin interface and comprehensive API surface at the repository root
- **Kangur Web**: Learner-facing StudiQ and Kangur educational experience integrated within the root app
- **Standalone StudiQ Web**: Focused Next.js workspace in `apps/studiq-web` providing an isolated Kangur/StudiQ web shell
- **Kangur Mobile**: Cross-platform Expo Router app in `apps/mobile` for iOS and Android
- **Shared Kangur Packages**: Reusable cross-platform modules
  - `packages/kangur-contracts` - Type definitions and API contracts
  - `packages/kangur-core` - Core business logic and utilities  
  - `packages/kangur-api-client` - API client libraries
  - `packages/kangur-platform` - Platform-specific integrations

## Workspaces

- `apps/studiq-web`: standalone StudiQ/Kangur Next.js workspace.
- `apps/mobile`: active native Kangur app for iOS, Android, and Expo web preview.
- `apps/mobile-web`: reserved for a future dedicated React Native Web target.
- `packages/kangur-*`: shared Kangur contracts, logic, transport, and platform boundaries.

## Common commands

- `npm run dev`: start the root Next.js platform app.
- `npm run dev -w @app/studiq-web`: start the standalone StudiQ web workspace
  on port `3100`.
- `npm run dev:mobile`: start the Expo development server for Kangur mobile.
- `npm run typecheck`: run the root TypeScript check.
- `npm run typecheck:mobile`: run the mobile workspace TypeScript check.
- `npm run lint`: run the main ESLint lane.
- `npm run test:unit`: run the main unit Vitest project.
- `npm run mongo:ecom:up`: start the local ecommerce MongoDB on
  `127.0.0.1:27021` for Product List EC quick export and the ecommerce
  storefront local catalog.
- `npm run mongo:ecom:status`: check the local ecommerce MongoDB pid, port,
  data dir, and log path.
- `npm run mongo:ecom:down`: stop the local ecommerce MongoDB.
- `npm run docs:structure:check`: validate docs structure, hubs, and canonical metadata.
- `npm run repair:kangur:content`: backfill built-in Kangur lessons/content into MongoDB and verify the result strictly.

## Documentation

- Repo docs index: [`docs/README.md`](./docs/README.md)
- Repository documentation map:
  [`docs/documentation/repo-documentation-map.md`](./docs/documentation/repo-documentation-map.md)
- Deep architecture reference: [`GEMINI.md`](./GEMINI.md)
- Application/workspace command map:
  [`docs/build/application-workspaces-and-commands.md`](./docs/build/application-workspaces-and-commands.md)
- Frontend route-group layout: [`src/app/(frontend)/README.md`](./src/app/%28frontend%29/README.md)
- Kangur feature layout: [`src/features/kangur/README.md`](./src/features/kangur/README.md)
- Kangur hub: [`docs/kangur/README.md`](./docs/kangur/README.md)
- Standalone StudiQ web workspace guide:
  [`apps/studiq-web/README.md`](./apps/studiq-web/README.md)
- Mobile app runtime guide: [`apps/mobile/README.md`](./apps/mobile/README.md)
- Reserved mobile web boundary: [`apps/mobile-web/README.md`](./apps/mobile-web/README.md)
- Package entry docs:
  - [`packages/kangur-contracts/README.md`](./packages/kangur-contracts/README.md)
  - [`packages/kangur-core/README.md`](./packages/kangur-core/README.md)
  - [`packages/kangur-api-client/README.md`](./packages/kangur-api-client/README.md)
  - [`packages/kangur-platform/README.md`](./packages/kangur-platform/README.md)

## Where to start

- Product and platform overview: [`docs/README.md`](./docs/README.md)
- App and workspace command reference:
  [`docs/build/application-workspaces-and-commands.md`](./docs/build/application-workspaces-and-commands.md)
- Kangur runtime topology: [`docs/kangur/studiq-application.md`](./docs/kangur/studiq-application.md)
- Cross-platform Kangur workspace rules:
  [`docs/kangur/react-native-monorepo-scaffold.md`](./docs/kangur/react-native-monorepo-scaffold.md)
