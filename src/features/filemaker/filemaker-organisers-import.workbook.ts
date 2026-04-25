import { importFilemakerLegacyOrganiserRows } from './filemaker-organisers-import';
import { parseFilemakerLegacyOrganiserWorkbookRows } from './filemaker-organisers-import.parser';
import type {
  FilemakerLegacyOrganiserImportOptions,
  FilemakerLegacyOrganisersImportResult,
} from './filemaker-organisers-import';
import type { FilemakerDatabase } from './types';

export const importFilemakerLegacyOrganisersWorkbook = async (
  database: FilemakerDatabase | null | undefined,
  input: ArrayBuffer | Uint8Array,
  options: FilemakerLegacyOrganiserImportOptions = {}
): Promise<FilemakerLegacyOrganisersImportResult> =>
  importFilemakerLegacyOrganiserRows(
    database,
    await parseFilemakerLegacyOrganiserWorkbookRows(input),
    options
  );
