# Kangur Platform - Code Guide

This document provides explanatory comments and guidance for understanding the codebase structure.

## Architecture Overview

The Kangur Platform is a comprehensive Next.js monorepo featuring:
- **Root App**: Main Next.js application with admin interface and API
- **StudiQ Web**: Standalone educational web application (`apps/studiq-web`)
- **Kangur Mobile**: Cross-platform Expo app (`apps/mobile`)
- **Shared Packages**: Reusable modules for contracts, core logic, API clients, and platform integrations

## Key Entry Points

### 1. Application Bootstrap

#### `src/instrumentation.ts`
- **Purpose**: Next.js instrumentation entry point, runs before app starts
- **Responsibilities**:
  - Routes to Edge or Node.js runtime initialization
  - Handles environment-specific setup
  - Can be skipped via `SKIP_NEXT_NODE_INSTRUMENTATION` env var

#### `src/instrumentation.node.ts`
- **Purpose**: Node.js runtime initialization
- **Responsibilities**:
  - Global error handlers for uncaught exceptions
  - Process signal handling for graceful shutdown
  - OpenTelemetry integration for distributed tracing
  - Database connection initialization
  - Queue system setup

#### `src/app/layout.tsx`
- **Purpose**: Root layout component for the entire application
- **Responsibilities**:
  - Global providers (i18n, accessibility, theme)
  - Metadata generation for SEO
  - Font loading and typography setup
  - Lite settings hydration for client-side state
  - Skip-to-content link for accessibility

### 2. Request Routing

#### `src/proxy.ts` (Middleware)
- **Purpose**: Central request routing layer running on Edge runtime
- **Execution Order**:
  1. Traffic guard (security filtering)
  2. API route detection (pass through)
  3. Kangur route handling (redirect to separate origin if configured)
  4. Public route i18n handling
  5. Admin route authentication and canonical redirects
- **Key Features**:
  - CSRF protection via cookie management
  - Locale detection and synchronization
  - Session header injection for admin routes
  - Canonical URL redirects for deprecated admin paths

### 3. Configuration

#### `next.config.mjs`
- **Purpose**: Next.js build and runtime configuration
- **Key Settings**:
  - Internationalization with next-intl
  - React Native Web integration for cross-platform components
  - Turbopack vs Webpack bundler selection
  - Vercel-specific optimizations
  - Standalone output for Docker/self-hosted deployments
  - Image optimization and external domains
  - Experimental features (PPR, React Compiler)

#### `package.json`
- **Purpose**: Monorepo workspace configuration and scripts
- **Workspaces**:
  - `apps/*`: Application workspaces (studiq-web, mobile, mobile-web)
  - `packages/*`: Shared packages (kangur-contracts, kangur-core, etc.)
- **Key Scripts**:
  - `dev`: Start root Next.js app with memory optimization
  - `dev:mobile`: Start Expo development server
  - `build`: Production build with webpack
  - `build:turbo`: Production build with Turbopack
  - `typecheck`: TypeScript validation across all workspaces
  - `test:unit`: Run Vitest unit tests
  - `test:e2e`: Run Playwright end-to-end tests

## Directory Structure

### `/src/app` - Next.js App Router
```
app/
├── [locale]/              # Internationalized routes
│   ├── (frontend)/        # Public-facing pages
│   ├── (admin)/           # Admin interface (protected)
│   └── auth/              # Authentication pages
├── api/                   # API routes (REST endpoints)
├── kangur-api/            # Kangur-specific API endpoints
└── _providers/            # Root-level providers
```

### `/src/features` - Feature Modules
Each feature is self-contained with:
- `components/`: React components
- `hooks/`: Custom React hooks
- `lib/`: Business logic and utilities
- `contracts/`: TypeScript types and interfaces
- `api/`: API client functions
- `__tests__/`: Unit and integration tests

**Key Features**:
- `ai`: AI Paths visual workflow builder
- `auth`: Authentication and authorization
- `kangur`: Educational content delivery (StudiQ)
- `products`: Product management and catalog
- `integrations`: Third-party service integrations
- `case-resolver`: Business case management
- `filemaker`: FileMaker database integration

### `/src/shared` - Shared Code
```
shared/
├── ui/                    # Reusable UI components
├── lib/                   # Utility functions and helpers
├── hooks/                 # Shared React hooks
├── contracts/             # TypeScript types and interfaces
├── providers/             # React context providers
├── utils/                 # General utilities
├── constants/             # Application constants
├── validations/           # Zod schemas and validators
└── errors/                # Custom error classes
```

### `/apps` - Application Workspaces
- `studiq-web/`: Standalone StudiQ/Kangur web application
- `mobile/`: Expo-based native mobile app
- `mobile-web/`: Reserved for future React Native Web target

### `/packages` - Shared Packages
- `kangur-contracts/`: Type definitions and API contracts
- `kangur-core/`: Core business logic and utilities
- `kangur-api-client/`: API client libraries
- `kangur-platform/`: Platform-specific integrations

### `/scripts` - Build and Development Scripts
```
scripts/
├── db/                    # Database migration and seeding
├── quality/               # Code quality and linting
├── testing/               # Test utilities and helpers
├── architecture/          # Architecture validation
├── docs/                  # Documentation generation
├── runtime/               # Runtime utilities
├── mobile/                # Mobile-specific scripts
└── ai-paths/              # AI Paths tooling
```

### `/docs` - Documentation
```
docs/
├── kangur/                # Kangur/StudiQ documentation
├── ai-paths/              # AI Paths feature docs
├── platform/              # Platform architecture docs
├── migrations/            # Migration guides
├── metrics/               # Quality metrics and reports
└── documentation/         # Meta-documentation
```

## Key Patterns and Conventions

### 1. API Route Structure
```typescript
// handler.ts - Business logic
export async function handleRequest(req: Request): Promise<Response> {
  // Implementation
}

// route.ts - Next.js route handler
import { handleRequest } from './handler';
export const GET = handleRequest;
```

### 2. Feature Module Pattern
```
feature-name/
├── components/            # UI components
│   ├── FeatureComponent.tsx
│   └── FeatureComponent.test.tsx
├── hooks/                 # Custom hooks
│   ├── useFeature.ts
│   └── useFeature.test.ts
├── lib/                   # Business logic
│   ├── feature-logic.ts
│   └── feature-logic.test.ts
├── contracts/             # Types
│   └── feature-types.ts
└── README.md              # Feature documentation
```

### 3. Testing Strategy
- **Unit Tests**: Vitest for business logic and utilities
- **Component Tests**: React Testing Library for UI components
- **Integration Tests**: Playwright for API routes
- **E2E Tests**: Playwright for full user flows
- **Accessibility Tests**: axe-core integration in Playwright

### 4. Type Safety
- Strict TypeScript configuration
- Zod schemas for runtime validation
- Contract-first API design
- Type-safe environment variables

### 5. Internationalization
- next-intl for i18n routing and translations
- Locale detection from URL, cookie, and Accept-Language header
- Default locale bypass for cleaner URLs
- Translation files in `/messages` directory

### 6. Authentication
- NextAuth.js for authentication
- Session-based auth for web
- JWT tokens for API and mobile
- Role-based access control (RBAC)
- Admin routes protected by middleware

### 7. Database
- MongoDB for primary data store
- Mongoose for ODM
- Redis for caching and queues
- FileMaker integration for legacy data

### 8. Observability
- OpenTelemetry for distributed tracing
- Custom error logging and reporting
- Performance monitoring
- Client-side error tracking

## Development Workflow

### Starting Development
```bash
# Install dependencies
npm install

# Start root app (port 3000)
npm run dev

# Start StudiQ web (port 3100)
npm run dev -w @app/studiq-web

# Start mobile app
npm run dev:mobile
```

### Running Tests
```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Building for Production
```bash
# Webpack build (for standalone/Docker)
npm run build

# Turbopack build (faster, for Vercel)
npm run build:turbo
```

## Environment Variables

Key environment variables (see `.env.example`):
- `DATABASE_URL`: MongoDB connection string
- `NEXTAUTH_SECRET`: NextAuth.js secret
- `NEXTAUTH_URL`: Application URL
- `REDIS_URL`: Redis connection string
- `STUDIQ_WEB_ORIGIN`: StudiQ web origin for routing
- `SKIP_NEXT_NODE_INSTRUMENTATION`: Skip Node.js instrumentation

## Common Tasks

### Adding a New Feature
1. Create feature directory in `/src/features`
2. Add components, hooks, and business logic
3. Create API routes in `/src/app/api`
4. Add tests for all new code
5. Update documentation

### Adding a New API Route
1. Create handler in `/src/app/api/[route]/handler.ts`
2. Create route in `/src/app/api/[route]/route.ts`
3. Add tests in `/src/app/api/[route]/handler.test.ts`
4. Update API documentation

### Adding a New Page
1. Create page in `/src/app/[locale]/(frontend)/[route]/page.tsx`
2. Add loading state in `loading.tsx`
3. Add error boundary in `error.tsx`
4. Add metadata in page component
5. Add E2E tests

### Debugging
- Use `DEBUG=*` environment variable for verbose logging
- Check `/logs` directory for error logs
- Use browser DevTools for client-side debugging
- Use VS Code debugger for server-side debugging

## Performance Optimization

### Build Performance
- Use Turbopack for faster builds in development
- Limit build workers on Vercel to avoid timeouts
- Use standalone output for Docker deployments
- Enable SWC minification for faster builds

### Runtime Performance
- Use React Server Components for server-side rendering
- Implement code splitting with dynamic imports
- Use Next.js Image component for optimized images
- Enable PPR (Partial Prerendering) for faster page loads
- Use Redis for caching frequently accessed data

### Mobile Performance
- Use Expo Router for native navigation
- Implement lazy loading for heavy components
- Use React Native performance monitoring
- Optimize bundle size with Metro bundler

## Security

### Authentication
- Session-based auth for web with secure cookies
- JWT tokens for API with short expiration
- CSRF protection on all state-changing requests
- Rate limiting on authentication endpoints

### Authorization
- Role-based access control (RBAC)
- Admin routes protected by middleware
- API routes validate user permissions
- Database queries scoped to user access

### Data Protection
- Environment variables for secrets
- Encrypted database connections
- HTTPS-only in production
- Content Security Policy headers

## Troubleshooting

### Common Issues

**Build Timeout on Vercel**
- Use Turbopack build: `npm run build:turbo`
- Reduce build workers: `NEXT_BUILD_CPUS=1`
- Check for circular dependencies

**Type Errors**
- Run `npm run typecheck` to see all errors
- Check for missing type definitions
- Ensure all imports are correct

**Database Connection Issues**
- Verify `DATABASE_URL` is set correctly
- Check MongoDB is running
- Verify network connectivity

**Mobile App Not Starting**
- Run `npm run check:mobile:native:runtime`
- Verify Expo CLI is installed
- Check for port conflicts

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Expo Documentation](https://docs.expo.dev)
- [Repository Documentation Map](./docs/documentation/repo-documentation-map.md)
- [Kangur Feature Documentation](./docs/kangur/README.md)
- [AI Paths Documentation](./docs/ai-paths/README.md)
