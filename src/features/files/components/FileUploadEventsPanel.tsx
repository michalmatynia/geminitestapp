'use client';

import React from 'react';

import {  } from '@/shared/ui';

import { FileUploadEventsProvider } from '../contexts/FileUploadEventsContext';
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

      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>

        <FileUploadEventsHeader title={title} description={description} />

        <FileUploadEventsFilters />

        <FileUploadEventsTable />

        <FileUploadEventsPagination />

      </div>

    </FileUploadEventsProvider>

  );

}
