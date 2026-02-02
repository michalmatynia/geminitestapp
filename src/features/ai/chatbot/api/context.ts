import type { ChatbotContextSegment } from "../types";
import { readErrorMessage } from "./client";

export const uploadChatbotContextPdf = async (file: File): Promise<{ segments: ChatbotContextSegment[] }> => {
  const formData = new FormData();
  formData.append("file", file, file.name);
  const res = await fetch("/api/chatbot/context", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const message = await readErrorMessage(res, "Failed to parse PDF.");
    throw new Error(message);
  }
  return (await res.json()) as { segments: ChatbotContextSegment[] };
};
