# Type Naming and Pattern Conventions

This document defines the naming standards, file structure, and design patterns for all DTOs and type contracts in `src/shared/contracts/`.

## Naming Conventions

### DTO Naming Pattern

#### Request DTOs (Input)

For API requests, form submissions, and function arguments:

```typescript
// Pattern: [Action][Resource]Request
// or: [Resource][Action]Input
// or: [Resource]Payload

CreateProductRequest // API POST /api/products
UpdateProductRequest // API PUT /api/products/:id
DeleteProductRequest // API DELETE /api/products/:id

// Alternative with suffix
GetProductInput
ProcessProductPayload
```

**Examples:**
```typescript
CreateUserRequest
UpdateUserRequest
BulkImportProductsRequest
QueryProductsRequest
RegisterUserInput
ProcessImagePayload
```

#### Response DTOs (Output)

For API responses, function returns, and data containers:

```typescript
// Pattern: [Resource]Response
// or: [Resource]Output
// or: [Resource]Dto

ProductResponse
UserResponse
UserListResponse
ProductDetailResponse

// Alternative with suffix
ProductOutput
CreateUserDto
```

**Examples:**
```typescript
UserResponse
ProductListResponse
ProductDetailResponse
AIPathRunResponse
ChatbotMessageResponse
```

#### Entity Interfaces (Core Domain Types)

For core domain entities that may be used in multiple request/response types:

```typescript
// Pattern: [Resource] (no suffix)
// Used as the "canonical" form of data

interface Product {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
}

interface User {
  id: string;
  email: string;
  name: string;
}
```

**When to use:**
- Core domain entities (User, Product, Order)
- Data from database queries
- Shared across multiple request/response types

#### Zod Schema Naming

For runtime validation schemas:

```typescript
// Pattern: [resource][action]Schema or [resource]Schema

export const createProductSchema = z.object({
  name: z.string(),
  price: z.number(),
});

export const updateUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
});
```

**Naming convention:**
- lowercase with camelCase
- suffix with `Schema`
- use action prefix for request schemas: `createProductSchema`
- use resource only for entity schemas: `productSchema`

### File Naming

File names should match the primary type or schema they contain:

```typescript
// src/shared/contracts/forms/create-product.ts
// Contains: createProductSchema, CreateProductRequest, ProductResponse

// src/shared/contracts/hooks/use-products.ts
// Contains: UseProductsHook, UseProductsOptions

// src/shared/contracts/context/user-settings.ts
// Contains: UserSettingsContextValue

// src/shared/contracts/kangur-repositories/product-repository.ts
// Contains: ProductRepository interface
```

**Patterns:**
- Use kebab-case for file names
- Singular noun for entity files: `user.ts`, not `users.ts`
- Action-first for request types: `create-product.ts`, not `product-create.ts`
- Match the primary exported symbol loosely to the file name

### Generic Type Placeholders

When creating generic/template types:

```typescript
// Pattern: T, K, V for generics
// Pattern: [Resource]T for domain-specific generics

interface ApiResponse<T> {
  data: T;
  success: boolean;
  timestamp: Date;
}

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
}

type ProductResponse = ApiResponse<Product>;
type UserListResponse = ListResponse<User>;
```

## File Structure Standards

### Single File (Recommended for Tightly Coupled Types)

```typescript
// src/shared/contracts/forms/create-user.ts

import { z } from 'zod';

// Schema (validation)
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

// Inferred type
export type CreateUserRequest = z.infer<typeof createUserSchema>;

// Response type (separate concern, but related)
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Multiple Files (For Complex Domains)

```typescript
// src/shared/contracts/forms/
//   ├── index.ts
//   ├── create-user.ts
//   ├── update-user.ts
//   ├── user-filter.ts
//   └── user-responses.ts

// src/shared/contracts/forms/index.ts
export * from './create-user';
export * from './update-user';
export * from './user-filter';
export * from './user-responses';
```

### Subdirectory index.ts Structure

```typescript
// src/shared/contracts/forms/index.ts

// Form input/output schemas and types for feature submissions
export * from './create-product';
export * from './update-product';
export * from './bulk-import-products';
export * from './product-filter';

// Or with explicit imports for clarity
export { createProductSchema, CreateProductRequest, ProductResponse } from './create-product';
export { updateProductSchema, UpdateProductRequest } from './update-product';
```

## Type Definition Patterns

### Pattern 1: Zod Schema + Inferred Type

**Best for:** Form inputs, API request bodies, data validation

```typescript
import { z } from 'zod';

export const registerUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  name: z.string().min(1, 'Name is required'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Single source of truth for both validation and type
export type RegisterUserRequest = z.infer<typeof registerUserSchema>;
```

**Usage:**

```typescript
// Validate at runtime
const parsed = registerUserSchema.safeParse(formData);
if (!parsed.success) {
  console.error(parsed.error.flatten());
}

// Type-safe code
const request: RegisterUserRequest = parsed.data;
```

### Pattern 2: Interface + Validation (When Zod Overhead is Not Needed)

**Best for:** Response types, internal data structures

```typescript
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}
```

### Pattern 3: Combining Multiple Types

**Best for:** Complex domains with multiple related types

```typescript
// src/shared/contracts/forms/product.ts

import { z } from 'zod';

// Base entity (used in responses)
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  createdAt: Date;
}

// Request schema
export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  category: z.string(),
});

export type CreateProductRequest = z.infer<typeof createProductSchema>;

// Response (extends or uses base)
export interface ProductResponse extends Product {
  // May include computed fields, relationships, etc.
}

// Filter schema
export const productFilterSchema = z.object({
  category: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  name: z.string().optional(),
});

export type ProductFilter = z.infer<typeof productFilterSchema>;
```

### Pattern 4: Enum + Type

**Best for:** Defined option sets**

```typescript
export enum UserRole {
  Admin = 'admin',
  Editor = 'editor',
  Viewer = 'viewer',
}

export const USER_ROLE_VALUES = Object.values(UserRole);

export const userRoleSchema = z.enum(USER_ROLE_VALUES);
export type UserRoleType = z.infer<typeof userRoleSchema>;

// Or directly
export enum ProductStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}
```

### Pattern 5: Discriminated Union

**Best for:** Action payloads, event types, polymorphic data

```typescript
import { z } from 'zod';

export const createProductEventSchema = z.object({
  type: z.literal('product.created'),
  productId: z.string(),
  name: z.string(),
  createdBy: z.string(),
});

export const deleteProductEventSchema = z.object({
  type: z.literal('product.deleted'),
  productId: z.string(),
  deletedBy: z.string(),
});

export const productEventSchema = z.discriminatedUnion('type', [
  createProductEventSchema,
  deleteProductEventSchema,
]);

export type ProductEvent = z.infer<typeof productEventSchema>;
```

## When to Use Zod vs. Plain Interfaces

### Use Zod When:
- ✅ Validating user input (forms, API requests)
- ✅ Parsing external data (webhooks, third-party APIs)
- ✅ Need runtime type safety for data that might be invalid
- ✅ Type can be inferred from schema

### Use Plain Interface When:
- ✅ Type is only used in response/output (no validation needed)
- ✅ Type is complex and verbose Zod schema would be harder to read
- ✅ Type is an internal contract (feature-to-feature communication)
- ✅ Database query result (already validated by DB driver)

## Circular Dependency Prevention

### Rule 1: Isolate Shared Types

Don't spread types across multiple files if they're interdependent:

❌ **Bad:**
```typescript
// user-request.ts
import type { Role } from './user-response';
export interface CreateUserRequest {
  role: Role;
}

// user-response.ts
import type { CreateUserRequest } from './user-request';
```

✅ **Good:**
```typescript
// user.ts
export interface CreateUserRequest {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface UserResponse {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}
```

### Rule 2: Use Type-Only Imports When Necessary

```typescript
// Only when absolutely necessary and no circular alternative exists
import type { ProductId } from './product';

export interface OrderRequest {
  productId: ProductId;
}
```

### Rule 3: Consolidate Related Types

If types are tightly coupled, define them in the same file.

## Cross-Domain Type Handling

### When Features Share a Domain

If Product types are used by both `products` and `ai-paths` features:

1. **Define in contracts** as the single source of truth
2. **Export from feature public.ts** if the feature "owns" the domain
3. **Import from contracts** in other features

```typescript
// src/shared/contracts/products.ts
export interface Product { ... }
export interface CreateProductRequest { ... }

// src/features/products/public.ts
export * from '@/shared/contracts/products';

// src/features/ai-paths/server.ts
import { Product, CreateProductRequest } from '@/shared/contracts/products';
```

### Namespace Collisions

If two domains have similar types, use descriptive names:

```typescript
// ❌ Confusing
export interface Filter { ... }

// ✅ Clear
export interface ProductFilter { ... }
export interface AIPathFilter { ... }
```

## API Envelope Pattern

For consistency across API responses:

```typescript
// src/shared/contracts/api-envelope.ts

export interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: Date;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: Date;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

**Usage:**

```typescript
export async function getProduct(id: string): Promise<ApiResponse<Product>> {
  try {
    const product = await db.products.findById(id);
    return {
      success: true,
      data: product,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Product not found' },
      timestamp: new Date(),
    };
  }
}
```

## Examples by Subdirectory

### ui/component-props

```typescript
// src/shared/contracts/ui/component-props/dialog.ts
export interface DialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  destructive?: boolean;
}
```

### hooks

```typescript
// src/shared/contracts/hooks/use-products.ts
export interface UseProductsOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'created';
  filters?: ProductFilter;
}

export interface UseProductsHook {
  products: Product[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

### context

```typescript
// src/shared/contracts/context/admin-settings.ts
export interface AdminSettingsContextValue {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}
```

### kangur-repositories

```typescript
// src/shared/contracts/kangur-repositories/product-repository.ts
export interface ProductRepository {
  getAll(filters?: ProductFilter): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  create(data: CreateProductRequest): Promise<Product>;
  update(id: string, data: UpdateProductRequest): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}
```

### workers

```typescript
// src/shared/contracts/workers/product-ai-job.ts
export const productAiJobSchema = z.object({
  productId: z.string(),
  action: z.enum(['generate-description', 'optimize-title']),
  params: z.record(z.any()).optional(),
});

export type ProductAiJob = z.infer<typeof productAiJobSchema>;

export interface ProductAiJobResult {
  jobId: string;
  productId: string;
  success: boolean;
  result?: string;
  error?: string;
}
```

### forms

```typescript
// src/shared/contracts/forms/create-product.ts
export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().positive(),
  category: z.string(),
  tags: z.array(z.string()).optional(),
});

export type CreateProductRequest = z.infer<typeof createProductSchema>;

export interface CreateProductResponse {
  id: string;
  name: string;
  createdAt: Date;
}
```

## Summary Checklist

- [ ] ✅ Chose the correct subdirectory for the type
- [ ] ✅ Named the type following Request/Response/Dto pattern
- [ ] ✅ File name is kebab-case and matches primary type
- [ ] ✅ Used Zod schema if validation is needed
- [ ] ✅ Inferred type from Zod schema using `z.infer<>`
- [ ] ✅ Added type to subdirectory's `index.ts`
- [ ] ✅ No circular dependencies with other contracts
- [ ] ✅ Documented any special patterns in comments
- [ ] ✅ Ran `npm run typecheck` to verify

## Questions & Feedback

If you're unsure about a naming pattern or file structure decision, check:

1. **Similar types** in `src/shared/contracts/` for precedent
2. **CONVENTIONS.md** (this file) for the rule
3. **README.md** for context and examples
4. Ask in team discussions
