import { JSX, Suspense } from "react";

import { AdminChatbotPage } from "@/features/ai/chatbot";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <AdminChatbotPage />
    </Suspense>
  );
}
