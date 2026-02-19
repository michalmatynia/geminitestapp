import type {
  DatabaseBackupFileDto,
  DatabaseBackupOperationResponseDto,
  DatabaseRestoreOperationResponseDto,
  DatabaseTypeDto,
  DatabasePreviewModeDto,
  DatabasePreviewGroupDto,
  DatabasePreviewTableDto,
  DatabasePreviewRowDto,
  DatabaseTableDetailDto,
  DatabaseColumnInfoDto,
  DatabaseIndexInfoDto,
  DatabaseForeignKeyInfoDto,
  DatabaseEnumInfoDto,
  SqlQueryFieldDto,
  SqlQueryResultDto,
  CrudOperationDto,
  CrudRequestDto,
  CrudResultDto,
  DatabasePreviewPayloadDto,
  DatabaseEngineBackupTargetScheduleDto,
  DatabaseEngineBackupScheduleDto,
} from '../../contracts/database';

export type {
  DatabaseBackupFileDto,
  DatabaseBackupOperationResponseDto,
  DatabaseRestoreOperationResponseDto,
  DatabaseTypeDto,
  DatabasePreviewModeDto,
  DatabasePreviewGroupDto,
  DatabasePreviewTableDto,
  DatabasePreviewRowDto,
  DatabaseTableDetailDto,
  DatabaseColumnInfoDto,
  DatabaseIndexInfoDto,
  DatabaseForeignKeyInfoDto,
  DatabaseEnumInfoDto,
  SqlQueryFieldDto,
  SqlQueryResultDto,
  CrudOperationDto,
  CrudRequestDto,
  CrudResultDto,
  DatabasePreviewPayloadDto,
  DatabaseEngineBackupTargetScheduleDto,
  DatabaseEngineBackupScheduleDto,
};

export type DatabaseType = DatabaseTypeDto;
export type DatabasePreviewMode = DatabasePreviewModeDto;

export type DatabaseInfo = DatabaseBackupFileDto;
export type DatabaseBackupResponse = DatabaseBackupOperationResponseDto;
export type DatabaseRestoreResponse = DatabaseRestoreOperationResponseDto;

export type DatabasePreviewGroup = DatabasePreviewGroupDto;
export type DatabasePreviewTable = DatabasePreviewTableDto;
export type DatabasePreviewRow = DatabasePreviewRowDto;

export type DatabaseColumnInfo = DatabaseColumnInfoDto;

export type DatabaseIndexInfo = DatabaseIndexInfoDto;

export type DatabaseForeignKeyInfo = DatabaseForeignKeyInfoDto;

export type DatabaseEnumInfo = DatabaseEnumInfoDto;

export type DatabaseTableDetail = DatabaseTableDetailDto;

export type SqlQueryField = SqlQueryFieldDto;

export type SqlQueryResult = SqlQueryResultDto;

export type CrudOperation = CrudOperationDto;

export type CrudRequest = CrudRequestDto;

export type CrudResult = CrudResultDto;

export type DatabasePreviewPayload = DatabasePreviewPayloadDto;

export type DatabaseEngineBackupTargetSchedule = DatabaseEngineBackupTargetScheduleDto;

export type DatabaseEngineBackupSchedule = DatabaseEngineBackupScheduleDto;
