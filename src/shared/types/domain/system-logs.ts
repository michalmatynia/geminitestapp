import type { 
  SystemLogLevelDto, 
  SystemLogRecordDto, 
  SystemLogMetricsDto,
  CreateSystemLogInputDto,
  ListSystemLogsResultDto,
} from '../../contracts/observability';

export type SystemLogLevel = SystemLogLevelDto;

export type SystemLogRecord = SystemLogRecordDto;

export type SystemLogMetrics = SystemLogMetricsDto;

export type CreateSystemLogInput = Omit<CreateSystemLogInputDto, 'createdAt'> & {
  createdAt?: Date;
};

export type ListSystemLogsResult = ListSystemLogsResultDto;
