import { JSX } from 'react';

import { AdminAiPathsQueuePage } from '@/features/ai/ai-paths/pages/AdminAiPathsQueuePage';
import { FileUploadEventsPanel } from '@/features/files';
import { KangurSocialPipelineQueuePanel } from '@/features/kangur/admin/admin-kangur-social/KangurSocialPipelineQueuePanel';

export default function Page(): JSX.Element {
  return (
    <AdminAiPathsQueuePage
      fileUploadsPanel={<FileUploadEventsPanel />}
      kangurSocialPanel={<KangurSocialPipelineQueuePanel />}
    />
  );
}
