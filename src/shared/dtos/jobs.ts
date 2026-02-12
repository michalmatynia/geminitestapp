import type { Status } from '@/shared/types/core/base-types';

import { DtoBase, CreateDto, UpdateDto } from '../types/base';

export interface JobDto extends DtoBase {
  type: string;
  status: Status;
  progress?: number;
  data?: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  priority?: number;
}

export interface ProductAiJobDto extends JobDto {
  productId: string;
  operation?: 'generate_description' | 'optimize_images' | 'categorize' | 'tag_generation';
  aiModel?: string;
  parameters?: Record<string, unknown>;
}

export type CreateJobDto = CreateDto<JobDto>;
export type UpdateJobDto = UpdateDto<JobDto>;

export type CreateProductAiJobDto = CreateDto<ProductAiJobDto>;
export type UpdateProductAiJobDto = UpdateDto<ProductAiJobDto>;

export interface JobQueueStatsDto {
  running: boolean;
  healthy: boolean;
  processing: boolean;
  lastPollTime: number;
  timeSinceLastPoll: number;
}
