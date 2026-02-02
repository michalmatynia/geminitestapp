import { JSX, Suspense } from "react";

import { AdminChatbotContextPage } from "@/features/ai/chatbot";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <AdminChatbotContextPage />
    </Suspense>
  );
}
