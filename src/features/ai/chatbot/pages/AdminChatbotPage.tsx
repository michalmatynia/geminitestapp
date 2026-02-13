'use client';

import { useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';

import { AgentCreatorSettingsProvider } from '@/features/ai/agentcreator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

import { ChatInterface } from '../components/ChatInterface';
import { DebugPanel } from '../components/DebugPanel';
import { SessionSidebar } from '../components/SessionSidebar';
import { SettingsTab } from '../components/SettingsTab';
import { ChatbotProvider } from '../context/ChatbotContext';

function ChatbotPageInner(): React.JSX.Element | null {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<string>('chat');

  React.useEffect((): void => {
    setMounted(true);
    const tab = searchParams.get('tab');
    if (tab === 'settings') {
      setActiveTab('settings');
    }
  }, [searchParams]);

  if (!mounted) {
    return null;
  }

  return (
    <div className='container mx-auto h-[calc(100vh-120px)] py-6'>
      <div className='grid h-full grid-cols-1 gap-6 lg:grid-cols-5'>
        {/* Session Sidebar */}
        <div className='hidden overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0 lg:block'>
          <SessionSidebar />
        </div>

        {/* Main Chat Area */}
        <div className='flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0 lg:col-span-3'>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex h-full flex-col'
          >
            <div className='border-b border-border/60 bg-muted/40 px-4 py-2'>
              <TabsList className='bg-card'>
                <TabsTrigger value='chat'>Chat</TabsTrigger>
                <TabsTrigger value='settings'>Settings</TabsTrigger>
              </TabsList>
            </div>
            <div className='flex-1 overflow-hidden'>
              <TabsContent value='chat' className='h-full m-0 p-0 outline-none'>
                <ChatInterface />
              </TabsContent>
              <TabsContent value='settings' className='h-full m-0 overflow-y-auto outline-none'>
                <SettingsTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
        <div className='hidden overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0 lg:block'>
          <DebugPanel />
        </div>
      </div>
    </div>
  );
}

export default function ChatbotPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className='p-8 text-white'>Loading...</div>}>
      <AgentCreatorSettingsProvider>
        <ChatbotProvider>
          <ChatbotPageInner />
        </ChatbotProvider>
      </AgentCreatorSettingsProvider>
    </Suspense>
  );
}

