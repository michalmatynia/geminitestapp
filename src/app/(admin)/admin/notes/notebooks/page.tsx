import { JSX, Suspense } from 'react';

import { AdminNotesNotebooksPage } from '@/features/notesapp/public';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <AdminNotesNotebooksPage />
    </Suspense>
  );
}
