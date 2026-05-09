import { AdminRouteLoading } from '@/features/admin/public';
import { type JSX, Suspense } from 'react';

import { AdminChatbotContextPage } from '@/features/ai/admin.public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <AdminChatbotContextPage />
    </Suspense>
  );
}
