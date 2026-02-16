'use client';

import React from 'react';

import { Button } from '@/shared/ui';

import { BenchmarkReportPanel } from '../components/BenchmarkReportPanel';
import { BindingsPanel } from '../components/BindingsPanel';
import { ExplosionMetricsPanel } from '../components/ExplosionMetricsPanel';
import { ParserTuningSection } from '../components/ParserTuningSection';
import { PatternRuntimePanel } from '../components/PatternRuntimePanel';
import { PromptExploderHeaderBar } from '../components/PromptExploderHeaderBar';
import { PromptProjectsPanel } from '../components/PromptProjectsPanel';
import { ReassembledPromptPanel } from '../components/ReassembledPromptPanel';
import { SegmentEditorPanel } from '../components/SegmentEditorPanel';
import { SourcePromptPanel } from '../components/SourcePromptPanel';
import { WarningsPanel } from '../components/WarningsPanel';
import { PromptExploderProvider } from '../context';

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
      <div className='container mx-auto space-y-3 py-8'>
        <div className='rounded border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100'>
          Prompt Exploder encountered a runtime error: {this.state.errorMessage ?? 'Unknown error'}
        </div>
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

export function AdminPromptExploderPage(): React.JSX.Element {
  return (
    <PromptExploderErrorBoundary>
      <PromptExploderProvider>
        <div className='container mx-auto space-y-5 py-6'>
          <PromptExploderHeaderBar />

          <div className='grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(380px,0.85fr)_minmax(640px,1.15fr)]'>
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
        </div>
      </PromptExploderProvider>
    </PromptExploderErrorBoundary>
  );
}
