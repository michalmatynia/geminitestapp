import { DtoBase, NamedDto } from '../types/base';

import type { Status } from '../types/common';

/**
 * Types of nodes available in AI paths
 */
export type AiNodeTypeDto =
  | 'trigger'
  | 'simulation'
  | 'context'
  | 'audio_oscillator'
  | 'audio_speaker'
  | 'parser'
  | 'regex'
  | 'iterator'
  | 'mapper'
  | 'mutator'
  | 'string_mutator'
  | 'validator'
  | 'constant'
  | 'math'
  | 'template'
  | 'bundle'
  | 'gate'
  | 'compare'
  | 'router'
  | 'delay'
  | 'poll'
  | 'http'
  | 'prompt'
  | 'model'
  | 'agent'
  | 'learner_agent'
  | 'database'
  | 'db_schema'
  | 'viewer'
  | 'notification'
  | 'ai_description'
  | 'description_updater';

/**
 * DTO for an AI Path
 */
export interface AiPathDto extends NamedDto {
  nodes: AiNodeDto[];
  edges: AiEdgeDto[];
  config: Record<string, unknown>;
  enabled: boolean;
  version: number;
}

/**
 * DTO for a node in an AI Path
 */
export interface AiNodeDto extends DtoBase {
  type: AiNodeTypeDto;
  title: string;
  description: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  config: Record<string, unknown>;
  inputs: string[];
  outputs: string[];
}

/**
 * DTO for an edge in an AI Path
 */
export interface AiEdgeDto extends DtoBase {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: string;
  data: Record<string, unknown>;
}

/**
 * DTO for an AI Path run
 */
export interface AiPathRunDto extends DtoBase {
  pathId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  triggerNodeId: string;
  triggerEvent: string;
  context: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * DTO for a node execution within a run
 */
export interface AiPathRunNodeDto extends DtoBase {
  runId: string;
  nodeId: string;
  nodeType: string;
  status: Status | 'skipped' | 'blocked';
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

/**
 * DTO for a cluster preset
 */
export interface AiClusterPresetDto extends NamedDto {
  bundlePorts: string[];
  template: string;
}

/**
 * DTO for a database query preset
 */
export interface AiDbQueryPresetDto extends NamedDto {
  queryTemplate: string;
  updateTemplate?: string;
}

/**
 * DTO for a database node preset
 */
export interface AiDbNodePresetDto extends NamedDto {
  config: Record<string, unknown>;
}

/**
 * DTO for creating an AI Path
 */
export interface CreateAiPathDto {
  name: string;
  description?: string | null;
  nodes?: AiNodeDto[];
  edges?: AiEdgeDto[];
  config?: Record<string, unknown>;
  enabled?: boolean;
}

/**
 * DTO for updating an AI Path
 */
export interface UpdateAiPathDto {
  name?: string;
  description?: string | null;
  nodes?: AiNodeDto[];
  edges?: AiEdgeDto[];
  config?: Record<string, unknown>;
  enabled?: boolean;
  version?: number;
}

/**
 * DTO for executing an AI Path
 */
export interface ExecuteAiPathDto {
  pathId: string;
  triggerNodeId?: string;
  triggerEvent?: string;
  context?: Record<string, unknown>;
}
