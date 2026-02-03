import { JSX, Suspense } from "react";

import { AdminChatbotContextPage } from "@/features/ai/chatbot";

export const dynamic = "force-dynamic";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <AdminChatbotContextPage />
    </Suspense>
  );
}
