# Centralized DTOs and Type Contracts

Welcome to the shared contracts directory! This is the single source of truth for all Data Transfer Objects (DTOs), type interfaces, and Zod schemas across the application.

## Why Centralization?

- **Single source of truth**: Types are defined once, used everywhere
- **Easy refactoring**: Change a DTO in one place, all imports automatically stay in sync
- **Clear contracts**: Public API boundaries are explicit and documented
- **Reduced duplication**: Avoid copy-paste type definitions across features
- **Better type safety**: Shared validation schemas with runtime safety

## Directory Structure

```
src/shared/contracts/
├── README.md (this file)
├── CONVENTIONS.md (naming & patterns guide)
├── index.ts (main barrel export)
│
├── ui/
│   ├── component-props/ (React component prop types)
│   └── index.ts
│
├── hooks/
│   ├── index.ts (custom hook DTOs)
│   └── [hook-name].ts
│
├── context/
│   ├── index.ts (React context value types)
│   └── [context-name].ts
│
├── kangur-repositories/
│   ├── index.ts (Kangur data repositories)
│   └── [repository-name].ts
│
├── workers/
│   ├── index.ts (Background job & queue DTOs)
│   └── [worker-name].ts
│
├── forms/
│   ├── index.ts (Form input/output schemas)
│   └── [form-name].ts
│
├── [domain-name].ts (Domain-specific types)
├── api-envelope.ts (API response envelopes)
├── auth.ts (Authentication DTOs)
├── products.ts (Product types)
└── ... (many more domain files)
```

## How to Use This Directory

### For App/Feature Code

Import types from the centralized contracts:

```typescript
// ✅ Good: Import from contracts
import { ProductFormProps, CreateProductRequest } from '@/shared/contracts/forms';
import { UseProductsHook } from '@/shared/contracts/hooks';
import { AdminSettingsContext } from '@/shared/contracts/context';

// ❌ Bad: Deep imports from features
import { ProductFormProps } from '@/features/products/types';
```

### For Feature Internal Code

Features can still have internal types, but public APIs should use contracts:

```typescript
// src/features/products/public.ts
export { CreateProductRequest, ProductFormProps } from '@/shared/contracts/forms';
export { useProducts } from './hooks/useProducts'; // Hook internals stay in feature
```

## Adding a New Type

### 1. Choose the Right Subdirectory

| Subdirectory | Purpose | Examples |
|---|---|---|
| `ui/component-props` | React component prop interfaces | `DialogProps`, `ButtonProps`, `FormProps` |
| `hooks` | Custom hook argument/return types | `UseProductsHook`, `UseChatbotOptions` |
| `context` | React Context value types | `UserSettingsContext`, `ThemeContext` |
| `kangur-repositories` | Data access repository types | `ProductRepository`, `UserRepository` |
| `workers` | Background job & queue message DTOs | `ProcessProductAiRequest`, `SendEmailJob` |
| `forms` | Form input/output/validation schemas | `CreateUserRequest`, `UpdateProductForm` |
| `[domain]/*.ts` | Domain-specific (top-level) | Product types, Auth types, CMS types |

### 2. Create or Edit the File

For `forms/create-product.ts`:

```typescript
import { z } from 'zod';

// Zod schema for validation
export const createProductFormSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  category: z.string(),
  description: z.string().optional(),
});

// Inferred TypeScript type
export type CreateProductRequest = z.infer<typeof createProductFormSchema>;

// Response type (separate if needed)
export interface ProductResponse {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
}
```

### 3. Add to Subdirectory's `index.ts`

Edit `forms/index.ts`:

```typescript
// Forms: Input/output schemas for all form submissions
export * from './create-product';
export * from './update-product';
export * from './bulk-import';
```

### 4. (Optional) Add to Main `index.ts`

If the type is widely used, export from `src/shared/contracts/index.ts`:

```typescript
export * from './forms';
export * from './ui/component-props';
```

## Common Patterns

### Pattern 1: Request + Response DTOs

```typescript
// src/shared/contracts/forms/user-registration.ts
import { z } from 'zod';

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export type RegisterUserRequest = z.infer<typeof registerUserSchema>;

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

Usage in API route:

```typescript
// src/app/api/auth/register/route.ts
import { registerUserSchema, RegisterUserRequest, UserResponse } from '@/shared/contracts/forms';

export async function POST(req: NextRequest) {
  const data = registerUserSchema.parse(await req.json()); // Validates
  const user = await createUser(data);
  return NextResponse.json<UserResponse>(user);
}
```

### Pattern 2: Component Props

```typescript
// src/shared/contracts/ui/component-props/dialog.ts
import type { ReactNode } from 'react';

export interface DialogProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}
```

Usage:

```typescript
import { DialogProps } from '@/shared/contracts/ui/component-props';

export function Dialog(props: DialogProps) {
  // Implementation
}
```

### Pattern 3: Hook Types

```typescript
// src/shared/contracts/hooks/use-products.ts
import type { UseQueryResult } from '@tanstack/react-query';

export interface UseProductsOptions {
  page?: number;
  limit?: number;
  category?: string;
}

export interface UseProductsHook extends UseQueryResult<Product[], Error> {
  data: Product[];
  isLoading: boolean;
  error: Error | null;
}
```

### Pattern 4: Context Types

```typescript
// src/shared/contracts/context/theme.ts
export interface ThemeContextValue {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  systemPreference: 'light' | 'dark';
}
```

## Naming Conventions

See `CONVENTIONS.md` for detailed naming patterns and rules.

## Related Documentation

- **CONVENTIONS.md** — Detailed naming, file structure, and pattern guide
- **docs/platform/architecture-guardrails.md** — Cross-feature import rules
- **docs/platform/developer-handbook.md** — General architecture patterns

## Migration Guide

If you're migrating an existing type to contracts:

1. **Locate the current type** in your feature code
2. **Create/edit the appropriate file** in contracts/
3. **Copy the type definition** (update naming if needed per CONVENTIONS.md)
4. **Add Zod validation** if it's a form/API input
5. **Update the subdirectory's index.ts**
6. **Update all imports** in your feature to use the new location
7. **Run type checking**: `npm run typecheck`
8. **Test your changes**: `npm run test`

## Best Practices

1. **Keep contracts lean** — Define minimal, focused types
2. **Use Zod for inputs** — Add runtime validation for API/form inputs
3. **Avoid circular imports** — If type A needs type B and B needs A, consolidate them
4. **Document breaking changes** — Update CONVENTIONS.md if you change naming rules
5. **Co-locate with feature code** — Keep internal types in features, only public APIs here
6. **Use type inference** — Prefer `z.infer<typeof schema>` over manual types
7. **Organize by concern** — Group related types in the same file

## FAQ

**Q: Should every type in the app live here?**  
A: No. Only types that are shared across multiple features or form public API boundaries. Internal feature types can stay in the feature directory.

**Q: How do I handle types used only in one feature?**  
A: Keep them in the feature's own directory. Move them here only when a second feature needs them.

**Q: What if two domains need the same type?**  
A: Define it here in contracts/. Use naming to clarify which domain it belongs to (e.g., `ProductFilter`, not `Filter`).

**Q: How do I validate at runtime?**  
A: Use Zod schemas. API routes and form handlers can call `.parse()` or `.safeParse()` to validate inputs.

## Getting Help

- Ask in team discussions or code review
- Reference `CONVENTIONS.md` for naming questions
- Look at existing types in `src/shared/contracts/` for patterns
- Check `docs/platform/` for broader architecture context
