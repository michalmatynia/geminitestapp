// Agent Runtime DTOs
export interface AgentRuntimeDto {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'error' | 'stopped';
  config: Record<string, unknown>;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentExecutionDto {
  id: string;
  runtimeId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error: string | null;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
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
