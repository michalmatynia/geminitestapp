import type { Status } from '@/shared/types/core/base-types';

import { DtoBase } from '../types/base';

export interface JobDto extends DtoBase {
  type: string;
  status: Status;
  progress?: number;
  data?: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ProductAiJobDto extends JobDto {
  productId: string;
  operation?: 'generate_description' | 'optimize_images' | 'categorize' | 'tag_generation';
  aiModel?: string;
  parameters?: Record<string, unknown>;
}

export interface CreateJobDto {
  type: string;
  data: Record<string, unknown>;
  priority?: number;
}

export interface UpdateJobDto {
  status?: Status;
  progress?: number;
  result?: Record<string, unknown>;
  error?: string;
}

export interface JobQueueStatsDto {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

export interface CreateProductAiJobDto {
  productId: string;
  operation: 'generate_description' | 'optimize_images' | 'categorize' | 'tag_generation';
  aiModel?: string;
  parameters?: Record<string, unknown>;
}
