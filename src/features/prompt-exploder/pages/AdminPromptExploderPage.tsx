'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { 
  Button, 
  EmptyState, 
  FormSection, 
  SectionHeader, 
  Textarea, 
} from '@/shared/ui';

import { PromptExploderHierarchyTreeProvider } from '../components/PromptExploderHierarchyTreeContext';
import { PromptExploderParserTuningProvider } from '../components/PromptExploderParserTuningContext';
import { PromptExploderParserTuningPanel } from '../components/PromptExploderParserTuningPanel';
import { usePromptExploderState } from '../hooks/usePromptExploderState';
import { 
  resolveSegmentDisplayLabel,
} from '../utils/case-resolver-extraction';

import type { 
  PromptExploderSegment,
} from '../types';

export function AdminPromptExploderPage(): React.JSX.Element {
  const state = usePromptExploderState();
  const {
    promptText,
    setPromptText,
    documentState,
    selectedSegmentId,
    setSelectedSegmentId,
    handleExplode,
    handleApplyToBridge,
    returnTo,
    activeValidationScope,
  } = state;

  const router = useRouter();

  // Sub-render helpers (simplified for this refactor phase)
  const renderHeader = () => (
    <SectionHeader
      title='Prompt Exploder'
      description={'Active scope: ' + activeValidationScope}
      actions={
        <div className='flex items-center gap-2'>
          <Button size='xs' variant='outline' onClick={() => router.push(returnTo)}>
            Back
          </Button>
          <Button size='xs' onClick={handleExplode}>
            Explode Prompt
          </Button>
          <Button size='xs' variant='default' onClick={handleApplyToBridge} disabled={!documentState}>
            Apply & Return
          </Button>
        </div>
      }
    />
  );

  return (
    <PromptExploderHierarchyTreeProvider value={{
      items: [],
      onChange: () => {},
      emptyLabel: 'No segments'
    }}>
      <PromptExploderParserTuningProvider>
        <div className='w-full space-y-5 px-4 py-6 xl:px-6 2xl:px-8'>
          {renderHeader()}

          <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
            {/* Input Section */}
            <div className='lg:col-span-5 space-y-4'>
              <FormSection title='Source Prompt' variant='subtle'>
                <Textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder='Enter prompt to explode...'
                  className='min-h-[400px] font-mono text-sm'
                />
              </FormSection>
            </div>

            {/* Results Section */}
            <div className='lg:col-span-7 space-y-4'>
              {documentState ? (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-lg font-medium text-white'>
                      Exploded Segments ({documentState.segments.length})
                    </h3>
                  </div>
                  
                  <div className='space-y-3'>
                    {documentState.segments.map((segment: PromptExploderSegment) => (
                      <div 
                        key={segment.id}
                        className={'cursor-pointer rounded-lg border p-3 transition-colors ' + (
                          selectedSegmentId === segment.id 
                            ? 'border-blue-500 bg-blue-500/10' 
                            : 'border-border bg-card/20 hover:bg-card/40'
                        )}
                        onClick={() => setSelectedSegmentId(segment.id)}
                      >
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-xs font-bold uppercase tracking-wider text-gray-400'>
                            {segment.type}
                          </span>
                          <span className='text-[10px] text-gray-500'>
                            {(segment.confidence * 100).toFixed(0)}% match
                          </span>
                        </div>
                        <div className='text-sm text-gray-200 line-clamp-2'>
                          {resolveSegmentDisplayLabel(segment)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title='No explosion yet'
                  description='Enter a prompt and click Explode to see the structured breakdown.'
                />
              )}
            </div>
          </div>

          {/* Modal for Parser Tuning */}
          <FormSection title='Parser Tuning' variant='subtle'>
            <PromptExploderParserTuningPanel />
          </FormSection>
        </div>
      </PromptExploderParserTuningProvider>
    </PromptExploderHierarchyTreeProvider>
  );
}
