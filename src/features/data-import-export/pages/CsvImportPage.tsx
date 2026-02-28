'use client';

import React, { useState } from 'react';

import { useCsvImportMutation } from '@/features/data-import-export/hooks/useImportMutations';
import { Button, useToast, FileUploadButton, PanelHeader } from '@/shared/ui';

const CSVImportPage = (): React.JSX.Element => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const importMutation = useCsvImportMutation();

  const handleFileChange = (files: File[]): void => {
    setFile(files[0] || null);
  };

  const handleSubmit = async (helpers?: {
    reportProgress: (loaded: number, total?: number) => void;
  }): Promise<void> => {
    if (!file) {
      toast('Please select a file', { variant: 'error' });
      return;
    }

    try {
      await importMutation.mutateAsync({
        file,
        onProgress: (loaded: number, total?: number) => helpers?.reportProgress(loaded, total),
      });
      toast('Import successful', { variant: 'success' });
      setFile(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Import failed', { variant: 'error' });
    }
  };

  return (
    <div className='space-y-6'>
      <PanelHeader title='Import Products from CSV' />
      <div className='flex w-full max-w-sm items-center space-x-2'>
        <FileUploadButton
          onFilesSelected={(files: File[]) => handleFileChange(files)}
          accept='.csv'
        >
          Choose CSV
        </FileUploadButton>
        <Button
          onClick={() => {
            void handleSubmit();
          }}
          disabled={importMutation.isPending}
        >
          {importMutation.isPending ? 'Importing...' : 'Import'}
        </Button>
      </div>
    </div>
  );
};

export default CSVImportPage;
