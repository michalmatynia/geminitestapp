import { Suspense } from "react";
import { AdminChatbotContextPage } from "@/features/chatbot";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <AdminChatbotContextPage />
    </Suspense>
  );
}
