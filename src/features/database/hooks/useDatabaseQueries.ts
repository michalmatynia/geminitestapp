"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { DatabasePreviewPayload, DatabasePreviewMode } from "../types";
import { fetchDatabasePreview } from "../api";

export function useDatabasePreview(input: {
  backupName?: string;
  mode?: DatabasePreviewMode;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}): UseQueryResult<DatabasePreviewPayload, Error> {
  const { backupName, mode, page, pageSize, enabled = true } = input;

  return useQuery({
    queryKey: ["database-preview", { backupName, mode, page, pageSize }],
    queryFn: async () => {
      const { ok, payload } = await fetchDatabasePreview({
        backupName,
        mode,
        page,
        pageSize,
      });
      if (!ok) {
        const error = new Error(payload.error || "Failed to fetch database preview");
        (error as Error & { payload: unknown }).payload = payload;
        throw error;
      }
      return payload;
    },
    enabled: enabled && (!!backupName || mode === "current"),
  });
}
