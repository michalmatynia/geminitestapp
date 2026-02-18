import type { ActivityLogDto, CreateActivityLogDto, ActivityFiltersDto } from '@/shared/contracts/system';

export type ActivityFilters = ActivityFiltersDto;

export type ActivityRepository = {
  listActivity(filters: ActivityFilters): Promise<ActivityLogDto[]>;
  countActivity(filters: ActivityFilters): Promise<number>;
  createActivity(data: CreateActivityLogDto): Promise<ActivityLogDto>;
  deleteActivity(id: string): Promise<void>;
};
