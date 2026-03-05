import React from 'react';

import { FileUploadEventsProvider } from '../contexts/FileUploadEventsContext';
import { FileUploadEventsPanelProvider } from './file-upload-events/context/FileUploadEventsPanelContext';
import { FileUploadEventsTable } from './file-upload-events/FileUploadEventsTable';

type FileUploadEventsPanelProps = {
  title?: string;
  description?: string;
};

export function FileUploadEventsPanel(props: FileUploadEventsPanelProps): React.JSX.Element {
  const {
    title = 'File Uploads Runtime',
    description = 'Track upload successes and failures across services.',
  } = props;

  return (
    <FileUploadEventsProvider>
      <FileUploadEventsPanelProvider value={{ title, description }}>
        <FileUploadEventsTable />
      </FileUploadEventsPanelProvider>
    </FileUploadEventsProvider>
  );
}
