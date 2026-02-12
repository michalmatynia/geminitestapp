import { DtoBase, CreateDto, UpdateDto } from '../types/base';

// Agent Runtime DTOs
export interface AgentRuntimeDto extends DtoBase {
  name: string;
  status: 'idle' | 'running' | 'error' | 'stopped';
  config: Record<string, unknown>;
  lastActivity: string | null;
}

export type CreateAgentRuntimeDto = CreateDto<AgentRuntimeDto>;
export type UpdateAgentRuntimeDto = UpdateDto<AgentRuntimeDto>;

export interface AgentExecutionDto extends DtoBase {
  runtimeId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error: string | null;
  duration: number | null;
  completedAt: string | null;
}

export type CreateAgentExecutionDto = CreateDto<AgentExecutionDto>;
export type UpdateAgentExecutionDto = UpdateDto<AgentExecutionDto>;

export interface ExecuteAgentRuntimeDto {
  runtimeId: string;
  input: Record<string, unknown>;
}
