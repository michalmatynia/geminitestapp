'use client';

import React, { useEffect, useState } from 'react';

import { DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';
import {
  DocsTooltipEnhancer,
  ListPanel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';

import { PromptExploderLibraryTab } from '../components/PromptExploderLibraryTab';
import { PromptExploderProvider } from '../context';
import { usePromptExploderDocsTooltips } from '../hooks/usePromptExploderDocsTooltips';

import {
  BindingsPanel,
  ExplosionMetricsPanel,
  PromptProjectsPanel,
  ReassembledPromptPanel,
  SegmentEditorPanel,
  SourcePromptPanel,
  WarningsPanel,
  PromptExploderErrorBoundary,
  PromptExploderHeaderBar,
  PROMPT_EXPLODER_ACTIVE_TAB_KEY,
  PromptExploderDocsTab,
  PatternRuntimePanel,
  ParserTuningSection,
  BenchmarkReportPanel,
} from './admin-prompt-exploder';

export default function AdminPromptExploderPage(): React.JSX.Element {
  const { docsTooltipsEnabled, setDocsTooltipsEnabled } = usePromptExploderDocsTooltips();
  const [activeTab, setActiveTab] = useState<'workspace' | 'library' | 'docs'>('workspace');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const storedTab = window.localStorage.getItem(PROMPT_EXPLODER_ACTIVE_TAB_KEY);
    if (storedTab === 'library') {
      setActiveTab('library');
      return;
    }
    if (storedTab === 'docs') setActiveTab('docs');
  }, [mounted]);

  const handleTabChange = (value: string): void => {
    const nextTab = value === 'docs' ? 'docs' : value === 'library' ? 'library' : 'workspace';
    setActiveTab(nextTab);
    window.localStorage.setItem(PROMPT_EXPLODER_ACTIVE_TAB_KEY, nextTab);
  };

  if (!mounted) {
    return (
      <ListPanel
        header={
          <div className='space-y-1'>
            <h1 className='text-lg font-semibold text-white'>Prompt Exploder</h1>
            <p className='text-sm text-gray-400'>Loading workspace…</p>
          </div>
        }
      >
        <div className='grid grid-cols-1 gap-4 xl:grid-cols-[minmax(380px,0.85fr)_minmax(640px,1.15fr)]'>
          <div className='space-y-4'>
            <div className='h-40 rounded border border-border/60 bg-card/20' />
            <div className='h-24 rounded border border-border/60 bg-card/20' />
            <div className='h-24 rounded border border-border/60 bg-card/20' />
          </div>
          <div className='space-y-4'>
            <div className='h-56 rounded border border-border/60 bg-card/20' />
            <div className='h-24 rounded border border-border/60 bg-card/20' />
            <div className='h-40 rounded border border-border/60 bg-card/20' />
          </div>
        </div>
      </ListPanel>
    );
  }

  return (
    <PromptExploderErrorBoundary>
      <PromptExploderProvider>
        <div id='prompt-exploder-docs-root' className='flex h-full flex-col min-h-0'>
          <ListPanel
            className='flex flex-1 flex-col min-h-0'
            contentClassName='flex-1 min-h-0'
            header={
              <PromptExploderHeaderBar
                docsTooltipsEnabled={docsTooltipsEnabled}
                onDocsTooltipsChange={setDocsTooltipsEnabled}
              />
            }
          >
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className='flex flex-1 flex-col min-h-0 w-full space-y-4'
            >
              <TabsList
                className='grid h-auto w-full grid-cols-3 gap-2 border border-border/60 bg-card/30 p-2'
                aria-label='Prompt exploder tabs'
              >
                <TabsTrigger value='workspace' className='h-10'>
                  Workspace
                </TabsTrigger>
                <TabsTrigger value='library' className='h-10'>
                  Library
                </TabsTrigger>
                <TabsTrigger value='docs' className='h-10'>
                  Docs
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value='workspace'
                className='flex-1 min-h-0 overflow-y-auto space-y-4 pb-4'
              >
                <div className='grid grid-cols-1 gap-4 xl:grid-cols-[minmax(380px,0.85fr)_minmax(640px,1.15fr)]'>
                  <div className='space-y-4'>
                    <SourcePromptPanel />
                    <ExplosionMetricsPanel />
                    <WarningsPanel />
                    <PromptProjectsPanel />
                  </div>
                  <div className='space-y-4'>
                    <SegmentEditorPanel />
                    <BindingsPanel />
                    <ReassembledPromptPanel />
                  </div>
                </div>

                <PatternRuntimePanel />
                <ParserTuningSection />
                <BenchmarkReportPanel />
              </TabsContent>

              <TabsContent
                value='library'
                className='flex-1 min-h-0 overflow-y-auto space-y-4 pb-4'
              >
                <PromptExploderLibraryTab />
              </TabsContent>

              <TabsContent value='docs' className='flex-1 min-h-0 overflow-y-auto'>
                <PromptExploderDocsTab />
              </TabsContent>
            </Tabs>
          </ListPanel>
        </div>
        <DocsTooltipEnhancer
          rootId='prompt-exploder-docs-root'
          enabled={docsTooltipsEnabled}
          moduleId={DOCUMENTATION_MODULE_IDS.promptExploder}
          fallbackDocId='workflow_overview'
        />
      </PromptExploderProvider>
    </PromptExploderErrorBoundary>
  );
}
