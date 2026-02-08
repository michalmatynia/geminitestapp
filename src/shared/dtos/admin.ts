import { DtoBase } from '../types/base';

// Admin DTOs
export interface AdminDashboardStatsDto {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  recentActivity: AdminActivityDto[];
}

export interface AdminActivityDto extends DtoBase {
  type: string;
  description: string;
  userId: string | null;
  metadata: Record<string, unknown>;
}

export interface AdminSystemInfoDto {
  version: string;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  databaseStatus: 'healthy' | 'warning' | 'error';
}

export interface AdminLogDto extends DtoBase {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  metadata: Record<string, unknown> | null;
}

export interface AdminSettingsDto {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  emailSettings: {
    provider: string;
    config: Record<string, unknown>;
  };
  storageSettings: {
    provider: string;
    config: Record<string, unknown>;
  };
}

export interface UpdateAdminSettingsDto {
  siteName?: string;
  siteDescription?: string;
  maintenanceMode?: boolean;
  allowRegistration?: boolean;
  emailSettings?: {
    provider: string;
    config: Record<string, unknown>;
  };
  storageSettings?: {
    provider: string;
    config: Record<string, unknown>;
  };
}

/**
 * Navigation item for the admin menu.
 */
export interface AdminNavItemDto {
  id: string;
  label: string;
  href?: string;
  exact?: boolean;
  keywords?: string[];
  sectionColor?: string;
  children?: AdminNavItemDto[];
}

/**
 * Custom node for user-defined admin menu layout.
 */
export interface AdminMenuCustomNodeDto {
  id: string;
  label?: string;
  href?: string;
  children?: AdminMenuCustomNodeDto[];
}

/**
 * Flattened representation of a navigation item for searching and pinning.
 */
export interface AdminNavLeafDto {
  id: string;
  label: string;
  href?: string;
  keywords?: string[];
  parents: string[];
  item: AdminNavItemDto;
}
