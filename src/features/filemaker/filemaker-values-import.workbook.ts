import { importFilemakerLegacyValueRows } from './filemaker-values-import';
import { parseFilemakerLegacyValueWorkbookRows } from './filemaker-values-import.parser';
import type {
  FilemakerLegacyValueImportOptions,
  FilemakerLegacyValuesImportResult,
} from './filemaker-values-import';
import type { FilemakerDatabase } from './types';

export const importFilemakerLegacyValuesWorkbook = async (
  database: FilemakerDatabase | null | undefined,
  input: ArrayBuffer | Uint8Array,
  options: FilemakerLegacyValueImportOptions = {}
): Promise<FilemakerLegacyValuesImportResult> =>
  importFilemakerLegacyValueRows(
    database,
    await parseFilemakerLegacyValueWorkbookRows(input),
    options
  );
