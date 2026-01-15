"use client";

import React, { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChatbotLogic } from "./hooks/useChatbotLogic";
import { ChatInterface } from "./components/ChatInterface";
import { SettingsTab } from "./components/SettingsTab";
import { DebugPanel } from "./components/DebugPanel";

function ChatbotPageInner() {
  const logic = useChatbotLogic();
  const {
    messages,
    input,
    setInput,
    isSending,
    debugState,
  } = logic;

  const renderInline = (text: string) => {
    const parts = text.split("**");
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <strong key={index}>{part}</strong>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  const renderFormattedMessage = (content: string) => {
    const lines = content.split("\n");
    const blocks: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = (key: string) => {
      if (listItems.length === 0) return;
      blocks.push(
        <ul key={key} className="list-disc space-y-1 pl-5">
          {listItems.map((item, index) => (
            <li key={`${key}-item-${index}`}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList(`list-${index}`);
        blocks.push(<div key={`spacer-${index}`} className="h-2" />);
        return;
      }

      if (trimmed.startsWith("### ")) {
        flushList(`list-${index}`);
        blocks.push(
          <h3 key={`h3-${index}`} className="text-sm font-semibold text-white">
            {renderInline(trimmed.slice(4))}
          </h3>
        );
        return;
      }

      if (trimmed.startsWith("## ")) {
        flushList(`list-${index}`);
        blocks.push(
          <h2 key={`h2-${index}`} className="text-base font-semibold text-white">
            {renderInline(trimmed.slice(3))}
          </h2>
        );
        return;
      }

      if (trimmed.startsWith("# ")) {
        flushList(`list-${index}`);
        blocks.push(
          <h1 key={`h1-${index}`} className="text-lg font-semibold text-white">
            {renderInline(trimmed.slice(2))}
          </h1>
        );
        return;
      }

      if (trimmed.startsWith("- ")) {
        listItems.push(trimmed.slice(2));
        return;
      }

      flushList(`list-${index}`);
      blocks.push(
        <p key={`p-${index}`} className="leading-relaxed text-slate-100">
          {renderInline(trimmed)}
        </p>
      );
    });

    flushList("list-final");
    return <div className="space-y-2">{blocks}</div>;
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementation of sending logic would be here
  };

  return (
    <div className="container mx-auto h-[calc(100vh-120px)] py-6">
      <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="flex flex-col overflow-hidden rounded-lg border border-gray-800 bg-gray-950 lg:col-span-3">
          <Tabs defaultValue="chat" className="flex h-full flex-col">
            <div className="border-b border-gray-800 bg-gray-900/50 px-4 py-2">
              <TabsList className="bg-gray-950">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="chat" className="h-full m-0 p-0">
                <ChatInterface
                  messages={messages}
                  input={input}
                  setInput={setInput}
                  isSending={isSending}
                  onSend={handleSend}
                  renderFormattedMessage={renderFormattedMessage}
                />
              </TabsContent>
              <TabsContent value="settings" className="h-full m-0 overflow-y-auto">
                <SettingsTab {...logic} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
        <div className="hidden overflow-hidden rounded-lg border border-gray-800 bg-gray-950 lg:block">
          <DebugPanel
            debugState={debugState}
            agentRunLogs={[]}
            agentRunAudits={[]}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChatbotPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
      <ChatbotPageInner />
    </Suspense>
  );
}
