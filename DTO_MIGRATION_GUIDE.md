# DTO Migration Guide

This guide explains how to use the new centralized DTOs (Data Transfer Objects) that replace duplicate types and interfaces across the application.

## Overview

All DTOs are now centralized in `/src/shared/dtos/` and can be imported from `@/shared/dtos`.

## Usage Examples

### Before (using feature-specific types)
```typescript
import type { AuthUserSummary } from "@/features/auth/types";
import type { ProductCategory } from "@/features/products/types";
```

### After (using centralized DTOs)
```typescript
import type { AuthUserDto, ProductCategoryDto } from "@/shared/dtos";
```

## Available DTOs by Feature

### Auth
- `AuthUserDto` - User information
- `AuthUserAccessDto` - User permissions and roles
- `CreateUserDto` - User creation payload
- `UpdateUserDto` - User update payload
- `LoginDto` - Login credentials
- `RegisterDto` - Registration payload

### Products
- `ProductDto` - Product information
- `ProductCategoryDto` - Product category
- `CreateProductDto` - Product creation payload
- `UpdateProductDto` - Product update payload

### Chatbot
- `ChatbotSessionDto` - Chat session
- `ChatbotMessageDto` - Chat message
- `SendMessageDto` - Send message payload

### CMS
- `CmsPageDto` - CMS page
- `CmsThemeDto` - CMS theme
- `CreatePageDto` - Page creation payload

### Files
- `FileDto` - File information
- `ImageFileDto` - Image file with dimensions
- `UploadFileDto` - File upload payload

## API Integration

### API Routes
```typescript
// Before
import type { Product } from "@/features/products/types";

// After
import type { ProductDto, CreateProductDto } from "@/shared/dtos";

export async function POST(req: Request) {
  const data: CreateProductDto = await req.json();
  // ...
}
```

### React Hooks
```typescript
// Before
import type { AuthUserSummary } from "@/features/auth/types";

// After
import type { AuthUserDto } from "@/shared/dtos";

export function useAuthUser(): UseQueryResult<AuthUserDto> {
  // ...
}
```

## Backward Compatibility

All existing types are re-exported from their original locations for backward compatibility:

```typescript
// This still works
import type { AuthUserSummary } from "@/features/auth/types";

// But this is preferred
import type { AuthUserDto } from "@/shared/dtos";
```

## Benefits

1. **Consistency** - All DTOs follow the same naming and structure patterns
2. **Type Safety** - Proper TypeScript interfaces with strict typing
3. **Reusability** - DTOs can be shared across features
4. **Maintainability** - Single source of truth for data structures
5. **API Ready** - Designed for REST API request/response patterns

## Migration Steps

1. Replace feature-specific type imports with DTO imports
2. Update function signatures to use DTOs
3. Update API routes to use DTOs for request/response typing
4. Update React hooks to use DTOs for data typing

## Common Patterns

### API Response Typing
```typescript
import type { ProductDto } from "@/shared/dtos";

const products: ProductDto[] = await response.json();
```

### Form Data Typing
```typescript
import type { CreateProductDto } from "@/shared/dtos";

const handleSubmit = (data: CreateProductDto) => {
  // ...
};
```

### Hook Return Types
```typescript
import type { AuthUserDto } from "@/shared/dtos";

export function useCurrentUser(): UseQueryResult<AuthUserDto> {
  // ...
}
```
