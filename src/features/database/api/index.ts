import type {
  DatabaseBackupResponse,
  DatabaseInfo,
  DatabasePreviewGroup,
  DatabasePreviewMode,
  DatabasePreviewPayload,
  DatabasePreviewRow,
  DatabasePreviewTable,
  DatabaseRestoreResponse,
  DatabaseType,
} from "../types";
import { withCsrfHeaders } from "@/shared/lib/security/csrf-client";

const safeJson = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
};

const normalizeGroups = (
  groups?: Record<string, string[]> | DatabasePreviewGroup[]
): DatabasePreviewGroup[] => {
  if (!groups) return [];
  if (Array.isArray(groups)) return groups;
  return Object.entries(groups).map(([type, objects]: [string, string[]]) => ({
    type,
    objects,
  }));
};

type PreviewApiResponse = DatabasePreviewPayload & {
  stats?: {
    groups?: Record<string, string[]>;
    tables?: DatabasePreviewTable[];
  };
  data?: DatabasePreviewRow[];
};

export const fetchDatabaseBackups = async (
  dbType: DatabaseType
): Promise<DatabaseInfo[]> => {
  const res = await fetch(`/api/databases/backups?type=${dbType}`);
  if (!res.ok) {
    throw new Error("Failed to fetch backups");
  }
  return res.json() as Promise<DatabaseInfo[]>;
};

export const createDatabaseBackup = async (dbType: DatabaseType): Promise<{ ok: boolean; payload: DatabaseBackupResponse }> => {
  const res = await fetch(`/api/databases/backup?type=${dbType}`, {
    method: "POST",
    headers: withCsrfHeaders(),
  });
  const payload = await safeJson<DatabaseBackupResponse>(res);
  return { ok: res.ok, payload };
};

export const restoreDatabaseBackup = async (
  dbType: DatabaseType,
  input: { backupName: string; truncateBeforeRestore: boolean }
): Promise<{ ok: boolean; payload: DatabaseRestoreResponse }> => {
  const res = await fetch(`/api/databases/restore?type=${dbType}`, {
    method: "POST",
    headers: withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      backupName: input.backupName,
      truncateBeforeRestore: input.truncateBeforeRestore,
    }),
  });
  const payload = await safeJson<DatabaseRestoreResponse>(res);
  return { ok: res.ok, payload };
};

export const uploadDatabaseBackup = async (
  dbType: DatabaseType,
  file: File,
  onProgress?: (loaded: number, total?: number) => void
): Promise<{ ok: boolean; payload: DatabaseBackupResponse }> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", dbType);
  const { uploadWithProgress } = await import("@/shared/utils/upload-with-progress");
  const result = await uploadWithProgress<DatabaseBackupResponse>("/api/databases/upload", {
    formData,
    onProgress,
  });
  return { ok: result.ok, payload: result.data };
};

export const deleteDatabaseBackup = async (
  dbType: DatabaseType,
  backupName: string
): Promise<{ ok: boolean; payload: DatabaseBackupResponse }> => {
  const res = await fetch("/api/databases/delete", {
    method: "POST",
    headers: withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ backupName, type: dbType }),
  });
  const payload = await safeJson<DatabaseBackupResponse>(res);
  return { ok: res.ok, payload };
};

export const fetchDatabasePreview = async (input: {
  backupName?: string | undefined;
  mode?: DatabasePreviewMode | undefined;
  type?: DatabaseType | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}): Promise<{ ok: boolean; payload: DatabasePreviewPayload }> => {
  const res = await fetch("/api/databases/preview", {
    method: "POST",
    headers: withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      backupName: input.backupName,
      mode: input.mode,
      type: input.type,
      page: input.page,
      pageSize: input.pageSize,
    }),
  });
  const raw = await safeJson<PreviewApiResponse>(res);
  const groups = normalizeGroups(raw.groups ?? raw.stats?.groups);
  const tables = raw.tables ?? raw.stats?.tables ?? [];
  const tableRows = raw.tableRows ?? raw.data ?? [];
  const finalPage = raw.page ?? input.page;
  const finalPageSize = raw.pageSize ?? input.pageSize;
  const payload: DatabasePreviewPayload = {
    ...raw,
    groups,
    tables,
    tableRows,
    ...(finalPage !== undefined ? { page: finalPage } : {}),
    ...(finalPageSize !== undefined ? { pageSize: finalPageSize } : {}),
  };
  return { ok: res.ok, payload };
};
