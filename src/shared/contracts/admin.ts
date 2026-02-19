import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Admin Activity DTOs
 */

export const adminActivitySchema = dtoBaseSchema.extend({
  type: z.string(),
  description: z.string(),
  userId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export type AdminActivityDto = z.infer<typeof adminActivitySchema>;

export const adminDashboardStatsSchema = z.object({
  totalUsers: z.number(),
  totalProducts: z.number(),
  totalOrders: z.number(),
  totalRevenue: z.number(),
  recentActivity: z.array(adminActivitySchema),
});

export type AdminDashboardStatsDto = z.infer<typeof adminDashboardStatsSchema>;

/**
 * Admin System Info DTOs
 */

export const adminSystemInfoSchema = z.object({
  version: z.string(),
  uptime: z.number(),
  memoryUsage: z.number(),
  cpuUsage: z.number(),
  diskUsage: z.number(),
  databaseStatus: z.enum(['healthy', 'warning', 'error']),
});

export type AdminSystemInfoDto = z.infer<typeof adminSystemInfoSchema>;

/**
 * Admin Log DTOs
 */

export const adminLogSchema = dtoBaseSchema.extend({
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string(),
  source: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export type AdminLogDto = z.infer<typeof adminLogSchema>;

/**
 * Admin Settings DTOs
 */

export const adminSettingsSchema = dtoBaseSchema.extend({
  siteName: z.string(),
  siteDescription: z.string(),
  maintenanceMode: z.boolean(),
  allowRegistration: z.boolean(),
  emailSettings: z.object({
    provider: z.string(),
    config: z.record(z.string(), z.unknown()),
  }),
  storageSettings: z.object({
    provider: z.string(),
    config: z.record(z.string(), z.unknown()),
  }),
});

export type AdminSettingsDto = z.infer<typeof adminSettingsSchema>;

export const createAdminSettingsSchema = adminSettingsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAdminSettingsDto = z.infer<typeof createAdminSettingsSchema>;
export type UpdateAdminSettingsDto = Partial<CreateAdminSettingsDto>;

/**
 * Admin Navigation DTOs
 */

export interface AdminNavItemDto {
  id: string;
  label: string;
  href?: string | undefined;
  exact?: boolean | undefined;
  keywords?: string[] | undefined;
  sectionColor?: string | undefined;
  children?: AdminNavItemDto[] | undefined;
}

export const adminNavItemSchema: z.ZodType<AdminNavItemDto> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    href: z.string().optional(),
    exact: z.boolean().optional(),
    keywords: z.array(z.string()).optional(),
    sectionColor: z.string().optional(),
    children: z.array(adminNavItemSchema).optional(),
  })
);

export interface AdminMenuColorOptionDto {
  value: string;
  label: string;
  dot: string;
  border: string;
  text: string;
}

export const adminMenuColorOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  dot: z.string(),
  border: z.string(),
  text: z.string(),
});

export interface AdminMenuCustomNodeDto {
  id: string;
  label?: string | undefined;
  href?: string | undefined;
  children?: AdminMenuCustomNodeDto[] | undefined;
}

export const adminMenuCustomNodeSchema = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().optional(),
    href: z.string().optional(),
    children: z.array(adminMenuCustomNodeSchema).optional(),
  })
) as z.ZodType<AdminMenuCustomNodeDto>;

export const adminNavLeafSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  parents: z.array(z.string()),
  item: adminNavItemSchema,
});

export type AdminNavLeafDto = z.infer<typeof adminNavLeafSchema>;

/**
 * Admin Validator DTOs
 */

export const validatorScopeSchema = z.enum([
  'products',
  'image-studio',
  'prompt-exploder',
  'case-resolver-prompt-exploder',
]);

export type ValidatorScopeDto = z.infer<typeof validatorScopeSchema>;

export const validatorPatternListSchema = dtoBaseSchema.extend({
  name: z.string(),
  description: z.string(),
  scope: validatorScopeSchema,
  deletionLocked: z.boolean(),
});

export type ValidatorPatternListDto = z.infer<typeof validatorPatternListSchema>;
