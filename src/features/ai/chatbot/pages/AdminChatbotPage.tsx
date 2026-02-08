'use client';

import { useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';

import { AgentCreatorSettingsProvider } from '@/features/ai/agentcreator';
import { Tabs, TabsContent, TabsList, TabsTrigger, SectionPanel } from '@/shared/ui';

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
        <SectionPanel className='hidden overflow-hidden p-0 lg:block'>
          <SessionSidebar />
        </SectionPanel>

        {/* Main Chat Area */}
        <SectionPanel className='flex flex-col overflow-hidden p-0 lg:col-span-3'>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex h-full flex-col'
          >
            <div className='border-b bg-muted/40 px-4 py-2'>
              <TabsList className='bg-card'>
                <TabsTrigger value='chat'>Chat</TabsTrigger>
                <TabsTrigger value='settings'>Settings</TabsTrigger>
              </TabsList>
            </div>
            <div className='flex-1 overflow-hidden'>
              <TabsContent value='chat' className='h-full m-0 p-0'>
                <ChatInterface />
              </TabsContent>
              <TabsContent value='settings' className='h-full m-0 overflow-y-auto'>
                <SettingsTab />
              </TabsContent>
            </div>
          </Tabs>
        </SectionPanel>
        <SectionPanel className='hidden overflow-hidden p-0 lg:block'>
          <DebugPanel />
        </SectionPanel>
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

