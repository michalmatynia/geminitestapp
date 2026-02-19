import type { 
  SystemLogLevelDto, 
  SystemLogRecordDto, 
  SystemLogMetricsDto,
  CreateSystemLogInputDto,
  ListSystemLogsInputDto,
  ListSystemLogsResultDto,
} from '../../contracts/observability';

export type SystemLogLevel = SystemLogLevelDto;

export type SystemLogRecord = SystemLogRecordDto;

export type SystemLogMetrics = SystemLogMetricsDto;

export type CreateSystemLogInput = Omit<CreateSystemLogInputDto, 'createdAt'> & {
  createdAt?: Date;
};

export type ListSystemLogsInput = Omit<ListSystemLogsInputDto, 'from' | 'to'> & {
  from?: Date | null;
  to?: Date | null;
};

export type ListSystemLogsResult = ListSystemLogsResultDto;
