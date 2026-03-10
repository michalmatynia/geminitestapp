'use client';

import { useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';

import { AgentCreatorSettingsProvider } from '@/features/ai/agentcreator';
import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/features/ai/ai-context-registry/context/page-context';
import { Tabs, TabsContent, TabsList, TabsTrigger, LoadingState, Card } from '@/shared/ui';

import { ChatbotDebugPanel } from '../components/ChatbotDebugPanel';
import { ChatInterface } from '../components/ChatInterface';
import { SessionSidebar } from '../components/SessionSidebar';
import { SettingsTab } from '../components/SettingsTab';
import {
  useChatbotMessages,
  useChatbotSessions,
  useChatbotSettings,
  useChatbotUI,
  ChatbotProvider,
} from '../context/ChatbotContext';
import {
  buildChatbotWorkspaceContextBundle,
  CHATBOT_CONTEXT_ROOT_IDS,
} from '../context-registry/workspace';

function ChatbotPageInner(): React.JSX.Element | null {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = React.useState<boolean>(false);
  const [activeTab, setActiveTab] = React.useState<string>('chat');
  const { messages } = useChatbotMessages();
  const { sessions, currentSessionId } = useChatbotSessions();
  const {
    personaId,
    webSearchEnabled,
    useGlobalContext,
    useLocalContext,
    globalContext,
    localContext,
    localContextMode,
  } = useChatbotSettings();
  const { latestAgentRunId } = useChatbotUI();

  const registrySource = React.useMemo(
    () => ({
      label: 'Chatbot workspace state',
      resolved: buildChatbotWorkspaceContextBundle({
        activeTab,
        messages,
        sessions,
        currentSessionId,
        personaId,
        webSearchEnabled,
        useGlobalContext,
        useLocalContext,
        globalContext,
        localContext,
        localContextMode,
        latestAgentRunId,
      }),
    }),
    [
      activeTab,
      currentSessionId,
      globalContext,
      latestAgentRunId,
      localContext,
      localContextMode,
      messages,
      personaId,
      sessions,
      useGlobalContext,
      useLocalContext,
      webSearchEnabled,
    ]
  );

  useRegisterContextRegistryPageSource('chatbot-workspace-state', registrySource);

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
      <h1 className='sr-only'>Chatbot</h1>
      <div className='grid h-full grid-cols-1 gap-6 lg:grid-cols-5'>
        {/* Session Sidebar */}
        <Card className='hidden overflow-hidden border-border/60 bg-card/40 p-0 lg:block'>
          <SessionSidebar />
        </Card>

        {/* Main Chat Area */}
        <Card className='flex flex-col overflow-hidden border-border/60 bg-card/40 p-0 lg:col-span-3'>
          <Tabs value={activeTab} onValueChange={setActiveTab} className='flex h-full flex-col'>
            <div className='border-b border-border/60 bg-muted/40 px-4 py-2'>
              <TabsList className='bg-card' aria-label='Chatbot workspace tabs'>
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
        </Card>
        <Card className='hidden overflow-hidden border-border/60 bg-card/40 p-0 lg:block'>
          <ChatbotDebugPanel />
        </Card>
      </div>
    </div>
  );
}

export default function ChatbotPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingState message='Loading chatbot...' />}>
      <AgentCreatorSettingsProvider>
        <ContextRegistryPageProvider
          pageId='admin:chatbot'
          title='Admin Chatbot'
          rootNodeIds={[...CHATBOT_CONTEXT_ROOT_IDS]}
        >
          <ChatbotProvider>
            <ChatbotPageInner />
          </ChatbotProvider>
        </ContextRegistryPageProvider>
      </AgentCreatorSettingsProvider>
    </Suspense>
  );
}
