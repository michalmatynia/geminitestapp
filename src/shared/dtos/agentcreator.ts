// Use consolidated types
import { NamedDto, DtoBase } from '../types/base';
import type { Status } from '@/shared/types/core/base-types';

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

export interface AgentLogDto {
  id: string;
  runId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data: Record<string, unknown> | null;
  timestamp: string;
}

export interface AgentPersonaDto extends NamedDto {
  settings: Record<string, unknown>;
}

export interface CreateAgentDto {
  name: string;
  description?: string;
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface UpdateAgentDto {
  name?: string;
  description?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface ExecuteAgentDto {
  agentId: string;
  input: Record<string, unknown>;
}
