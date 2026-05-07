import { type JSX } from 'react';

import { AdminAiPathsQueuePage } from '@/features/ai/public';
import { FilemakerSocialPipelineQueuePanel } from '@/features/filemaker/public';
import { FileUploadEventsPanel } from '@/features/files/public';

export default function Page(): JSX.Element {
  return (
    <AdminAiPathsQueuePage
      fileUploadsPanel={<FileUploadEventsPanel />}
      socialPublishingPanel={<FilemakerSocialPipelineQueuePanel />}
    />
  );
}
