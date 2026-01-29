import { Suspense } from "react";
import { AdminChatbotPage } from "@/features/chatbot";
import type { JSX } from "react";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <AdminChatbotPage />
    </Suspense>
  );
}
