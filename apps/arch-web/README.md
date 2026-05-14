# arch-web — milkbardesigners.com

Architecture studio web application for **Milk Bar Designers**.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animation | GSAP + `@gsap/react` |
| 3D | Three.js |
| Database | MongoDB (local or Atlas) |
| Runtime | Node.js / Bun |

---

## Running in development

### 1. Install dependencies

From the **monorepo root**:

```bash
npm install
```

Or from this package directory:

```bash
cd apps/arch-web
npm install
```

### 2. Start the MongoDB instance

The app uses a local MongoDB on port **27022**.

```bash
npm run mongo:arch:up
```

Check it is running:

```bash
npm run mongo:arch:status
```

Stop it when done:

```bash
npm run mongo:arch:down
```

> **Atlas alternative** — set `ARCH_MONGODB_CLOUD_URI`, `ARCH_MONGODB_CLOUD_DB`, and `ARCH_MONGODB_ACTIVE_SOURCE=cloud` in `.env.local` to point at an Atlas cluster and skip the local Mongo steps.

### 3. Configure environment variables

Create `apps/arch-web/.env.local`:

```env
# MongoDB — defaults work with the local instance above
ARCH_MONGODB_LOCAL_URI=mongodb://127.0.0.1:27022/arch_web_local
ARCH_MONGODB_LOCAL_DB=arch_web_local
```

Both variables are optional; the defaults in `src/lib/mongodb.ts` fall back to the values above.

### 4. Seed the database (first run)

```bash
npm run seed
```

### 5. Start the dev server

```bash
npm run dev
```

App is served at **http://localhost:3400**.

---

## Available scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev --webpack --port 3400` | Dev server with hot reload |
| `build` | `next build --webpack` | Production build |
| `start` | `next start --port 3400` | Serve production build |
| `typecheck` | `tsc --noEmit` | TypeScript type check |
| `seed` | `node --experimental-transform-types scripts/seed.ts` | Seed MongoDB |
| `mongo:arch:up` | local-mongo.mjs up | Start local MongoDB on port 27022 |
| `mongo:arch:down` | local-mongo.mjs down | Stop local MongoDB |
| `mongo:arch:status` | local-mongo.mjs status | Check MongoDB process |

---

## Project structure

```
apps/arch-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   ├── globals.css        # Global styles
│   │   └── api/               # API route handlers
│   ├── components/            # React components
│   │   ├── Nav.tsx
│   │   ├── Hero.tsx
│   │   ├── Cursor.tsx
│   │   ├── FloorPlan.tsx
│   │   ├── Philosophy.tsx
│   │   ├── Services.tsx
│   │   └── BuiltWork.tsx
│   ├── lib/
│   │   ├── mongodb.ts         # MongoDB client (pooled)
│   │   ├── types.ts           # Shared TypeScript types
│   │   ├── projectModels.ts   # MongoDB query helpers
│   │   └── floorPlanContext.tsx
│   └── models/                # Data model definitions
├── scripts/
│   └── seed.ts                # Database seeding script
├── next.config.mjs
├── tsconfig.json
└── package.json
```

**Path alias**: `@/*` maps to `src/*` — use `import Foo from '@/components/Foo'`.

---

## Database

- **Local**: MongoDB on `mongodb://127.0.0.1:27022`, database `arch_web_local`
- **Connection pool**: max 5 connections, 10 s timeout (see `src/lib/mongodb.ts`)
- **Collections**: `projects`, `services` (see `src/lib/types.ts`)

---

## Key dependencies

```
next           ^16.1.1   Framework
react          ^19.2.3
gsap           ^3.15.0   Animation
@gsap/react    ^2.1.2    GSAP React integration
three          ^0.155.0  3D rendering
mongodb        ^6.21.0   Database driver
```

---

## Notes

- Dev port is **3400** (not the default 3000) — other apps in the monorepo occupy lower ports.
- Webpack is explicitly enabled (`--webpack` flag) instead of Turbopack.
- `optimizePackageImports` is set for `gsap`, `@gsap/react`, and `three` to reduce bundle size.
