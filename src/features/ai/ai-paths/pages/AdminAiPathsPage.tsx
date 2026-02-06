'use client';

import { useEffect, useState } from 'react';

import { Tabs, TabsList, TabsTrigger, SectionHeader, SectionPanel } from '@/shared/ui';

import { AiPathsSettings } from '../components/AiPathsSettings';



export function AdminAiPathsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'canvas' | 'paths' | 'docs'>(
    'canvas'
  );
  const [mounted, setMounted] = useState(false);

  useEffect((): void | (() => void) => {
    const id = requestAnimationFrame(() => setMounted(true));
    return (): void => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        {mounted ? (
          <Tabs
            value={activeTab}
            onValueChange={(value: string) =>
              setActiveTab(value as 'canvas' | 'paths' | 'docs')
            }
          >
            <TabsList className="bg-card/70">
              <TabsTrigger value="canvas">Canvas</TabsTrigger>
              <TabsTrigger value="paths">Paths</TabsTrigger>
              <TabsTrigger value="docs">Docs</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <div className="h-9 w-[180px]" />
        )}
        <div id="ai-paths-name" className="text-sm text-gray-300" />
      </div>
      <SectionPanel className="p-6">
        <SectionHeader
          title="AI Paths"
          actions={<div id="ai-paths-actions" className="flex items-center gap-3" />}
        />
        <AiPathsSettings
          activeTab={activeTab}
          renderActions={(actions: React.ReactNode) => (
            <div className="flex items-center gap-3">{actions}</div>
          )}
          onTabChange={setActiveTab}
        />
      </SectionPanel>
    </div>
  );
}
