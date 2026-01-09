## Brief overview
Project-specific coding conventions and architecture patterns for a Next.js 15 application with TypeScript, Prisma, Tailwind CSS, and shadcn/ui components. This application features a complex admin/CMS system with product management, file handling, and database operations.

## Tech stack preferences
- Use Next.js 15 with App Router architecture
- TypeScript with strict configuration (noImplicitAny, strictNullChecks enabled)
- Prisma ORM with SQLite database for development
- Tailwind CSS with shadcn/ui component library
- React Hook Form with Zod validation schemas
- Custom server implementation using Hono framework
- Jest for testing with TypeScript support
- ImageKit for image management and optimization

## Architecture patterns
- Implement service layer pattern for business logic (e.g., `productService.ts`)
- Use React Context providers for complex state management
- Organize routes using Next.js route groups: `(admin)` and `(frontend)`
- Separate API routes by feature in dedicated directories
- Implement many-to-many relationships using Prisma join tables
- Use compound component patterns for complex UI components
- Abstract file operations into utility services

## Code organization
- Place business logic in `lib/services/` directory
- Store validation schemas in `lib/validations/` directory
- Keep utility functions in `lib/utils/` directory
- Organize components by feature in dedicated subdirectories
- Use `lib/context/` for React Context providers
- Store type definitions in `lib/types.ts`
- Place database schema in `prisma/schema.prisma`

## Naming conventions
- Use camelCase for variables, functions, and object properties
- Use PascalCase for React components, types, and interfaces
- Use kebab-case for file names and directory names
- Use descriptive names for API routes following REST conventions
- Prefix custom hooks with "use" (e.g., `useProductFormContext`)
- Use meaningful JSDoc comments for service functions

## Database design patterns
- Use `cuid()` for primary keys in Prisma models
- Include `createdAt` and `updatedAt` timestamps on all models
- Implement join tables for many-to-many relationships (e.g., `ProductImage`, `PageSlug`)
- Use cascade deletion for dependent records
- Store JSON data in dedicated `Json` fields for flexible content
- Use nullable fields with `?` for optional database columns

## API conventions
- Implement RESTful API routes with proper HTTP methods (GET, POST, PUT, DELETE)
- Use NextResponse for consistent API responses
- Implement comprehensive error handling with try-catch blocks
- Return meaningful error messages with appropriate HTTP status codes
- Use FormData for file uploads and multipart data
- Validate request data using Zod schemas before processing

## Component patterns
- Use "use client" directive for client-side components that need interactivity
- Implement proper TypeScript interfaces for component props
- Use React.forwardRef for components that need ref forwarding
- Include proper ARIA attributes for accessibility
- Handle loading and error states in UI components
- Use controlled components with React Hook Form for forms

## Styling conventions
- Use Tailwind CSS utility classes for styling
- Implement the `cn()` utility function for conditional className merging
- Use CSS custom properties for theme colors (e.g., `hsl(var(--primary))`)
- Follow shadcn/ui component patterns with class-variance-authority
- Use Tailwind's responsive design utilities
- Implement dark mode support using next-themes

## Validation approach
- Use Zod schemas for all data validation
- Implement coercion for number fields (e.g., `z.coerce.number()`)
- Use `.nullish()` for optional fields that can be null or undefined
- Provide meaningful error messages in validation schemas
- Validate both client-side and server-side data

## Error handling
- Implement try-catch blocks in all API routes
- Return appropriate HTTP status codes (400, 404, 500)
- Provide user-friendly error messages in UI components
- Use proper TypeScript error typing with `unknown` type
- Handle both known and unknown error types gracefully

## Testing conventions
- Use Jest with TypeScript configuration
- Place tests in `__tests__/` directory mirroring source structure
- Test API routes using supertest and node-mocks-http
- Include both unit and integration tests
- Use descriptive test names and organize with describe blocks
