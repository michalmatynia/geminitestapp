'use client';

import { SectionHeader } from '@/shared/ui';

import { FileUploadEventsPanel } from '../components/FileUploadEventsPanel';

export default function FileUploadEventsPage(): React.JSX.Element {
  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='File Upload Events'
        description='Audit uploads and failures across the platform.'
        className='mb-6'
      />
      <FileUploadEventsPanel />
    </div>
  );
}
