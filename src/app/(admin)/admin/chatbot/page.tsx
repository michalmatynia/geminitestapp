import { Suspense } from "react";
import { AdminChatbotPage } from "@/features/chatbot";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <AdminChatbotPage />
    </Suspense>
  );
}
