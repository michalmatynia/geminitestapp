import { AdminRouteLoading } from '@/features/admin/public';
import { JSX, Suspense } from 'react';

import { AdminNotesNotebooksPage } from '@/features/notesapp/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <AdminNotesNotebooksPage />
    </Suspense>
  );
}
