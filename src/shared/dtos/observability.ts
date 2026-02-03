import { DtoBase, NamedDto } from '../types/base';

// Observability DTOs
export interface MetricDto extends DtoBase {
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
}

export interface LogEntryDto extends DtoBase {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  source: string;
  metadata: Record<string, unknown> | null;
  traceId: string | null;
}

export interface TraceDto extends DtoBase {
  operationName: string;
  duration: number;
  status: 'ok' | 'error' | 'timeout';
  spans: SpanDto[];
  endTime: string;
}

export interface SpanDto extends DtoBase {
  traceId: string;
  parentId: string | null;
  operationName: string;
  duration: number;
  status: 'ok' | 'error';
  tags: Record<string, string>;
  logs: SpanLogDto[];
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
