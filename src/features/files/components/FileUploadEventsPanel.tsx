'use client';

import React from 'react';

import { FileUploadEventsProvider } from '../contexts/FileUploadEventsContext';
import { FileUploadEventsPanelProvider } from './file-upload-events/context/FileUploadEventsPanelContext';
import { FileUploadEventsFilters } from './file-upload-events/FileUploadEventsFilters';
import { FileUploadEventsHeader } from './file-upload-events/FileUploadEventsHeader';
import { FileUploadEventsPagination } from './file-upload-events/FileUploadEventsPagination';
import { FileUploadEventsTable } from './file-upload-events/FileUploadEventsTable';

type FileUploadEventsPanelProps = {
  title?: string;
  description?: string;
};

export function FileUploadEventsPanel({
  title = 'File Uploads Runtime',
  description = 'Track upload successes and failures across services.',
}: FileUploadEventsPanelProps): React.JSX.Element {
  return (
    <FileUploadEventsProvider>
      <FileUploadEventsPanelProvider value={{ title, description }}>
        <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
          <FileUploadEventsHeader />
          <FileUploadEventsFilters />
          <FileUploadEventsTable />
          <FileUploadEventsPagination />
        </div>
      </FileUploadEventsPanelProvider>
    </FileUploadEventsProvider>
  );
}
