import { AdminRouteLoading } from '@/features/admin/public';
import { JSX, Suspense } from 'react';

import { AdminChatbotPage } from '@/features/ai/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <AdminChatbotPage />
    </Suspense>
  );
}
