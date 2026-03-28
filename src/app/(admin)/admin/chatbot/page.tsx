import { JSX, Suspense } from 'react';

import AdminChatbotPage from '@/features/ai/chatbot/pages/AdminChatbotPage';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <AdminChatbotPage />
    </Suspense>
  );
}
