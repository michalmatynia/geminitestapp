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
} from '@/shared/contracts/database';

// Re-export shared DTOs as feature-specific types for backward compatibility
export type DatabaseType = DatabaseTypeDto;
export type DatabasePreviewMode = DatabasePreviewModeDto;

// Database transport aliases mapped to shared DTOs.
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

// ── SQL / CRUD operation types ──

export type SqlQueryField = SqlQueryFieldDto;

export type SqlQueryResult = SqlQueryResultDto;

export type CrudOperation = CrudOperationDto;

export type CrudRequest = CrudRequestDto;

export type CrudResult = CrudResultDto;

export type DatabasePreviewPayload = DatabasePreviewPayloadDto;
