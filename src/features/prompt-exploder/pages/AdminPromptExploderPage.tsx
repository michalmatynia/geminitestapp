'use client';

import React from 'react';
import { useEffect, useState } from 'react';

import { Alert, Button, ListPanel, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

import { BenchmarkReportPanel } from '../components/BenchmarkReportPanel';
import { BindingsPanel } from '../components/BindingsPanel';
import { DocsTooltipEnhancer } from '../components/DocsTooltipEnhancer';
import { ExplosionMetricsPanel } from '../components/ExplosionMetricsPanel';
import { ParserTuningSection } from '../components/ParserTuningSection';
import { PatternRuntimePanel } from '../components/PatternRuntimePanel';
import { PromptExploderDocsTab } from '../components/PromptExploderDocsTab';
import { PromptExploderHeaderBar } from '../components/PromptExploderHeaderBar';
import { PromptProjectsPanel } from '../components/PromptProjectsPanel';
import { ReassembledPromptPanel } from '../components/ReassembledPromptPanel';
import { SegmentEditorPanel } from '../components/SegmentEditorPanel';
import { SourcePromptPanel } from '../components/SourcePromptPanel';
import { WarningsPanel } from '../components/WarningsPanel';
import { PromptExploderProvider } from '../context';
import { usePromptExploderDocsTooltips } from '../hooks/usePromptExploderDocsTooltips';

type PromptExploderErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

class PromptExploderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  PromptExploderErrorBoundaryState
> {
  override state: PromptExploderErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown): PromptExploderErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown Prompt Exploder error.',
    };
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className='space-y-3'>
        <Alert variant='error'>
          Prompt Exploder encountered a runtime error: {this.state.errorMessage ?? 'Unknown error'}
        </Alert>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
        >
          Reload Prompt Exploder
        </Button>
      </div>
    );
  }
}

const PROMPT_EXPLODER_ACTIVE_TAB_KEY = 'prompt_exploder:active_tab';

export function AdminPromptExploderPage(): React.JSX.Element {
  const { docsTooltipsEnabled, setDocsTooltipsEnabled } = usePromptExploderDocsTooltips();
  const [activeTab, setActiveTab] = useState<'workspace' | 'docs'>('workspace');
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
    if (storedTab === 'docs') setActiveTab('docs');
  }, [mounted]);

  const handleTabChange = (value: string): void => {
    const nextTab = value === 'docs' ? 'docs' : 'workspace';
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
        <div id='prompt-exploder-docs-root'>
          <ListPanel
            header={
              <PromptExploderHeaderBar
                docsTooltipsEnabled={docsTooltipsEnabled}
                onDocsTooltipsChange={setDocsTooltipsEnabled}
              />
            }
          >
            <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full space-y-4'>
              <TabsList className='grid h-auto w-full grid-cols-2 gap-2 border border-border/60 bg-card/30 p-2'>
                <TabsTrigger value='workspace' className='h-10'>
                  Workspace
                </TabsTrigger>
                <TabsTrigger value='docs' className='h-10'>
                  Docs
                </TabsTrigger>
              </TabsList>

              <TabsContent value='workspace' className='space-y-4'>
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

              <TabsContent value='docs'>
                <PromptExploderDocsTab />
              </TabsContent>
            </Tabs>
          </ListPanel>
        </div>
        <DocsTooltipEnhancer rootId='prompt-exploder-docs-root' enabled={docsTooltipsEnabled} />
      </PromptExploderProvider>
    </PromptExploderErrorBoundary>
  );
}
