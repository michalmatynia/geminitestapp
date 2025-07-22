# Project Information

This project is a Next.js application designed as a monochrome admin dashboard with full CRUD (Create, Read, Update, Delete) capabilities for managing products. It leverages modern web technologies to provide a clean, efficient, and type-safe development experience.

## Key Technologies

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database ORM**: Prisma (with SQLite for development/testing)
- **Real-time Communication**: WebSocket (`ws` library)
- **UI Components**: Radix UI (headless components for accessibility), including `@radix-ui/react-collapsible`
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **Form Handling**: React Hook Form with Zod for schema validation
- **Data Display**: TanStack Table (for efficient and flexible table rendering)
- **Icons**: Lucide React
- **Testing**: Jest (testing framework)

## Architecture

This application follows a modular architecture that separates concerns and promotes maintainability.

- **`server.cjs`**: A custom Node.js server that runs the Next.js application and a WebSocket server for real-time communication.
- **`app/`**: Contains the pages and API routes, following the Next.js App Router conventions.
  - **`app/admin/`**: The main UI for the admin dashboard, featuring a panel-based layout with foldable sections.
  - **`app/api/`**: Houses the backend API endpoints, which are now thin wrappers around the business logic in the `productService`.
- **`components/`**: Reusable UI components, including a `DebugPanel` for development and a `ProductImageManager` for handling image uploads.
- **`lib/`**: Contains the core business logic, utilities, and type definitions.
  - **`lib/services/productService.ts`**: A dedicated service file that encapsulates all business logic for managing products.
  - **`lib/api.ts`**: A centralized module for all client-side API calls.
  - **`lib/types.ts`**: A central repository for all custom TypeScript types.
- **`prisma/`**: The Prisma schema definition, migrations, and database seeding script.
- **`__tests__/`**: Unit and integration tests for the API endpoints.

## Data Management

Prisma is used as the ORM to interact with a SQLite database. The data model includes `Product`, `ImageFile`, `ProductImage`, and a new `ConnectionLog` model for tracking user connections.

## API Endpoints

The application exposes a set of RESTful API endpoints for managing products and fetching connection logs.

- **`GET /api/products`**: Fetches a list of products with filtering options.
- **`POST /api/products`**: Creates a new product.
- **`GET /api/products/[id]`**: Fetches a single product by its ID.
- **`PUT /api/products/[id]`**: Updates an existing product.
- **`DELETE /api/products/[id]`**: Deletes a product.
- **`DELETE /api/products/[id]/images/[imageFileId]`**: Unlinks an image from a product.
- **`GET /api/connections`**: Fetches the latest connection logs.

## New Features

- **Live Connections Dashboard:** The admin dashboard now features a real-time panel that displays the number of active WebSocket connections and a table of the latest connection logs.
- **Modular Business Logic:** The backend logic has been refactored into a dedicated `productService` for improved maintainability and testability.
- **Centralized API Calls:** All client-side `fetch` calls have been consolidated into `lib/api.ts`.
- **Decomposed Components:** The `ProductForm` has been broken down into smaller, more focused components like `ProductImageManager`.
- **Debugging Features:** A `DebugPanel` can be activated with the `?debug=true` query parameter to provide real-time insights into the product form's state.

## Available Scripts

- **`npm run dev`**: Starts the custom Node.js server with the WebSocket server for development.
- **`npm run build`**: Builds the Next.js application for production.
- **`npm run start`**: Starts the custom Node.js server for production.
- **`npm run test`**: Runs the Jest test suite.
- **`npm run seed`**: Seeds the database with initial data.
- **`npm run lint`**: Lints the codebase.