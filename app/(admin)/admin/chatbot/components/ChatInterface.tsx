"use client";

import React, { useRef, useEffect } from "react";
import { ChatMessage } from "@/types/chatbot";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isSending: boolean;
  onSend: (e: React.FormEvent) => void;
  renderFormattedMessage: (content: string) => React.ReactNode;
}

export function ChatInterface({
  messages,
  input,
  setInput,
  isSending,
  onSend,
  renderFormattedMessage,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            <p>Start a conversation...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-200"
                  }`}
                >
                  {renderFormattedMessage(msg.content)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="border-t border-gray-800 p-4">
        <form onSubmit={onSend} className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isSending}
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={isSending || !input.trim()}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
