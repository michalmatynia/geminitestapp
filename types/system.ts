export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type SystemLogInput = {
  level: LogLevel;
  category: string;
  message: string;
  context?: Record<string, unknown>;
  userId?: string;
};

export type CreateSystemLogInput = SystemLogInput;

export type ListSystemLogsInput = {
  level?: LogLevel;
  category?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
};

export type ListSystemLogsResult = {
  logs: Array<SystemLogInput & { id: string; timestamp: Date }>;
  total: number;
};

export type AppDbProvider = "prisma" | "mongodb";

export type MigrationDirection = "prisma-to-mongo" | "mongo-to-prisma";

export type MigrationBatchResult = {
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
};
