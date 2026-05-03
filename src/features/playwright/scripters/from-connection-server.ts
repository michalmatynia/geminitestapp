import 'server-only';

import {
  findPlaywrightProgrammableIntegration,
  listPlaywrightProgrammableConnectionRecords,
  requirePlaywrightProgrammableConnectionById,
} from '@/features/playwright/server/programmable-storage';

import {
  importScripterFromConnection,
  type ConnectionImportResult,
} from './from-connection';

export type ListedProgrammableConnection = {
  id: string;
  name: string;
  playwrightImportBaseUrl: string | null;
  hasFieldMapper: boolean;
};

export const listProgrammableConnectionCandidates = async (): Promise<
  ListedProgrammableConnection[]
> => {
  const integration = await findPlaywrightProgrammableIntegration();
  if (!integration) return [];
  const records = await listPlaywrightProgrammableConnectionRecords(integration.id);
  return records.map((record) => ({
    id: record.id,
    name: record.name ?? record.id,
    playwrightImportBaseUrl: record.playwrightImportBaseUrl?.trim() || null,
    hasFieldMapper: Boolean(record.playwrightFieldMapperJson?.trim()),
  }));
};

export const importScripterFromConnectionId = async (
  connectionId: string,
  options: { siteHostHint?: string | null } = {}
): Promise<ConnectionImportResult> => {
  const { connection } = await requirePlaywrightProgrammableConnectionById({
    connectionId,
    errorMessage:
      'Only programmable integrations can be imported into scripters.',
  });
  return importScripterFromConnection({
    connectionId: connection.id,
    name: connection.name ?? null,
    playwrightImportBaseUrl: connection.playwrightImportBaseUrl ?? null,
    playwrightFieldMapperJson: connection.playwrightFieldMapperJson ?? null,
    siteHostHint: options.siteHostHint ?? null,
  });
};
