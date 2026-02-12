import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Auth User DTOs
 */

export const authUserSchema = dtoBaseSchema.extend({
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  emailVerified: z.string().nullable(),
  provider: z.string(),
  password: z.string().optional(),
});

export type AuthUserDto = z.infer<typeof authUserSchema>;

export const createUserSchema = authUserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = Partial<CreateUserDto>;

export const authUserAccessSchema = dtoBaseSchema.extend({
  userId: z.string(),
  permissions: z.array(z.string()),
  roles: z.array(z.string()),
  lastLogin: z.string().optional(),
});

export type AuthUserAccessDto = z.infer<typeof authUserAccessSchema>;

export const authUserPageSettingsSchema = z.object({
  defaultPage: z.string(),
  allowedPages: z.array(z.string()),
});

export type AuthUserPageSettingsDto = z.infer<typeof authUserPageSettingsSchema>;

export const authSecurityPolicySchema = z.object({
  passwordMinLength: z.number(),
  requireSpecialChar: z.boolean(),
  requireNumber: z.boolean(),
  lockoutThreshold: z.number(),
  lockoutDuration: z.number(),
});

export type AuthSecurityPolicyDto = z.infer<typeof authSecurityPolicySchema>;

export const authPermissionSchema = z.object({
  action: z.string(),
  resource: z.string(),
});

export type AuthPermissionDto = z.infer<typeof authPermissionSchema>;

export const authRoleSchema = namedDtoSchema.extend({
  permissions: z.array(authPermissionSchema),
});

export type AuthRoleDto = z.infer<typeof authRoleSchema>;

export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
});

export type RegisterDto = z.infer<typeof registerSchema>;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.record(z.string(), jsonValueSchema),
    z.array(jsonValueSchema),
  ])
);

export const userPreferencesSchema = dtoBaseSchema.extend({
  userId: z.string(),
  productListNameLocale: z.string(),
  productListCatalogFilter: z.string(),
  productListCurrencyCode: z.string().nullable(),
  productListPageSize: z.number(),
  productListThumbnailSource: z.enum(['file', 'link', 'base64']),
  productListDraftIconColorMode: z.enum(['theme', 'custom']),
  productListDraftIconColor: z.string().nullable(),
  aiPathsActivePathId: z.string().nullable(),
  adminMenuCollapsed: z.boolean(),
  adminMenuFavorites: z.array(z.string()),
  adminMenuSectionColors: z.record(z.string(), z.string()),
  adminMenuCustomEnabled: z.boolean(),
  adminMenuCustomNav: jsonValueSchema.nullable(),
  cmsLastPageId: z.string().nullable(),
  cmsActiveDomainId: z.string().nullable(),
  cmsThemeOpenSections: z.array(z.string()),
  cmsThemeLogoWidth: z.number().nullable(),
  cmsThemeLogoUrl: z.string().nullable(),
  cmsPreviewEnabled: z.boolean().nullable(),
  cmsSlideshowPauseOnHoverInEditor: z.boolean().nullable(),
});

export type UserPreferencesDto = z.infer<typeof userPreferencesSchema>;

export const createUserPreferencesSchema = userPreferencesSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateUserPreferencesDto = z.infer<typeof createUserPreferencesSchema>;
export type UpdateUserPreferencesDto = Partial<CreateUserPreferencesDto>;
