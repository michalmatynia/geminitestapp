# Project Information

This project is a Next.js application designed as a monochrome admin dashboard with full CRUD (Create, Read, Update, Delete) capabilities for managing products. It leverages modern web technologies to provide a clean, efficient, and type-safe development experience.

## Key Technologies

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database ORM**: Prisma (with SQLite for development/testing)
- **UI Components**: Radix UI (headless components for accessibility)
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **Form Handling**: React Hook Form with Zod for schema validation
- **Data Display**: TanStack Table (for efficient and flexible table rendering)
- **Icons**: Lucide React
- **Image Management**: ImageKit (integrated for potential future image handling)
- **Testing**: Jest (testing framework) and Supertest (for HTTP assertions)

## Architecture

This application follows the Next.js App Router architecture, organizing code logically:

- **`app/`**: Contains pages and API routes. Pages are responsible for rendering UI, while API routes (`app/api/`) handle backend logic and data interactions.
  - **`app/admin/`**: Contains the UI for the admin dashboard.
    - **`app/admin/layout.tsx`**: Layout for the admin section.
    - **`app/admin/page.tsx`**: Admin dashboard homepage.
    - **`app/admin/files/page.tsx`**: UI for the file manager.
    - **`app/admin/products/`**: Product management UI.
      - **`app/admin/products/page.tsx`**: Lists all products.
      - **`app/admin/products/create/page.tsx`**: UI for creating a new product.
      - **`app/admin/products/[id]/page.tsx`**: Displays details of a single product.
      - **`app/admin/products/[id]/edit/page.tsx`**: UI for editing an existing product.
  - **`app/api/`**: Houses the backend API endpoints.
    - **`app/api/files/route.ts`**: API endpoint for fetching all image files.
    - **`app/api/files/[id]/route.ts`**: API endpoint for deleting a specific image file.
    - **`app/api/products/route.ts`**: API endpoint for fetching all products and creating new products.
    - **`app/api/products/[id]/route.ts`**: API endpoint for fetching, updating, and deleting a single product.
    - **`app/api/products/[id]/images/[imageFileId]/route.ts`**: API endpoint for disconnecting a specific image from a product.
- **`components/`**: Reusable UI components, including shared UI elements (`components/ui/`) built with Radix UI and styled with Tailwind CSS.
- **`lib/`**: Utility functions and helper modules.
  - **`lib/api.ts`**: Client-side API interaction utilities.
  - **`lib/utils.ts`**: General utility functions.
  - **`lib/generated/prisma/`**: Contains the generated Prisma client.
  - **`lib/utils/productUtils.ts`**: Product-specific utility functions.
  - **`lib/validations/product.ts`**: Zod schemas for product data validation.
- **`prisma/`**: Prisma schema definition (`schema.prisma`) and database seeding script (`seed.js`).
- **`__tests__/`**: Contains unit and integration tests.
  - **`__tests__/api/files.test.ts`**: Tests for the file management API endpoints.
  - **`__tests__/api/products.test.ts`**: Tests for the product management API endpoints.

## Data Management

Prisma is used as the Object-Relational Mapper (ORM) to interact with the database. The `Product` model is defined in `prisma/schema.prisma`, and the application uses SQLite for local development and testing. Database migrations are managed via Prisma Migrate.

### Product Data Model

The `Product` model has the following fields:
- `id`: Unique identifier (String, auto-generated with `cuid()`)
- `name`: Product name (String)
- `price`: Product price (Integer)
- `createdAt`: Timestamp of creation (DateTime, defaults to now)
- `updatedAt`: Timestamp of last update (DateTime, updates automatically)
- `images`: A relation to `ProductImage[]` representing associated images.

The `ImageFile` model has been extended with `width` and `height` fields to store image dimensions.

### Database Seeding

The `npm run seed` script populates the database with initial product data for development and testing purposes.

## API Endpoints

The application exposes the following RESTful API endpoints for product management:

- **`GET /api/products`**:
  - Fetches all products.
  - Supports optional query parameters for filtering: `search` (by name), `minPrice`, `maxPrice`, `startDate`, `endDate`.
- **`POST /api/products`**:
  - Creates a new product.
  - Requires `name` (string) and `price` (number) in the request body.
- **`GET /api/products/[id]`**:
  - Fetches a single product by its `id`.
- **`PUT /api/products/[id]`**:
  - Updates an existing product by its `id`.
  - Requires `name` (string) and `price` (number) in the request body.
- **`DELETE /api/products/[id]`**:
  - Deletes a product by its `id`.
- **`DELETE /api/products/[productId]/images/[imageFileId]`**:
  - Disconnects a specific image from a product by deleting the `ProductImage` entry. The `ImageFile` and `Product` entries are not deleted.

## New Features

### File Manager

A new feature will be implemented to manage all uploaded image files. This includes:

- **Overview**: A dedicated section to view all uploaded image files.
- **Search Functionality**:
  - **By Filename**: Users can search for image files using their filenames.
  - **By Associated Product**: Users can search for image files based on the product they are linked to, leveraging the `ProductImage` and `Product` models to establish the association.

#### File Manager API Endpoints

- **`GET /api/files`**:
  - Fetches all image files.
  - Supports optional query parameters for filtering: `filename` (by filename), `productId` (by associated product ID), `productName` (by associated product name).
- **`DELETE /api/files/[id]`**:
  - Deletes a specific image file by its `id`. This will also remove any associations with products.

#### File Manager UI

- A new page will be created under `app/admin/files` to provide the user interface for the file manager.

## Styling

The application adopts a strict monochrome design, utilizing shades of black, white, and gray for all visual elements. Tailwind CSS is the primary styling framework, enabling rapid UI development with utility classes. This approach ensures a consistent and minimalist aesthetic throughout the application.

## Type Safety

TypeScript is integrated throughout the entire application to ensure strong type safety. This includes:

- **API Routes**: Explicit types for request bodies, query parameters, and response data.
- **React Components**: Type definitions for component props and state.
- **Data Models**: Prisma generates TypeScript types directly from the database schema, ensuring consistency between the database and application code.

## Testing

API tests are implemented using Jest and Supertest to ensure the backend endpoints function correctly and reliably. Tests cover:

- Fetching all products.
- Filtering products by search terms.
- Creating new products (including with image uploads).
- Updating existing products (including with new image uploads).
- Deleting products.
- Disconnecting images from products.

To run tests, ensure the Next.js development server is *not* running, as tests directly import and execute API route handlers. Tests can be executed using `npm run test`.

## Available Scripts

- `npm run dev`: Starts the Next.js development server with Turbopack for fast compilation.
- `npm run build`: Builds the application for production deployment.
- `npm run start`: Starts the Next.js production server.
- `npm run lint`: Runs ESLint to enforce code quality and style guidelines.
- `npm run seed`: Executes the Prisma seed script to populate the database.
- `npm run test`: Runs Jest tests for API endpoints.

## Conventions

- **Code Style**: Adhere to the existing code style and formatting conventions, enforced by ESLint and Prettier.
- **TypeScript Usage**: All new code should be written in TypeScript, leveraging its features for robust and maintainable code.
- **Component Organization**: Components are logically grouped within the `components/` directory, with generic UI components in `components/ui/`.
- **API Routes**: Follow Next.js API route conventions for defining backend endpoints.
- **Monochrome Design**: Maintain the monochrome color palette and minimalist design principles across all UI elements.