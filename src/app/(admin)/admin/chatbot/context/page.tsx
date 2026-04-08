import { AdminRouteLoading } from '@/features/admin/public';
import { JSX, Suspense } from 'react';

import { AdminChatbotContextPage } from '@/features/ai/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <AdminChatbotContextPage />
    </Suspense>
  );
}
