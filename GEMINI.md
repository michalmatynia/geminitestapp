# Project Information

This project is a Next.js application designed as a monochrome admin dashboard with full CRUD (Create, Read, Update, Delete) capabilities for managing products. It leverages modern web technologies to provide a clean, efficient, and type-safe development experience. It also features a user-facing frontend to display the products.

## Getting Started

To get the project up and running locally, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Set environment variables:**
    Update `.env` with your database and API keys. For local Postgres:
    ```bash
    DATABASE_URL="postgresql://postgresuser@localhost:5432/stardb?schema=public"
    PG_DUMP_PATH="/usr/local/opt/postgresql@16/bin/pg_dump"
    PG_RESTORE_PATH="/usr/local/opt/postgresql@16/bin/pg_restore"
    ```
3.  **Initialize the database:**
    ```bash
    npx prisma migrate dev --name init
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
- **pg_dump/pg_restore**: Required for the Database admin page. Configure `PG_DUMP_PATH` and `PG_RESTORE_PATH` in `.env` if Postgres is keg-only (Homebrew).
- **.env**: Must include `DATABASE_URL`, `IMAGEKIT_ID`, `OPENAI_API_KEY`, and the pg tool paths when needed.

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

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database ORM**: Prisma (PostgreSQL)
- **UI Components**: Radix UI (headless components for accessibility), including `@radix-ui/react-collapsible` and `@radix-ui/react-select`
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **Form Handling**: React Hook Form with Zod for schema validation
- **Data Display**: TanStack Table (for efficient and flexible table rendering)
- **Icons**: Lucide React
- **Testing**: Jest (testing framework)
- **AI**: OpenAI API for description generation

## Architecture

This application follows a modular architecture that separates concerns and promotes maintainability.

- **`app/`**: Contains the pages and API routes, following the Next.js App Router conventions. The app is split into two route groups:
  - **`app/(admin)/`**: The main UI for the admin dashboard, featuring a panel-based layout with foldable sections for managing products, files, and application settings.
  - **`app/(frontend)/`**: The user-facing pages, including the homepage and product detail pages.
  - **`app/api/`**: Houses the backend API endpoints, which are now thin wrappers around the business logic in the `productService`.
- **`components/`**: Reusable UI components, including a `DebugPanel` for development, a `ProductImageManager` for handling image uploads, and a `FileManager` for browsing and selecting existing images. The `data-table.tsx` and `columns.tsx` files provide a generic, reusable table component powered by TanStack Table.
- **`lib/`**: Contains the core business logic, utilities, and type definitions.
  - **`lib/services/productService.ts`**: A dedicated service file that encapsulates all business logic for managing products, including creating, updating, deleting, and linking images to products.
  - **`lib/api.ts`**: A centralized module for all client-side API calls.
  - **`lib/types.ts`**: A central repository for all custom TypeScript types.
  - **`lib/context/ProductFormContext.tsx`**: A React context that provides a centralized place for managing the state and logic of the product form.
- **`prisma/`**: The Prisma schema definition, migrations, and database seeding script.
- **`__tests__/`**: Unit and integration tests for the API endpoints.

## Data Model

Prisma is used as the ORM to interact with a PostgreSQL database. The data model is defined in `prisma/schema.prisma` and includes the following models:

| Model           | Description                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Product`       | Represents a product in the catalog.                                                                                                           |
| `ImageFile`     | Represents an image file that can be associated with one or more products.                                                                     |
| `ProductImage`  | A join table that creates a many-to-many relationship between `Product` and `ImageFile`.                                                       |
| `Setting`       | A key-value store for application settings.                                                                                                    |
| `Slug`          | Represents a URL slug for a CMS page.                                                                                                          |

## API Endpoints

The application exposes a set of RESTful API endpoints for managing products and fetching connection logs.

- **`GET /api/products`**: Fetches a list of products with filtering options.
- **`POST /api/products`**: Creates a new product.
- **`GET /api/products/[id]`**: Fetches a single product by its ID.
- **`PUT /api/products/[id]`**: Updates an existing product.
- **`DELETE /api/products/[id]`**: Deletes a product.
- **`DELETE /api/products/[id]/images/[imageFileId]`**: Unlinks an image from a product.
- **`GET /api/files`**: Fetches a list of image files with filtering options.
- **`DELETE /api/files/[id]`**: Deletes an image file.
- **`POST /api/generate-description`**: Generates a product description based on the product name and other attributes.
- **`POST /api/import`**: Imports products from a CSV file.
- **`GET /api/settings`**: Fetches all application settings.
- **`POST /api/settings`**: Creates or updates an application setting.
- **`POST /api/databases/upload`**: Uploads a `.dump` backup file.
- **`POST /api/databases/backup`**: Creates a new database backup via `pg_dump`.
- **`GET /api/databases/backups`**: Fetches a list of all database backups.
- **`POST /api/databases/restore`**: Restores a database backup via `pg_restore`.
- **`POST /api/databases/delete`**: Deletes a database backup.
- **`GET /api/cms/slugs`**: Fetches a list of all slugs.
- **`POST /api/cms/slugs`**: Creates a new slug.
- **`DELETE /api/cms/slugs/[id]`**: Deletes a slug.

## Code Style and Conventions

- **Linting**: The project uses ESLint with the `next/core-web-vitals` configuration to enforce code quality and consistency.
- **Formatting**: Prettier is used for automatic code formatting.
- **Type Checking**: TypeScript is used for static type checking.

## New Features

- **AI-Powered Description Generation:** The admin dashboard now features a tool to generate product descriptions using the OpenAI API. This feature is highly customizable, allowing users to:
    - Select the AI model (`gpt-3.5-turbo` or `gpt-4o`).
    - Define a custom prompt with placeholders for product attributes (e.g., `[name]`, `[price]`).
    - Include product images in the prompt for vision-capable models.
- **Database Management:** The admin dashboard includes a database management page where users can:
    - Create and restore PostgreSQL backups (custom `.dump` format).
    - Upload and delete backup files stored under `prisma/backups/`.
- **SKU Search:** The product list page now includes a search field for filtering products by SKU.
- **CMS Slug Management:** The admin dashboard now includes a basic CMS for managing URL slugs.
- **Frontend/Admin Split:** The application has been restructured into separate frontend and admin sections, each with its own layout and navigation.
- **Modular Business Logic:** The backend logic has been refactored into a dedicated `productService` for improved maintainability and testability.
- **Centralized API Calls:** All client-side `fetch` calls have been consolidated into `lib/api.ts`.
- **Decomposed Components:** The `ProductForm` has been broken down into smaller, more focused components like `ProductImageManager`.
- **Debugging Features:** A `DebugPanel` can be activated with the `?debug=true` query parameter to provide real-time insights into the product form's state.

## Testing

The project includes a suite of tests for the API endpoints, written with Jest. The tests cover the following areas:
- **Products API:** Tests for creating, reading, updating, and deleting products, as well as filtering and image linking.
- **Files API:** Tests for fetching and deleting files.
- **Databases API:** Tests for creating, restoring, uploading, and deleting database backups.
- **AI Description Generation API:** Tests for the AI description generation feature, including prompt customization and error handling.

## Available Scripts

- **`npm run dev`**: Starts the Next.js development server.
- **`npm run build`**: Builds the Next.js application for production.
- **`npm run start`**: Starts the Next.js production server.
- **`npm run test`**: Runs the Jest test suite.
- **`npm run seed`**: Seeds the database with initial data.
- **`npm run lint`**: Lints the codebase.

## Project-specific Coding Conventions and Architecture Patterns

This project follows a set of coding conventions and architecture patterns to ensure consistency, maintainability, and scalability.

- **Component-Based Architecture**: The application is built around a component-based architecture, which emphasizes modularity and reusability. The UI is broken down into smaller, independent components that can be easily composed to create complex user interfaces.

- **Styling with Tailwind CSS**: The project uses a utility-first approach to styling, with a preference for inline classes over custom CSS files. This approach allows for rapid development and easy maintenance of the application's visual identity.

- **State Management with React Context and Hooks**: The application uses React Context and Hooks to manage the state of the admin menu. The menu's state is centralized in `AdminLayoutContext`, and custom hooks are used to access and modify the state from different components.

- **Routing and Navigation**: The application uses Next.js's file-based routing system, which simplifies the creation of new pages and API routes. The `useRouter` hook is used for programmatic navigation between pages.

- **API Communication**: Most client-side API calls are centralized in `lib/api.ts`; some admin flows still use direct `fetch` in page components.

- **Type Safety with TypeScript**: The project enforces type safety with TypeScript, using interfaces for props and API responses. This helps to prevent common errors and improve the overall quality of the code.

- **Separation of Concerns**: The application follows the principle of separation of concerns, with business logic residing in `lib/services` and UI components in `components`. This separation makes the codebase easier to understand, test, and maintain.

- **Naming Conventions**: The project follows standard naming conventions for React components, hooks, and files. Components are named in `PascalCase`, hooks are named in `camelCase` with a `use` prefix, and files are named in `kebab-case` or `PascalCase` depending on their content.
