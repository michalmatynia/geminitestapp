'use client';

import { Upload } from 'lucide-react';
import React, { useCallback } from 'react';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { FileUploadButton, type FileUploadHelpers } from '@/shared/ui/forms-and-actions.public';
import { useToast } from '@/shared/ui/primitives.public';

import {
  assertBrowserOrganiserImportFileSize,
  toBrowserOrganiserImportPersistedValue,
} from '../filemaker-organisers-import.limits';
import {
  FILEMAKER_DATABASE_KEY,
  importFilemakerLegacyOrganisersExport,
  importFilemakerLegacyOrganisersWorkbook,
  parseFilemakerDatabase,
} from '../settings';
import type { FilemakerDatabase } from '../types';

const ORGANISER_IMPORT_ACCEPT = [
  '.csv',
  '.tsv',
  '.xlsx',
  '.xls',
  'text/csv',
  'text/tab-separated-values',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
].join(',');

type ImportOrganiserFileButtonProps = {
  disabled: boolean;
  onError: (error: unknown) => void;
  onFilesSelected: (files: File[], helpers?: FileUploadHelpers) => Promise<void>;
};

const isWorkbookImportFile = (file: File): boolean => {
  if (/\.(csv|tsv)$/i.test(file.name)) return false;
  if (/\.(xlsx|xls)$/i.test(file.name)) return true;
  return (
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  );
};

function ImportOrganiserFileButton(props: ImportOrganiserFileButtonProps): React.JSX.Element {
  return (
    <FileUploadButton
      variant='outline'
      size='sm'
      className='h-8'
      accept={ORGANISER_IMPORT_ACCEPT}
      multiple={false}
      showProgress={false}
      disabled={props.disabled}
      onFilesSelected={props.onFilesSelected}
      onError={props.onError}
    >
      <Upload className='mr-1 size-4' />
      Import Organisers
    </FileUploadButton>
  );
}

async function importOrganiserFile(input: {
  file: File;
  helpers?: FileUploadHelpers;
  rawDatabase: unknown;
  updateSetting: ReturnType<typeof useUpdateSetting>;
}): Promise<number> {
  const { file, helpers, rawDatabase, updateSetting } = input;
  const database: FilemakerDatabase = parseFilemakerDatabase(rawDatabase);
  helpers?.setProgress(10);
  const result = isWorkbookImportFile(file)
    ? await importFilemakerLegacyOrganisersWorkbook(database, await file.arrayBuffer())
    : importFilemakerLegacyOrganisersExport(database, await file.text());
  helpers?.setProgress(70);
  await updateSetting.mutateAsync({
    key: FILEMAKER_DATABASE_KEY,
    value: toBrowserOrganiserImportPersistedValue(
      result.database,
      result.importedOrganizationCount
    ),
  });
  helpers?.setProgress(100);
  return result.importedOrganizationCount;
}

export function useFilemakerOrganiserImportAction(input: {
  rawDatabase: unknown;
  refetchSettings: () => void;
}): { importActions: React.ReactNode; isImporting: boolean } {
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const handleFilesSelected = useCallback(
    async (files: File[], helpers?: FileUploadHelpers): Promise<void> => {
      const file = files[0];
      if (!file) return;
      assertBrowserOrganiserImportFileSize(file);
      const count = await importOrganiserFile({
        file,
        helpers,
        rawDatabase: input.rawDatabase,
        updateSetting,
      });
      input.refetchSettings();
      toast(`Imported ${count} organisers from ${file.name}.`, { variant: 'success' });
    },
    [input, toast, updateSetting]
  );

  const handleImportError = useCallback(
    (error: unknown): void => {
      toast(error instanceof Error ? error.message : 'Failed to import organiser export.', {
        variant: 'error',
      });
    },
    [toast]
  );

  return {
    importActions: (
      <ImportOrganiserFileButton
        disabled={updateSetting.isPending}
        onError={handleImportError}
        onFilesSelected={handleFilesSelected}
      />
    ),
    isImporting: updateSetting.isPending,
  };
}
