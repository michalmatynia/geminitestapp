// DTO type exports
export type {
  DatabaseInfoDto,
  DatabaseBackupDto,
  DatabaseRestoreDto,
  CreateBackupDto,
  DatabaseSchemaDto,
  DatabaseTableDto,
  DatabaseColumnDto,
  DatabaseIndexDto,
  DatabaseConstraintDto
} from '@/shared/dtos';

export type DatabaseType = 'postgresql' | 'mongodb';
export type DatabasePreviewMode = 'backup' | 'current';

// Integration domain record types
export type DatabaseInfo = {
  name: string;
  size: string;
  created: string;
  createdAt: string;
  lastModified: string;
  lastModifiedAt: string;
  lastRestored?: string | undefined;
};

export type DatabaseBackupResponse = {
  message?: string;
  backupName?: string;
  log?: string;
  warning?: string;
  error?: string;
  errorId?: string;
  stage?: string;
};

export type DatabaseRestoreResponse = {
  message?: string;
  log?: string;
  error?: string;
  errorId?: string;
  stage?: string;
  backupName?: string;
};

export type DatabasePreviewGroup = { type: string; objects: string[] };
export type DatabasePreviewTable = { name: string; rowEstimate: number };
export type DatabasePreviewRow = {
  name: string;
  rows: Record<string, unknown>[];
  totalRows: number;
};

export type DatabaseColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
};

export type DatabaseIndexInfo = {
  name: string;
  columns: string[];
  isUnique: boolean;
  definition: string;
};

export type DatabaseForeignKeyInfo = {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: string;
  onUpdate: string;
};

export type DatabaseEnumInfo = {
  name: string;
  values: string[];
};

export type DatabaseTableDetail = {
  name: string;
  columns: DatabaseColumnInfo[];
  indexes: DatabaseIndexInfo[];
  foreignKeys: DatabaseForeignKeyInfo[];
  rowEstimate: number;
  sizeBytes: number;
  sizeFormatted: string;
};

// ── SQL / CRUD operation types ──

export type SqlQueryField = {
  name: string;
  dataTypeID: number;
};

export type SqlQueryResult = {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: SqlQueryField[];
  command: string;
  duration: number;
  error?: string;
};

export type CrudOperation = 'insert' | 'update' | 'delete';

export type CrudRequest = {
  table: string;
  operation: CrudOperation;
  type: DatabaseType;
  data?: Record<string, unknown>;
  primaryKey?: Record<string, unknown>;
};

export type CrudResult = {
  success: boolean;
  rowCount: number;
  returning?: Record<string, unknown>[];
  error?: string;
};

export type DatabasePreviewPayload = {
  content?: string;
  groups?: DatabasePreviewGroup[];
  tables?: DatabasePreviewTable[];
  tableRows?: DatabasePreviewRow[];
  tableDetails?: DatabaseTableDetail[];
  enums?: DatabaseEnumInfo[];
  databaseSize?: string;
  page?: number;
  pageSize?: number;
  error?: string;
  errorId?: string;
  stage?: string;
  backupName?: string;
  mode?: string;
};
