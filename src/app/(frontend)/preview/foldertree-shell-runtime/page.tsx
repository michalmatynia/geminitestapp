import { Suspense } from 'react';

import { FolderTreeShellRuntimePreviewClient } from '@/shared/lib/foldertree/public';

export const dynamic = 'force-dynamic';

export default function FolderTreeShellRuntimePreviewPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className='mx-auto max-w-3xl space-y-4 p-6'>
          <h1 className='text-xl font-semibold'>Folder Tree Shell Runtime Lifecycle Preview</h1>
          <p className='text-sm text-muted-foreground'>Loading preview runtime...</p>
        </div>
      }
    >
      <FolderTreeShellRuntimePreviewClient />
    </Suspense>
  );
}
