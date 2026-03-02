import { z } from 'zod';

import { dtoBaseSchema } from './base';

export const VALIDATOR_PATTERN_LISTS_KEY = 'validator_pattern_lists';

export * from './validator';

/**
 * Admin Activity DTOs
 */

export const adminActivitySchema = dtoBaseSchema.extend({
  type: z.string(),
  description: z.string(),
  userId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export type AdminActivity = z.infer<typeof adminActivitySchema>;

export const adminDashboardStatsSchema = z.object({
  totalUsers: z.number(),
  totalProducts: z.number(),
  totalOrders: z.number(),
  totalRevenue: z.number(),
  recentActivity: z.array(adminActivitySchema),
});

export type AdminDashboardStats = z.infer<typeof adminDashboardStatsSchema>;

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

export type AdminSystemInfo = z.infer<typeof adminSystemInfoSchema>;

/**
 * Admin Log DTOs
 */

export const adminLogSchema = dtoBaseSchema.extend({
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string(),
  source: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export type AdminLog = z.infer<typeof adminLogSchema>;

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

export type AdminSettings = z.infer<typeof adminSettingsSchema>;

export const createAdminSettingsSchema = adminSettingsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAdminSettings = z.infer<typeof createAdminSettingsSchema>;
export type UpdateAdminSettings = Partial<CreateAdminSettings>;

/**
 * Admin Navigation DTOs
 */

export interface AdminNavItem {
  id: string;
  label: string;
  href?: string | undefined;
  exact?: boolean | undefined;
  keywords?: string[] | undefined;
  sectionColor?: string | undefined;
  children?: AdminNavItem[] | undefined;
}

export const adminNavItemSchema: z.ZodType<AdminNavItem> = z.lazy(() =>
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

export interface AdminMenuColorOption {
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

export interface AdminMenuCustomNode {
  id: string;
  label?: string | undefined;
  href?: string | undefined;
  children?: AdminMenuCustomNode[] | undefined;
}

export const adminMenuCustomNodeSchema = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().optional(),
    href: z.string().optional(),
    children: z.array(adminMenuCustomNodeSchema).optional(),
  })
) as z.ZodType<AdminMenuCustomNode>;

export const adminNavLeafSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  parents: z.array(z.string()),
  item: adminNavItemSchema,
});

export type AdminNavLeaf = z.infer<typeof adminNavLeafSchema>;

/**
 * Admin Layout DTOs
 */

export interface AdminLayoutState {
  isMenuCollapsed: boolean;
  isMenuHidden: boolean;
  isProgrammaticallyCollapsed: boolean;
  aiDrawerOpen: boolean;
}

export interface AdminLayoutActions {
  setIsMenuCollapsed: (isCollapsed: boolean) => void;
  setIsMenuHidden: (isHidden: boolean) => void;
  setIsProgrammaticallyCollapsed: (isProgrammaticallyCollapsed: boolean) => void;
  setAiDrawerOpen: (isOpen: boolean) => void;
}
