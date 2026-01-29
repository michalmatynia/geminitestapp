import { Suspense } from "react";
import { AdminChatbotContextPage } from "@/features/chatbot";
import type { JSX } from "react";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <AdminChatbotContextPage />
    </Suspense>
  );
}
