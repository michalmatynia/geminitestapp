import { DtoBase } from '../types/base';

// Agent Runtime DTOs
export interface AgentRuntimeDto extends DtoBase {
  name: string;
  status: 'idle' | 'running' | 'error' | 'stopped';
  config: Record<string, unknown>;
  lastActivity: string | null;
}

export interface AgentExecutionDto extends DtoBase {
  runtimeId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error: string | null;
  duration: number | null;
  completedAt: string | null;
}

export interface CreateAgentRuntimeDto {
  name: string;
  config: Record<string, unknown>;
}

export interface UpdateAgentRuntimeDto {
  name?: string;
  config?: Record<string, unknown>;
  status?: 'idle' | 'running' | 'error' | 'stopped';
}

export interface ExecuteAgentRuntimeDto {
  runtimeId: string;
  input: Record<string, unknown>;
}
