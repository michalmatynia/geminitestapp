# Project Information

This project is a comprehensive **multi-app platform** built on Next.js that integrates a **centralized admin dashboard** with a **user-facing frontend**, supported by a robust backend API. The platform is designed to manage complex product catalogs with support for multiple currencies, languages, tags, catalogs, AI-powered features, and integrations. It leverages modern web technologies to provide a clean, efficient, and type-safe development experience.

## Getting Started

To get the project up and running locally, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Set environment variables:**
    Update `.env` with your database and API keys. For local PostgreSQL:
    ```bash
    DATABASE_URL="postgresql://postgresuser@localhost:5432/stardb?schema=public"
    OPENAI_API_KEY="your-openai-api-key"
    IMAGEKIT_ID="your-imagekit-id"
    ```
3.  **Initialize the database:**
    ```bash
    npx prisma migrate dev
    ```
4.  **Seed the database with initial data:**
    ```bash
    npm run seed
    ```
5.  **Start the development server:**
    ```bash
    npm run dev
    ```
The application will be available at `http://localhost:3000`.

## Local Environment Notes

- **Database**: PostgreSQL (local). The Prisma client uses the Pg driver adapter.
- **.env**: Must include `DATABASE_URL`, `OPENAI_API_KEY`, `IMAGEKIT_ID`, and other API credentials.
- **Architecture**: The app uses route groups `(admin)` and `(frontend)` to separate admin and public interfaces.

## Postgres Setup (Local)

1. **Install PostgreSQL (Homebrew):**
   ```bash
   brew install postgresql@16
   ```
2. **Start the service:**
   ```bash
   brew services start postgresql@16
   ```
3. **Create role and database:**
   ```bash
   /usr/local/opt/postgresql@16/bin/createuser -s postgresuser
   /usr/local/opt/postgresql@16/bin/createdb -O postgresuser stardb
   ```

## Key Technologies

- **Framework**: Next.js 16+ (App Router) - Modern React framework with file-based routing and API routes
- **Language**: TypeScript - Full type safety across the application
- **Database ORM**: Prisma 7+ - Type-safe database access with PostgreSQL
- **UI Components**: 
  - **ShadCN/ui** - Copy-paste accessible component library built on Radix UI and Tailwind CSS
  - **Radix UI** - Headless, accessible component primitives (collapsible, select, dialog, dropdown, tabs, etc.)
- **Styling**: Tailwind CSS 4+ - Utility-first CSS with monochrome design
- **Form Handling**: React Hook Form + Zod - Efficient form state management with runtime validation
- **Data Display**: TanStack Table & TanStack Query - Powerful data grid and server state management
- **Rich Text Editing**: TipTap - WYSIWYG editor with extensions for tables, images, links, and task lists
- **Icons**: Lucide React - Clean, consistent SVG icons
- **Authentication**: NextAuth.js 5 - OAuth and credential-based authentication
- **File Upload**: ImageKit - Image optimization and delivery
- **AI Integration**: OpenAI API - GPT models for descriptions, translations, and content generation
- **Database Export**: pg (Node.js PostgreSQL driver) - For backup/restore operations
- **CSV Processing**: PapaParse - CSV parsing and generation
- **PDF Processing**: pdf-parse - PDF data extraction
- **Password Hashing**: bcryptjs - Secure password hashing
- **Testing**: Vitest + Playwright - Unit tests and E2E testing
- **Code Quality**: ESLint + Prettier - Linting and code formatting

## Architecture

This application is built as a **multi-app platform** with a clear separation between the admin dashboard and user-facing frontend, all backed by a unified API layer and shared business logic.

### App Structure (Route Groups)

- **`app/(admin)/`**: The centralized admin dashboard where administrators manage the entire system. Includes:
  - Product management with CRUD operations
  - Catalog organization and management
  - Currency and language configuration
  - Tag management
  - Import/export templates and bulk operations
  - AI job queue management and configuration
  - Draft management for products
  - Note management
  - File and image management
  - User preferences and settings
  - Integration management

- **`app/(frontend)/`**: The public-facing user interface for customers. Includes:
  - Product listings and discovery
  - Product detail pages
  - Search and filtering functionality
  - Multi-language and multi-currency support

- **`app/api/`**: The backend API layer providing RESTful endpoints for both admin and frontend applications. Organized by resource domain:
  - `/api/products/*` - Product CRUD and related operations
  - `/api/catalogs/*` - Catalog management
  - `/api/currencies/*` - Currency management
  - `/api/languages/*` - Language configuration
  - `/api/tags/*` - Tag management
  - `/api/files/*` - File and image operations
  - `/api/integrations/*` - Third-party integrations
  - `/api/drafts/*` - Draft management
  - `/api/notes/*` - Note operations
  - `/api/ai-config/*` - AI service configuration
  - `/api/settings/*` - Application settings
  - `/api/search/*` - Search functionality
  - `/api/cms/*` - CMS operations
  - And more specialized endpoints

### Core Layers

- **`lib/services/`**: Business logic layer containing domain-specific services:
  - `productService.ts` - Core product management logic
  - `productAiService.ts` - AI-powered product features
  - `productAiQueue.ts` - Job queue for async AI operations
  - `aiDescriptionService.ts` - Generates product descriptions using OpenAI
  - `aiTranslationService.ts` - Auto-translates product content
  - `import-template-repository.ts` - Manages import templates
  - `export-template-repository.ts` - Manages export templates
  - `product-repository/` - Data access layer for products
  - `catalog-repository/` - Data access layer for catalogs
  - `image-file-repository/` - Data access layer for images
  - `note-repository/` - Data access layer for notes
  - `integrations/` - Third-party integrations
  - And more specialized services

- **`lib/api.ts`**: Centralized client-side API call module for consistent communication between the frontend and API layer.

- **`lib/types.ts`** & **`lib/validations/`**: Central repositories for TypeScript type definitions and Zod schemas ensuring type safety across the application.

- **`lib/context/`**: React Context providers for state management:
  - `ProductFormContext.tsx` - Manages product form state
  - Other specialized contexts for different features

- **`lib/hooks/`**: Custom React hooks for reusable logic and state management.

- **`components/`**: Reusable UI component library built with ShadCN/ui and Radix UI:
  - **ShadCN/ui Components** (`components/ui/`): Copy-paste accessible components including:
    - `button.tsx` - Button variants for different use cases
    - `input.tsx` - Text input with Tailwind styling
    - `label.tsx` - Form label component
    - `dialog.tsx` - Modal dialog with accessibility features
    - `select.tsx` - Dropdown select component
    - `checkbox.tsx` - Checkbox input
    - `card.tsx` - Card container for content grouping
    - `avatar.tsx` - User avatar with fallback
    - `dropdown-menu.tsx` - Dropdown menu system
    - And more shared UI primitives
  - **Feature Components**: Higher-level components for specific features:
    - `ProductImageManager` - Handles image uploads and management
    - `FileManager` - Browsing and selecting existing files
    - `DataTable` - Generic table component powered by TanStack Table
    - `DebugPanel` - Development debugging interface
  - **Design**: All components follow the monochrome design aesthetic using Tailwind CSS utilities

- **`prisma/`**: Database schema, migrations, and seeding scripts.

## Data Model

Prisma is used as the ORM to interact with a PostgreSQL database. The data model is defined in `prisma/schema.prisma` and includes:

| Model                | Description                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `Product`            | Core entity representing a product with basic info, pricing, and inventory.                     |
| `Catalog`            | Represents product collections or categories.                                                    |
| `ProductCatalog`     | Join table for many-to-many relationship between products and catalogs.                         |
| `ImageFile`          | Represents image files that can be associated with products.                                    |
| `ProductImage`       | Join table for many-to-many relationship between products and images.                          |
| `Tag`                | Represents product tags for organization and filtering.                                        |
| `ProductTag`         | Join table for many-to-many relationship between products and tags.                            |
| `Currency`           | Supported currencies for pricing.                                                               |
| `Language`           | Supported languages for content.                                                                |
| `Country`            | Geographic data for localization.                                                               |
| `Note`               | Notes associated with products for internal communication.                                      |
| `Draft`              | Draft versions of products for review before publishing.                                       |
| `ImportTemplate`     | Custom templates for importing products from external sources.                                 |
| `ExportTemplate`     | Custom templates for exporting products to external systems.                                   |
| `Setting`            | Key-value store for application settings.                                                       |
| `Slug`               | URL slugs for CMS pages and content.                                                            |
| `Integration`        | Third-party integrations configuration and state.                                              |
| `User`               | Application users with role-based access control.                                              |
| `Account`            | OAuth account associations for authentication.                                                  |
| `Session`            | User session management.                                                                        |
| `VerificationToken`  | Email verification and password reset tokens.                                                  |
| `PriceGroup`         | Groupings for bulk pricing strategies.                                                          |
| `ChatbotSession`     | Sessions for AI chatbot interactions.                                                           |
| `PriceHistory`       | Historical tracking of product prices.                                                          |
| `UserPreferences`    | Individual user preferences and settings.                                                       |

## API Endpoints

The application exposes a comprehensive set of RESTful API endpoints organized by domain. All endpoints support JSON request/response formats and include proper error handling.

### Product Management
- **`GET /api/products`**: Fetches products with filtering, sorting, and pagination.
- **`POST /api/products`**: Creates a new product.
- **`GET /api/products/[id]`**: Fetches a single product by ID.
- **`PUT /api/products/[id]`**: Updates an existing product.
- **`DELETE /api/products/[id]`**: Deletes a product.
- **`GET /api/products/count`**: Returns total product count.
- **`GET /api/products/listings`**: Fetches public product listings.
- **`DELETE /api/products/[id]/images/[imageFileId]`**: Unlinks an image from a product.

### AI & Automation
- **`GET /api/ai-config`**: Retrieves AI service configuration.
- **`POST /api/ai-config`**: Updates AI service settings.
- **`GET /api/products/ai-jobs`**: Lists all AI processing jobs.
- **`POST /api/products/ai-jobs/enqueue`**: Enqueues a new AI job (description generation, translation, etc).
- **`GET /api/products/ai-jobs/[jobId]`**: Fetches specific job status.
- **`POST /api/products/ai-jobs/bulk`**: Bulk enqueues multiple AI jobs.
- **`POST /api/generate-description`**: Generates product descriptions using OpenAI.

### Catalog Management
- **`GET /api/catalogs`**: Fetches all catalogs.
- **`POST /api/catalogs`**: Creates a new catalog.
- **`GET /api/catalogs/[id]`**: Fetches a single catalog.
- **`PUT /api/catalogs/[id]`**: Updates a catalog.
- **`DELETE /api/catalogs/[id]`**: Deletes a catalog.

### Tags & Categories
- **`GET /api/products/tags`**: Fetches all product tags.
- **`POST /api/products/tags`**: Creates a new tag.
- **`PUT /api/products/tags/[id]`**: Updates a tag.
- **`DELETE /api/products/tags/[id]`**: Deletes a tag.

### Currencies & Languages
- **`GET /api/currencies`**: Fetches all currencies.
- **`POST /api/currencies`**: Creates a new currency.
- **`GET /api/languages`**: Fetches all languages.
- **`POST /api/languages`**: Creates a new language.
- **`GET /api/countries`**: Fetches all countries.

### File Management
- **`GET /api/files`**: Fetches image files with filtering and pagination.
- **`POST /api/files`**: Uploads a new image file.
- **`DELETE /api/files/[id]`**: Deletes an image file.

### Import/Export
- **`GET /api/products/imports/base`**: Fetches import templates.
- **`POST /api/products/imports/base`**: Creates an import template.
- **`GET /api/products/imports/base/parameters`**: Gets import parameters.
- **`GET /api/products/imports/base/active-template`**: Gets currently active import template.
- **`POST /api/import`**: Imports products from CSV or other formats.
- **`GET /api/products/exports/base`**: Fetches export templates.
- **`POST /api/products/exports/base`**: Creates an export template.
- **`GET /api/products/exports/base/default-inventory`**: Gets default export inventory.

### Drafts & Notes
- **`GET /api/drafts`**: Fetches product drafts.
- **`POST /api/drafts`**: Creates a draft.
- **`PUT /api/drafts/[id]`**: Updates a draft.
- **`DELETE /api/drafts/[id]`**: Deletes a draft.
- **`GET /api/notes`**: Fetches notes.
- **`POST /api/notes`**: Creates a note.
- **`PUT /api/notes/[id]`**: Updates a note.
- **`DELETE /api/notes/[id]`**: Deletes a note.

### Integrations
- **`GET /api/integrations`**: Fetches all integrations.
- **`POST /api/integrations`**: Creates a new integration.
- **`PUT /api/integrations/[id]`**: Updates an integration.
- **`DELETE /api/integrations/[id]`**: Deletes an integration.

### Search & Filtering
- **`GET /api/search`**: Global search across products and other entities.

### Settings & Configuration
- **`GET /api/settings`**: Fetches all application settings.
- **`POST /api/settings`**: Creates or updates a setting.
- **`GET /api/user`**: Fetches current user profile.
- **`POST /api/user/preferences`**: Updates user preferences.

### CMS & Public APIs
- **`GET /api/cms/slugs`**: Fetches all URL slugs.
- **`POST /api/cms/slugs`**: Creates a new slug.
- **`DELETE /api/cms/slugs/[id]`**: Deletes a slug.
- **`GET /api/public/*`**: Public endpoints for frontend access.

## Code Style and Conventions

- **Linting**: The project uses ESLint with the `next/core-web-vitals` configuration to enforce code quality and consistency.
- **Formatting**: Prettier is used for automatic code formatting.
- **Type Checking**: TypeScript is used for static type checking.

## New Features & Advanced Capabilities

### AI-Powered Features
- **Description Generation**: Automatically generate product descriptions using OpenAI with customizable prompts and model selection (GPT-3.5-turbo, GPT-4o).
- **Content Translation**: Auto-translate product content across supported languages using AI.
- **AI Job Queue**: Asynchronous job processing for long-running AI operations with status tracking and error handling.

### Component Library with ShadCN/ui
- **Copy-Paste Components**: All ShadCN/ui components are copy-pasted into the codebase, allowing for:
  - Full ownership and customization of every component
  - No component dependency lock-in
  - Easy modifications to match design system
  - Direct control over component behavior and styling
- **Built on Radix UI**: All components use Radix UI primitives for:
  - Accessibility compliance (WAI-ARIA)
  - Keyboard navigation support
  - Focus management
  - Screen reader compatibility
- **Styled with Tailwind CSS**: Components use utility classes for:
  - Consistent styling across the app
  - Easy theming and customization
  - Responsive design support
  - CSS variable-based theming
- **Available Components**:
  - Button, Input, Label, Dialog, Select, Checkbox, Card, Avatar, Dropdown Menu
  - Form components for product management
  - Data table components for efficient data display
  - Custom components: ProductImageManager, FileManager, DebugPanel

### Multi-Language & Multi-Currency Support
- Support for multiple languages with automatic content translation.
- Support for multiple currencies with dynamic pricing.
- Country-based localization.

### Catalog Management
- Organize products into multiple catalogs.
- Many-to-many relationships between products and catalogs.
- Tag-based product organization and filtering.

### Advanced Import/Export
- Custom import templates for flexible data ingestion from various sources.
- Custom export templates for integration with external systems.
- Bulk product import/export with template-based mapping.
- CSV import support with data validation.

### Draft Management
- Create and maintain draft versions of products before publishing.
- Review and edit drafts with full product information.
- Publish drafts to production catalog.

### Notes & Annotations
- Add internal notes to products for team communication.
- Track product-specific metadata and history.

### Integrations
- Third-party integration framework for connecting external systems.
- Extensible architecture for adding new integrations.

### User Authentication & Preferences
- NextAuth.js integration with OAuth and credential-based login.
- Role-based access control (planned).
- User preference storage and management.

### Database Management
- Backup and restore capabilities for data protection.
- Database integrity monitoring.

### CMS Features
- URL slug management for SEO-friendly content pages.
- Extensible CMS framework for content management.

### Search & Filtering
- Global search across products, catalogs, and other entities.
- Advanced filtering with multiple criteria.
- Full-text search support.

## Testing

The project includes comprehensive tests for the API endpoints, services, and UI components, written with Vitest and Playwright.

### Test Coverage Areas
- **Services**: Business logic unit tests for product, import, export, and AI services
- **API Endpoints**: Integration tests for all RESTful endpoints
- **Repositories**: Data access layer tests
- **UI Components**: Component behavior tests with React Testing Library
- **E2E Tests**: Critical user workflows with Playwright

### Running Tests
```bash
npm run test                 # Run all unit tests
npm run test:ui            # Run tests with UI dashboard
npm run test:coverage      # Generate coverage report
npm run test:e2e           # Run E2E tests
```

## Available Scripts

- **`npm run dev`**: Starts the Next.js development server with hot-reload.
- **`npm run build`**: Builds the Next.js application for production.
- **`npm run start`**: Starts the Next.js production server.
- **`npm run lint`**: Lints the codebase using ESLint.
- **`npm run seed`**: Seeds the database with initial data.
- **`npm run test`**: Runs the Vitest test suite.
- **`npm run test:ui`**: Runs tests with the Vitest UI dashboard.
- **`npm run test:coverage`**: Generates code coverage report.
- **`npm run test:e2e`**: Runs E2E tests with Playwright.

## Project-specific Coding Conventions and Architecture Patterns

This project follows a comprehensive set of coding conventions and architecture patterns to ensure consistency, maintainability, and scalability across the multi-app platform.

### Multi-App Architecture
- **Route Group Isolation**: The `(admin)` and `(frontend)` route groups are completely isolated, with separate layouts and navigation. They share a common backend API but have distinct UX paradigms.
- **Shared Backend**: All business logic and data access is shared through the `/api/` layer, preventing duplication and ensuring consistency.
- **Clear Separation of Concerns**: Admin-specific features do not leak into the public frontend, and vice versa.

### Component-Based Architecture with ShadCN/ui
- **Modular Components**: The application is built around small, focused, reusable components that can be easily composed to create complex UIs.
- **ShadCN/ui Foundation**: Leverages copy-pasted ShadCN/ui components for:
  - Accessibility-first design with Radix UI primitives
  - Consistent component library across the application
  - Full ownership and customization of every component
  - Easy styling with Tailwind CSS utility classes
- **Component Organization**: Components are organized by feature domain:
  - `components/ui/` - ShadCN/ui primitives (button, input, dialog, select, etc.)
  - `components/` - Feature-specific components (ProductImageManager, FileManager, DataTable)
  - App-specific components within route groups
- **Props-Driven Design**: Components accept props for configuration and callbacks for events, making them highly reusable.
- **Component Composition**: Build complex UIs by composing simple, single-responsibility components.

### Service Layer Pattern
- **Business Logic Encapsulation**: All business logic resides in `lib/services/` and is organized by domain (products, imports, exports, notes, etc.).
- **Repository Pattern**: Data access is abstracted through repository classes (`product-repository`, `catalog-repository`, etc.) that handle all database interactions.
- **Service Dependencies**: Services depend on repositories for data access, keeping them agnostic to database implementation details.
- **Error Handling**: Services include comprehensive try-catch blocks and error propagation for robust error handling.

### Styling with ShadCN/ui & Tailwind CSS
- **Copy-Paste Components**: All ShadCN/ui components are copied directly into the project, allowing:
  - Full control over component styling and behavior
  - No external component library dependencies
  - Easy customization for brand-specific needs
- **Utility-First Approach**: Leverage Tailwind's utility classes for rapid UI development while maintaining consistent styling.
- **Monochrome Design**: The application uses a primarily black, white, and gray color palette for a clean, professional aesthetic.
- **Responsive Design**: Build responsive UIs that work seamlessly across all screen sizes using Tailwind's responsive prefixes.
- **CSS Variables**: Use CSS custom properties for theming and consistent color management across components.
- **Accessibility**: All components follow WAI-ARIA guidelines and best practices for inclusive design.

### State Management
- **React Context**: Use Context for cross-component state that doesn't require global state (e.g., `ProductFormContext`).
- **TanStack Query**: Leverage `@tanstack/react-query` for server state management, caching, and synchronization.
- **Custom Hooks**: Create custom hooks (in `lib/hooks/`) to encapsulate stateful logic and make it reusable across components.

### Type Safety
- **TypeScript Everywhere**: All code is written in TypeScript with strict type checking enabled.
- **Centralized Types**: Custom types are defined in `lib/types.ts` or domain-specific type files.
- **Zod Schemas**: Use Zod for runtime validation schemas, co-located with types in `lib/validations/`.
- **API Response Types**: All API endpoints have strict type definitions for request and response payloads.

### Routing and Navigation
- **File-Based Routing**: Leverage Next.js file-based routing for intuitive route structures.
- **Route Groups**: Use route groups to organize related pages and APIs without affecting URL structure.
- **Dynamic Routes**: Use dynamic route segments for detail pages and resource-specific operations.

### API Design
- **RESTful Principles**: All APIs follow REST conventions with appropriate HTTP methods and status codes.
- **Thin API Layer**: API route handlers delegate to service classes, keeping them thin and focused.
- **Consistent Response Format**: All responses follow a consistent JSON structure with proper error information.
- **Input Validation**: All API inputs are validated using Zod schemas before processing.

### Database Access
- **Prisma ORM**: Use Prisma for type-safe database access with auto-generated types.
- **Repository Abstraction**: Repositories abstract the Prisma client and provide domain-specific queries.
- **Migration Strategy**: Use Prisma migrations for schema changes, tracked in version control.

### Naming Conventions
- **Components**: `PascalCase` for React components (e.g., `ProductForm`, `ImageManager`)
- **Hooks**: `camelCase` with `use` prefix (e.g., `useProducts`, `useProductForm`)
- **Services**: `camelCase` with descriptive names (e.g., `productService`, `importService`)
- **Files**: `kebab-case` for files (e.g., `product-form.tsx`, `use-products.ts`)
- **Directories**: `kebab-case` for directory names
- **Constants**: `UPPER_SNAKE_CASE` for constants

### Code Quality
- **Minimal Comments**: Code is self-documenting; comments are used only for clarification of non-obvious logic.
- **Early Returns**: Use early returns to reduce nesting and improve readability.
- **Error Boundaries**: Implement proper error handling and logging throughout the application.

### Testing Strategy
- **Unit Tests**: Test services, utilities, and pure functions with Vitest.
- **Integration Tests**: Test API routes with realistic request/response scenarios.
- **E2E Tests**: Use Playwright for critical user workflows.
- **Test Organization**: Tests are co-located with their source files or organized in `__tests__/` directory.

## Multi-App Platform Vision

This project is architected as an extensible **multi-app platform** where the current implementation represents the core product management system. The design enables seamless addition of new applications while maintaining a shared backend infrastructure.

### Current Application: Product Management System
- **Admin Dashboard**: Comprehensive product catalog management with advanced features
- **Frontend**: Public-facing product discovery and display interface
- **Shared Backend**: API layer handling all business logic and data operations

### Architecture for Future Apps
The platform is designed to support multiple independent applications, each with:
- **Dedicated Frontend Route Group** (e.g., `(admin)`, `(frontend)`, future: `(vendor)`, `(analytics)`)
- **Shared API Layer** at `/api/` for consistent data access
- **Shared Business Logic** in `lib/services/` to avoid duplication
- **Shared Database** via Prisma ORM with flexible schema

### Potential Future Applications
1. **Vendor Portal**: Independent interface for product suppliers to manage their inventory
2. **Analytics Dashboard**: Business intelligence and reporting interface
3. **B2B Portal**: Wholesale and bulk ordering interface
4. **Mobile API**: Dedicated API endpoints for mobile applications
5. **Marketplace Integration**: Multi-seller marketplace management
6. **Customer Portal**: User account and order management interface

### Key Design Principles for Multi-App Growth
- **Route Group Isolation**: Each app has its own route group with independent layouts and navigation
- **API-Driven Architecture**: All apps communicate through a unified RESTful API
- **Shared Services**: Business logic is centralized and reusable across all apps
- **Type Safety**: TypeScript ensures consistency across all apps
- **Database Agnosticity**: Prisma ORM supports multiple databases for different app deployments
- **Environment Separation**: Different apps can run in different environments (monolith or microservices)

### Adding a New Application
To add a new application to this platform:

1. **Create a new route group** in `app/(app-name)/`
2. **Implement app-specific pages** within the route group
3. **Leverage existing `/api/` endpoints** for data access
4. **Share components and utilities** from `lib/` and `components/`
5. **Add app-specific layouts** as needed
6. **Extend the database schema** if new entities are required
7. **Implement app-specific services** if unique business logic is needed

### Example: Adding a Vendor Portal
```
app/(vendor)/
├── layout.tsx
├── dashboard/
│   └── page.tsx
├── products/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx
└── settings/
    └── page.tsx
```

The vendor portal would share the same `/api/products`, `/api/catalogs`, etc., endpoints while having a completely different UI and UX tailored to vendor needs.

## Development Workflow for Multi-App Maintenance

### When Adding Features
- **If API-related**: Add to `/api/` and relevant services in `lib/services/`
- **If UI-related**: Create components in `components/` or use existing ones
- **If app-specific**: Implement within the app's route group
- **If shared logic**: Extract to `lib/services/` or custom hooks

### When Modifying Core Services
- Run tests to ensure backward compatibility
- Update API documentation
- Verify all apps still function correctly
- Update this document if architecture changes

### Database Migrations
- Use Prisma migrations for schema changes
- Test migrations with all apps' usage patterns
- Document schema changes and their impact on apps

### Dependencies and Versioning
- Keep all dependencies updated across the platform
- Use `package.json` overrides to enforce consistent versions
- Test all apps after major dependency upgrades

## ShadCN/ui Component Library

This project leverages **ShadCN/ui** to provide a comprehensive, accessible component library. All ShadCN/ui components are copy-pasted directly into `components/ui/`, giving you full control over their implementation.

### What is ShadCN/ui?

ShadCN/ui is a collection of beautiful, accessible React components built on top of Radix UI and styled with Tailwind CSS. Unlike traditional component libraries, ShadCN/ui components are meant to be copied and customized rather than installed as dependencies.

### Benefits of ShadCN/ui in This Project

1. **Full Ownership**: Components live in your codebase (`components/ui/`), not in node_modules
2. **Customization**: Modify any component to match your design system without waiting for library updates
3. **No Lock-in**: If you need to change a component, you can do so freely
4. **Type Safe**: All components are written in TypeScript with full type support
5. **Accessible**: Built on Radix UI primitives with WAI-ARIA compliance
6. **Tailwind Styled**: Uses Tailwind CSS utilities for consistent, responsive styling

### Available ShadCN/ui Components

Located in `components/ui/`:

| Component | Purpose | Location |
|-----------|---------|----------|
| `button.tsx` | Interactive button with variants | `components/ui/button.tsx` |
| `input.tsx` | Text input field | `components/ui/input.tsx` |
| `label.tsx` | Form label element | `components/ui/label.tsx` |
| `dialog.tsx` | Modal dialog component | `components/ui/dialog.tsx` |
| `select.tsx` | Dropdown select input | `components/ui/select.tsx` |
| `checkbox.tsx` | Checkbox input | `components/ui/checkbox.tsx` |
| `card.tsx` | Card container | `components/ui/card.tsx` |
| `avatar.tsx` | User avatar with fallback | `components/ui/avatar.tsx` |
| `dropdown-menu.tsx` | Dropdown menu | `components/ui/dropdown-menu.tsx` |

### Using ShadCN/ui Components

#### Example: Button Component

```tsx
import { Button } from "@/components/ui/button"

export default function MyPage() {
  return (
    <Button variant="default" size="lg">
      Click Me
    </Button>
  )
}
```

#### Example: Dialog Component

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function MyModal() {
  const [open, setOpen] = useState(false)
  
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Dialog</Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
          <p>Dialog content goes here</p>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

#### Example: Form with Input and Label

```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function MyForm() {
  return (
    <form className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email"
          className="mt-2"
        />
      </div>
      <Button type="submit">Submit</Button>
    </form>
  )
}
```

### Adding New ShadCN/ui Components

If you need a component that doesn't exist yet, you can add it using the ShadCN/ui CLI:

```bash
npx shadcn-ui@latest add [component-name]
# Examples:
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add textarea
```

Available components from the ShadCN/ui registry: `alert`, `alert-dialog`, `accordion`, `aspect-ratio`, `badge`, `calendar`, `carousel`, `checkbox`, `collapsible`, `combobox`, `command`, `context-menu`, `data-table`, `date-picker`, `dropdown-menu`, `form`, `input`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `scroll-area`, `searchable-combobox`, `select`, `separator`, `sheet`, `skeleton`, `slider`, `switch`, `table`, `tabs`, `textarea`, `toast`, `tooltip`, `tree-view`, and more.

### Customizing ShadCN/ui Components

All ShadCN/ui components can be customized. For example, to modify button styles:

1. Open `components/ui/button.tsx`
2. Adjust Tailwind classes or add new variants
3. Update the component as needed

```tsx
// Example: Adding a custom variant
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Add custom variants here
        premium: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700",
      },
    },
  }
)
```

### ShadCN/ui with TypeScript

All components include full TypeScript support. Component props are properly typed:

```tsx
import { Button } from "@/components/ui/button"
import { FC, ReactNode } from "react"

const MyComponent: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <Button 
      variant="default"      // ✅ Properly typed
      size="lg"              // ✅ Properly typed
      onClick={() => {}}     // ✅ Properly typed
    >
      {children}
    </Button>
  )
}
```

### Best Practices

1. **Composition**: Combine smaller components to create complex UIs
2. **Type Safety**: Leverage TypeScript for all component prop definitions
3. **Accessibility**: Always include proper ARIA labels and semantic HTML
4. **Consistency**: Use existing components before creating new ones
5. **Customization**: Modify components in `components/ui/` as needed for your design system
6. **Documentation**: Document any customizations or new variants you add to components

### ShadCN/ui Resources

- **Official Documentation**: https://ui.shadcn.com/
- **Component Examples**: https://ui.shadcn.com/components
- **GitHub Repository**: https://github.com/shadcn-ui/ui
- **Radix UI Docs**: https://www.radix-ui.com/ (underlying primitives)
- **Tailwind CSS Docs**: https://tailwindcss.com/ (styling framework)
