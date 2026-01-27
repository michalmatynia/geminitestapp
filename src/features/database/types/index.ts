export type DatabaseType = "postgresql" | "mongodb";

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

export type DatabasePreviewMode = "backup" | "current";

export type DatabasePreviewGroup = { type: string; objects: string[] };
export type DatabasePreviewTable = { name: string; rowEstimate: number };
export type DatabasePreviewRow = {
  name: string;
  rows: Record<string, unknown>[];
  totalRows: number;
};

export type DatabasePreviewPayload = {
  content?: string;
  groups?: DatabasePreviewGroup[];
  tables?: DatabasePreviewTable[];
  tableRows?: DatabasePreviewRow[];
  page?: number;
  pageSize?: number;
  error?: string;
  errorId?: string;
  stage?: string;
  backupName?: string;
  mode?: string;
};
