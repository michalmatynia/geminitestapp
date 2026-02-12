// Use consolidated types
import type { Status } from '@/shared/types/core/base-types';

import { NamedDto, DtoBase, CreateDto, UpdateDto } from '../types/base';

// Agent Creator DTOs
export interface AgentDto extends NamedDto {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface AgentRunDto extends DtoBase {
  agentId: string;
  status: Status;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  logs: AgentLogDto[];
  error: string | null;
  completedAt: string | null;
}

export interface AgentLogDto extends DtoBase {
  runId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data: Record<string, unknown> | null;
}

export interface AgentPersonaDto extends NamedDto {
  settings: Record<string, unknown>;
}

export type CreateAgentDto = CreateDto<AgentDto>;
export type UpdateAgentDto = UpdateDto<AgentDto>;

export type CreateAgentRunDto = CreateDto<AgentRunDto>;
export type UpdateAgentRunDto = UpdateDto<AgentRunDto>;

export type CreateAgentLogDto = CreateDto<AgentLogDto>;
export type UpdateAgentLogDto = UpdateDto<AgentLogDto>;

export type CreateAgentPersonaDto = CreateDto<AgentPersonaDto>;
export type UpdateAgentPersonaDto = UpdateDto<AgentPersonaDto>;

export interface ExecuteAgentDto {
  agentId: string;
  input: Record<string, unknown>;
}
