import { JSX, Suspense } from 'react';

import { AdminNotesNotebooksPage } from '@/features/notesapp';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <AdminNotesNotebooksPage />
    </Suspense>
  );
}
