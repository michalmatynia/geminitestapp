import { z } from 'zod';

import { dtoBaseSchema } from './base';
import { productAdvancedFilterPresetSchema } from './products/filters';

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

export type AuthUser = z.infer<typeof authUserSchema>;

export type AuthUserRecord = {
  id: string;
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
};

export const createUserSchema = authUserSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    password: z.string(),
  });

export type AuthUserCreateInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial();
export type AuthUserUpdateInput = z.infer<typeof updateUserSchema>;

export const authUserAccessSchema = dtoBaseSchema.extend({
  userId: z.string(),
  permissions: z.array(z.string()),
  roles: z.array(z.string()),
  lastLogin: z.string().optional(),
});

export type AuthUserAccess = z.infer<typeof authUserAccessSchema>;

export const authPermissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export type AuthPermission = z.infer<typeof authPermissionSchema>;

export const authRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  permissions: z.array(z.string()),
  deniedPermissions: z.array(z.string()).optional(),
  level: z.number().optional(),
});

export type AuthRole = z.infer<typeof authRoleSchema>;

export const authUserRoleMapSchema = z.record(z.string(), z.string());
export type AuthUserRoleMap = z.infer<typeof authUserRoleMapSchema>;

export const authUserAccessDetailSchema = z.object({
  roleId: z.string(),
  permissions: z.array(z.string()),
  level: z.number(),
  isElevated: z.boolean(),
  role: authRoleSchema.optional(),
});

export type AuthUserAccessDetail = z.infer<typeof authUserAccessDetailSchema>;

export const authUserSecuritySchema = z.object({
  disabledAt: z.string().nullable().optional(),
});

export type AuthUserSecurity = z.infer<typeof authUserSecuritySchema>;

export const authSecurityProfileSchema = z.object({
  userId: z.string(),
  mfaEnabled: z.boolean(),
  mfaSecret: z.string().nullable(),
  recoveryCodes: z.array(z.string()),
  allowedIps: z.array(z.string()),
  disabledAt: z.string().nullable(), // ISO string
  bannedAt: z.string().nullable(), // ISO string
  createdAt: z.string(), // ISO string
  updatedAt: z.string(), // ISO string
});

export type AuthSecurityProfile = z.infer<typeof authSecurityProfileSchema>;

export const authUsersResponseSchema = z.object({
  provider: z.enum(['mongodb', 'prisma']),
  users: z.array(authUserSchema),
});

export type AuthUsersResponse = z.infer<typeof authUsersResponseSchema>;

export const authUserSecurityProfileSchema = z.object({
  userId: z.string(),
  mfaEnabled: z.boolean(),
  allowedIps: z.array(z.string()),
  disabledAt: z.string().nullable(),
  bannedAt: z.string().nullable(),
});

export type AuthUserSecurityProfile = z.infer<typeof authUserSecurityProfileSchema>;

export const mfaSetupResponseSchema = z.object({
  ok: z.boolean(),
  secret: z.string().optional(),
  otpauthUrl: z.string().optional(),
  message: z.string().optional(),
});

export type MfaSetupResponse = z.infer<typeof mfaSetupResponseSchema>;

export const mfaVerifyResponseSchema = z.object({
  ok: z.boolean(),
  recoveryCodes: z.array(z.string()).optional(),
  message: z.string().optional(),
});

export type MfaVerifyResponse = z.infer<typeof mfaVerifyResponseSchema>;

export const mfaDisableResponseSchema = z.object({
  ok: z.boolean(),
  message: z.string().optional(),
});

export type MfaDisableResponse = z.infer<typeof mfaDisableResponseSchema>;

export const verifyCredentialsResponseSchema = z.object({
  ok: z.boolean(),
  mfaRequired: z.boolean().optional(),
  challengeId: z.string().optional(),
  expiresAt: z.string().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
});

export type VerifyCredentialsResponse = z.infer<typeof verifyCredentialsResponseSchema>;

export const registerResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const authUserPageSettingsSchema = z.object({
  allowSignup: z.boolean(),
  allowPasswordReset: z.boolean(),
  allowSocialLogin: z.boolean(),
  requireEmailVerification: z.boolean(),
});

export type AuthUserPageSettings = z.infer<typeof authUserPageSettingsSchema>;

export const authSecurityPolicySchema = z.object({
  minPasswordLength: z.number(),
  requireStrongPassword: z.boolean(),
  requireUppercase: z.boolean(),
  requireLowercase: z.boolean(),
  requireNumber: z.boolean(),
  requireSymbol: z.boolean(),
  lockoutMaxAttempts: z.number(),
  lockoutWindowMinutes: z.number(),
  lockoutDurationMinutes: z.number(),
  ipRateLimitMaxAttempts: z.number(),
  ipRateLimitWindowMinutes: z.number(),
  ipRateLimitDurationMinutes: z.number(),
});

export type AuthSecurityPolicy = z.infer<typeof authSecurityPolicySchema>;

export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export type Login = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().optional(),
  email: z.string(),
  password: z.string(),
  emailVerified: z.boolean().optional(),
});

export type Register = z.infer<typeof registerSchema>;

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
  productListFiltersCollapsedByDefault: z.boolean(),
  productListAdvancedFilterPresets: z.array(productAdvancedFilterPresetSchema),
  productListAppliedAdvancedFilter: z.string().nullable(),
  productListAppliedAdvancedFilterPresetId: z.string().nullable(),
  productListDraftIconColorMode: z.enum(['theme', 'custom']),
  productListDraftIconColor: z.string().nullable(),
  aiPathsActivePathId: z.string().nullable(),
  imageStudioLastProjectId: z.string().nullable(),
  caseResolverCaseListViewMode: z.enum(['hierarchy', 'list']),
  caseResolverCaseListSortBy: z.enum([
    'updated',
    'created',
    'happeningDate',
    'name',
    'status',
    'signature',
    'locked',
    'sent',
  ]),
  caseResolverCaseListSortOrder: z.enum(['asc', 'desc']),
  caseResolverCaseListSearchScope: z.enum(['all', 'name', 'folder', 'content']),
  caseResolverCaseListFiltersCollapsedByDefault: z.boolean(),
  caseResolverCaseListShowNestedContent: z.boolean(),
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

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const createUserPreferencesSchema = userPreferencesSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateUserPreferencesInput = z.infer<typeof createUserPreferencesSchema>;
export type UpdateUserPreferencesInput = Partial<CreateUserPreferencesInput>;
export type UserPreferencesUpdate = UpdateUserPreferencesInput;
