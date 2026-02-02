// Database DTOs
export interface DatabaseInfoDto {
  name: string;
  type: 'postgresql' | 'mongodb';
  size: string;
  tables: number;
  lastBackup: string | null;
  status: 'healthy' | 'warning' | 'error';
}

export interface DatabaseBackupDto {
  id: string;
  name: string;
  type: 'postgresql' | 'mongodb';
  size: string;
  createdAt: string;
  path: string;
  status: 'completed' | 'failed' | 'in_progress';
}

export interface DatabaseRestoreDto {
  backupId: string;
  targetDatabase: string;
  options?: Record<string, unknown>;
}

export interface CreateBackupDto {
  name?: string;
  type: 'postgresql' | 'mongodb';
  options?: Record<string, unknown>;
}

export interface DatabaseSchemaDto {
  tables: DatabaseTableDto[];
  indexes: DatabaseIndexDto[];
  constraints: DatabaseConstraintDto[];
}

export interface DatabaseTableDto {
  name: string;
  columns: DatabaseColumnDto[];
  rowCount: number;
  size: string;
}

export interface DatabaseColumnDto {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
}

export interface DatabaseIndexDto {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
}

export interface DatabaseConstraintDto {
  name: string;
  table: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check';
  definition: string;
}
