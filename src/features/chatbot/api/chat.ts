import type { ChatMessage } from "@/types/chatbot";

export const sendChatbotMessage = async (payload: {
  messages: ChatMessage[];
  model: string;
  sessionId?: string | null;
}) => {
  const res = await fetch("/api/chatbot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to send message");
  }
  return (await res.json()) as { message?: string };
};
