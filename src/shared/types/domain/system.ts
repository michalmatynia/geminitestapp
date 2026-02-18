import type {
  LogLevelDto,
  SystemLogInputDto,
  ListSystemLogsInputDto,
  ListSystemLogsResultDto,
  AppDbProviderDto,
  MigrationDirectionDto,
  MigrationBatchResultDto,
} from '../../contracts/system';

export type LogLevel = LogLevelDto;

export type SystemLogInput = SystemLogInputDto;

export type CreateSystemLogInput = SystemLogInput;

export type ListSystemLogsInput = ListSystemLogsInputDto;

export type ListSystemLogsResult = ListSystemLogsResultDto;

export type AppDbProvider = AppDbProviderDto;

export type MigrationDirection = MigrationDirectionDto;

export type MigrationBatchResult = MigrationBatchResultDto;
