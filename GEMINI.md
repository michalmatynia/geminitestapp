# Project Information

This project is a Next.js application designed as a monochrome admin dashboard with full CRUD (Create, Read, Update, Delete) capabilities for managing products. It leverages modern web technologies to provide a clean, efficient, and type-safe development experience.

## Getting Started

To get the project up and running locally, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Initialize the database:**
    ```bash
    npx prisma migrate dev
    ```
3.  **Seed the database with initial data:**
    ```bash
    npm run seed
    ```
4.  **Start the development server:**
    ```bash
    npm run dev
    ```
The application will be available at `http://localhost:3000`.

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
  - **`app/admin/`**: The main UI for the admin dashboard, featuring a panel-based layout with foldable sections for managing products, files, and application settings.
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

Prisma is used as the ORM to interact with a SQLite database. The data model is defined in `prisma/schema.prisma` and includes the following models:

| Model           | Description                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Product`       | Represents a product in the catalog.                                                                                                           |
| `ImageFile`     | Represents an image file that can be associated with one or more products.                                                                     |
| `ProductImage`  | A join table that creates a many-to-many relationship between `Product` and `ImageFile`.                                                       |
| `Setting`       | A key-value store for application settings.                                                                                                    |
| `ConnectionLog` | A log of user connections to the WebSocket server.                                                                                             |

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
- **`GET /api/connections`**: Fetches the latest connection logs.
- **`POST /api/generate-description`**: Generates a product description based on the product name.
- **`POST /api/import`**: Imports products from a CSV file.
- **`GET /api/settings`**: Fetches all application settings.
- **`POST /api/settings`**: Creates or updates an application setting.

## Code Style and Conventions

- **Linting**: The project uses ESLint with the `next/core-web-vitals` configuration to enforce code quality and consistency.
- **Formatting**: Prettier is used for automatic code formatting.
- **Type Checking**: TypeScript is used for static type checking.

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