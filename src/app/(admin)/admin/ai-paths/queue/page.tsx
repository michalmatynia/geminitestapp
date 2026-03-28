import { JSX } from 'react';

import { AdminAiPathsQueuePage } from '@/features/ai/ai-paths/pages/AdminAiPathsQueuePage';
import { FileUploadEventsPanel } from '@/features/files/public';
import { KangurSocialPipelineQueuePanel } from '@/features/kangur/public';

export default function Page(): JSX.Element {
  return (
    <AdminAiPathsQueuePage
      fileUploadsPanel={<FileUploadEventsPanel />}
      kangurSocialPanel={<KangurSocialPipelineQueuePanel />}
    />
  );
}
