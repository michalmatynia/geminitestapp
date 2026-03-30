import { JSX, Suspense } from 'react';

import { AdminChatbotContextPage } from '@/features/ai/chatbot/public';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <AdminChatbotContextPage />
    </Suspense>
  );
}
