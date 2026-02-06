export type SystemLogLevel = 'info' | 'warn' | 'error';

export type SystemLogRecord = {
  id: string;
  level: SystemLogLevel;
  message: string;
  source?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  userId?: string | null;
  createdAt: Date | string;
};

export type SystemLogMetrics = {
  total: number;
  levels: Record<SystemLogLevel, number>;
  last24Hours: number;
  last7Days: number;
  topSources: Array<{ source: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
  generatedAt: Date | string;
};
