import { JSX, Suspense } from 'react';

import AdminChatbotContextPage from '@/features/ai/chatbot/pages/AdminChatbotContextPage';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <AdminChatbotContextPage />
    </Suspense>
  );
}
