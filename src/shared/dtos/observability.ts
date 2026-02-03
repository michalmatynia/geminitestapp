import { NamedDto } from '../types/base';

// Observability DTOs
export interface MetricDto {
  id: string;
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: string;
}

export interface LogEntryDto {
  id: string;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  source: string;
  timestamp: string;
  metadata: Record<string, unknown> | null;
  traceId: string | null;
}

export interface TraceDto {
  id: string;
  operationName: string;
  duration: number;
  status: 'ok' | 'error' | 'timeout';
  spans: SpanDto[];
  startTime: string;
  endTime: string;
}

export interface SpanDto {
  id: string;
  traceId: string;
  parentId: string | null;
  operationName: string;
  duration: number;
  status: 'ok' | 'error';
  tags: Record<string, string>;
  logs: SpanLogDto[];
  startTime: string;
  endTime: string;
}

export interface SpanLogDto {
  timestamp: string;
  fields: Record<string, unknown>;
}

export interface AlertDto extends NamedDto {
  condition: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface CreateAlertDto {
  name: string;
  description?: string;
  condition: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled?: boolean;
}
