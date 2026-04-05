import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';

import { FileUploadEventsPanel } from '../components/FileUploadEventsPanel';

export default function FileUploadEventsPage(): React.JSX.Element {
  return (
    <div className='page-section'>
      <SectionHeader
        title='File Upload Events'
        description='Audit uploads and failures across the platform.'
        className='mb-6'
      />
      <FileUploadEventsPanel />
    </div>
  );
}
