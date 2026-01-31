"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger, SectionPanel } from "@/shared/ui";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";


import { useChatbotLogic } from "../hooks/useChatbotLogic";
import { ChatInterface } from "../components/ChatInterface";
import { SettingsTab } from "../components/SettingsTab";
import { DebugPanel } from "../components/DebugPanel";
import { SessionSidebar } from "../components/SessionSidebar";

function ChatbotPageInner(): React.JSX.Element | null {
  const logic = useChatbotLogic();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<string>("chat");

  React.useEffect((): void => {
    setMounted(true);
    const tab = searchParams.get("tab");
    if (tab === "settings") {
      setActiveTab("settings");
    }
  }, [searchParams]);

  const {
    messages,
    input,
    setInput,
    isSending,
    sendMessage,
    debugState,
  } = logic;

  const renderInline = (text: string): React.ReactNode[] => {
    const parts = text.split("**");
    return parts.map((part: string, index: number): React.ReactNode =>
      index % 2 === 1 ? (
        <strong key={index}>{part}</strong>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  const renderFormattedMessage = (content: string): React.JSX.Element => {
    const lines = content.split("\n");
    const blocks: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = (key: string): void => {
      if (listItems.length === 0) return;
      blocks.push(
        <ul key={key} className="list-disc space-y-1 pl-5">
          {listItems.map((item: string, index: number): React.JSX.Element => (
            <li key={`${key}-item-${index}`}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    };

    lines.forEach((line: string, index: number): void => {
      const trimmed: string = line.trim();
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

  const handleSend = (e: React.FormEvent): void => {
    e.preventDefault();
    void sendMessage();
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="container mx-auto h-[calc(100vh-120px)] py-6">
      <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Session Sidebar */}
        <SectionPanel className="hidden overflow-hidden p-0 lg:block">
          <SessionSidebar
            sessions={logic.sessions}
            currentSessionId={logic.currentSessionId}
            onSelectSession={logic.selectSession}
            onNewSession={(): void => void logic.createNewSession()}
            onDeleteSession={(id: string): void => void logic.deleteSession(id)}
          />
        </SectionPanel>

        {/* Main Chat Area */}
        <SectionPanel className="flex flex-col overflow-hidden p-0 lg:col-span-3">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex h-full flex-col"
          >
            <div className="border-b bg-muted/40 px-4 py-2">
              <TabsList className="bg-card">
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
        </SectionPanel>
        <SectionPanel className="hidden overflow-hidden p-0 lg:block">
          <DebugPanel
            debugState={debugState}
            agentRunLogs={[]}
          />
        </SectionPanel>
      </div>
    </div>
  );
}

export default function ChatbotPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
      <ChatbotPageInner />
    </Suspense>
  );
}
