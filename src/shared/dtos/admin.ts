// Admin DTOs
export interface AdminDashboardStatsDto {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  recentActivity: AdminActivityDto[];
}

export interface AdminActivityDto {
  id: string;
  type: string;
  description: string;
  userId: string | null;
  timestamp: string;
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

export interface AdminLogDto {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  timestamp: string;
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
