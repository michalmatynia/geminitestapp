// AI Paths DTOs
export interface AiPathDto {
  id: string;
  name: string;
  description: string | null;
  nodes: AiNodeDto[];
  edges: AiEdgeDto[];
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiNodeDto {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  config: Record<string, unknown>;
}

export interface AiEdgeDto {
  id: string;
  source: string;
  target: string;
  type: string;
  data: Record<string, unknown>;
}

export interface AiPathRunDto {
  id: string;
  pathId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggerNode: string;
  triggerEvent: string;
  context: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreateAiPathDto {
  name: string;
  description?: string;
  nodes?: AiNodeDto[];
  edges?: AiEdgeDto[];
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface UpdateAiPathDto {
  name?: string;
  description?: string;
  nodes?: AiNodeDto[];
  edges?: AiEdgeDto[];
  config?: Record<string, unknown>;
  enabled?: boolean;
}

export interface ExecuteAiPathDto {
  pathId: string;
  triggerNode: string;
  triggerEvent: string;
  context?: Record<string, unknown>;
}
