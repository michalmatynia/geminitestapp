import { Suspense } from "react";
import { AdminChatbotContextPage } from "@/features/chatbot";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminChatbotContextPage />
    </Suspense>
  );
}
