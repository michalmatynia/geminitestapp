import type { ActivityLogDto, CreateActivityLogDto } from '@/shared/dtos/system';

export type ActivityFilters = {
  userId?: string;
  type?: string;
  entityId?: string;
  entityType?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type ActivityRepository = {
  listActivity(filters: ActivityFilters): Promise<ActivityLogDto[]>;
  countActivity(filters: ActivityFilters): Promise<number>;
  createActivity(data: CreateActivityLogDto): Promise<ActivityLogDto>;
  deleteActivity(id: string): Promise<void>;
};
