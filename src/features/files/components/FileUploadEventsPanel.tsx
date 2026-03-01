'use client';

import React from 'react';

import { FileUploadEventsProvider } from '../contexts/FileUploadEventsContext';
import { FileUploadEventsPanelProvider } from './file-upload-events/context/FileUploadEventsPanelContext';
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
        <FileUploadEventsTable />
      </FileUploadEventsPanelProvider>
    </FileUploadEventsProvider>
  );
}
