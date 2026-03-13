'use client';

import React, { useMemo, useState } from 'react';

import { buildDiffLines } from '@/features/cms/components/page-builder/utils/ai-helpers';
import {
  Button,
  ToggleRow,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Input,
  FormSection,
  FormField,
} from '@/shared/ui';

import { useInspectorAiActions, useInspectorAiState } from '../context/InspectorAiContext';

// ---------------------------------------------------------------------------
// CssAiSection component — renders the CSS AI assistant panel
// ---------------------------------------------------------------------------

function CssAiSection(): React.JSX.Element {
  const {
    customCssValue,
    cssAiOutput,
    cssAiError,
    cssAiLoading,
    cssAiAutoApply,
    cssAiAppend,
    customCssAiConfig,
    contextPreviewOpen,
    contextPreviewTab,
    contextPreviewFull,
    pageContextPreview,
    elementContextPreview,
    brainAiProvider,
    brainAiModelId,
    brainAiAgentId,
  } = useInspectorAiState();
  const {
    setCssAiAutoApply,
    setCssAiAppend,
    generateCss,
    cancelCss,
    applyCss,
    updateCustomCssAiConfig,
    setContextPreviewOpen,
    setContextPreviewTab,
    setContextPreviewFull,
    setContextPreviewNonce,
    copyContext,
  } = useInspectorAiActions();

  const [cssAiDiffOnly, setCssAiDiffOnly] = useState<boolean>(true);
  const contextPlaceholder = '{{page_context}}\n{{element_context}}';

  const cssDiff = useMemo(() => {
    if (!cssAiOutput) return null;
    return buildDiffLines(customCssValue, cssAiOutput);
  }, [cssAiOutput, customCssValue]);

  const cssDiffLines = useMemo(() => {
    if (!cssDiff) return [];
    return cssAiDiffOnly
      ? cssDiff.lines.filter(
        (line: { type: 'add' | 'remove' | 'same'; text: string }) => line.type !== 'same'
      )
      : cssDiff.lines;
  }, [cssDiff, cssAiDiffOnly]);

  const cssDiffStats = useMemo(() => {
    if (!cssDiff) return { added: 0, removed: 0, same: 0 };
    return cssDiff.lines.reduce(
      (
        acc: { added: number; removed: number; same: number },
        line: { type: 'add' | 'remove' | 'same'; text: string }
      ) => {
        if (line.type === 'add') acc.added += 1;
        else if (line.type === 'remove') acc.removed += 1;
        else acc.same += 1;
        return acc;
      },
      { added: 0, removed: 0, same: 0 }
    );
  }, [cssDiff]);

  return (
    <FormSection
      title='CSS AI Assistant'
      actions={<span className='text-[10px] text-gray-500'>Optional</span>}
      variant='subtle-compact'
      className='p-3 space-y-4'
    >
      <div className='space-y-4 mt-4'>
        <FormField label='Provider' description='Brain-managed via CMS CSS Stream capability.'>
          <Input
            value={brainAiProvider === 'agent' ? 'Deepthinking agent' : 'AI model'}
            readOnly
            disabled
            aria-label='Provider'
            className='cursor-not-allowed'
          />
        </FormField>
        <FormField label={brainAiProvider === 'agent' ? 'Deepthinking agent' : 'Model'}>
          <Input
            value={
              brainAiProvider === 'agent'
                ? brainAiAgentId || 'Not configured in AI Brain'
                : brainAiModelId || 'Not configured in AI Brain'
            }
            readOnly
            disabled
            aria-label={brainAiProvider === 'agent' ? 'Deepthinking agent' : 'Model'}
            className='cursor-not-allowed'
          />
        </FormField>
        <FormField label='Prompt' description={`Context: ${contextPlaceholder}`}>
          <Textarea
            value={customCssAiConfig.prompt ?? ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
              updateCustomCssAiConfig({ prompt: e.target.value })
            }
            aria-label='CSS prompt'
            placeholder={`Describe the CSS you want.\n\nContext:\n${contextPlaceholder}`}
            className='min-h-[120px] text-xs'
            spellCheck={false}
          />
        </FormField>
        <div className='flex items-center justify-between'>
          <div className='text-[11px] text-gray-500'>Context placeholders</div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={(): void => {
              const current = (customCssAiConfig.prompt ?? '').trim();
              const nextPrompt = current.length
                ? `${current}\n\n${contextPlaceholder}`
                : contextPlaceholder;
              updateCustomCssAiConfig({ prompt: nextPrompt });
            }}
          >
            Insert placeholders
          </Button>
        </div>
        <Textarea
          value={contextPlaceholder}
          readOnly
          aria-label='Context placeholders'
          className='min-h-[64px] text-xs font-mono text-gray-300'
        />
        <div className='text-[11px] text-gray-500'>
          <span className='font-mono text-gray-300'>page_context</span> = full page UI context,{' '}
          <span className='font-mono text-gray-300'>element_context</span> = selected element
          details.
        </div>

        <FormSection title='Context preview' variant='subtle' className='p-2 space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-2 mt-2'>
            <ToggleRow
              label='Full context'
              checked={contextPreviewFull}
              onCheckedChange={(value: boolean) => setContextPreviewFull(value)}
              className='bg-transparent border-none p-0 hover:bg-transparent'
              labelClassName='text-[11px] text-gray-300'
            />
            <div className='flex gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={(): void => setContextPreviewNonce((prev: number) => prev + 1)}
              >
                Refresh
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={(): void => setContextPreviewOpen(!contextPreviewOpen)}
              >
                {contextPreviewOpen ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>
          {contextPreviewOpen ? (
            <Tabs
              value={contextPreviewTab}
              onValueChange={(value: string): void =>
                setContextPreviewTab(value as 'page' | 'element')
              }
              className='mt-3'
            >
              <TabsList className='w-full' aria-label='CSS AI context tabs'>
                <TabsTrigger value='page' className='flex-1 text-xs'>
                  Page
                </TabsTrigger>
                <TabsTrigger value='element' className='flex-1 text-xs'>
                  Element
                </TabsTrigger>
              </TabsList>
              <TabsContent value='page' className='mt-2 space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-[11px] text-gray-400'>Full page context</span>
                  <Button
                    type='button'
                    size='sm'
                    variant='ghost'
                    onClick={(): void => void copyContext(pageContextPreview)}
                  >
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={pageContextPreview}
                  readOnly
                  aria-label='Page context preview'
                  className='min-h-[160px] text-xs font-mono text-gray-300'
                />
              </TabsContent>
              <TabsContent value='element' className='mt-2 space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-[11px] text-gray-400'>Selected element context</span>
                  <Button
                    type='button'
                    size='sm'
                    variant='ghost'
                    onClick={(): void => void copyContext(elementContextPreview)}
                  >
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={elementContextPreview}
                  readOnly
                  aria-label='Element context preview'
                  className='min-h-[160px] text-xs font-mono text-gray-300'
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className='mt-2 text-[11px] text-gray-500'>
              Preview the raw context payloads used for AI prompts.
            </div>
          )}
        </FormSection>

        <div className='flex flex-wrap items-center justify-between gap-2'>
          <ToggleRow
            label='Auto-apply on generate'
            checked={cssAiAutoApply}
            onCheckedChange={(value: boolean) => setCssAiAutoApply(value)}
            className='bg-transparent border-none p-0 hover:bg-transparent'
            labelClassName='text-xs text-gray-300'
          />
          <Button
            type='button'
            size='sm'
            onClick={(): void => void generateCss()}
            disabled={cssAiLoading}
          >
            {cssAiLoading ? 'Generating\u2026' : 'Generate CSS'}
          </Button>
          {cssAiLoading && (
            <Button type='button' size='sm' variant='outline' onClick={cancelCss}>
              Cancel
            </Button>
          )}
        </div>
        {cssAiAutoApply && (
          <ToggleRow
            label='Append when auto-applying'
            checked={cssAiAppend}
            onCheckedChange={(value: boolean) => setCssAiAppend(value)}
            className='bg-transparent border-none p-0 hover:bg-transparent'
            labelClassName='text-xs text-gray-300'
          />
        )}
        {cssAiError && <div className='text-xs text-red-400'>{cssAiError}</div>}
        {cssAiOutput && (
          <FormSection title='Last generated CSS' variant='subtle' className='p-3 space-y-3 mt-4'>
            <div className='flex items-center justify-between mt-2'>
              <span className='text-xs text-gray-400'>Apply result</span>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={(): void => applyCss('append')}
                >
                  Append
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={(): void => applyCss('replace')}
                >
                  Replace
                </Button>
              </div>
            </div>
            <Textarea
              value={cssAiOutput}
              readOnly
              aria-label='Generated CSS'
              className='min-h-[120px] text-xs font-mono text-gray-300'
            />
            <div className='rounded border border-border/40 bg-gray-900/40 p-2'>
              <div className='flex items-center justify-between text-[11px] text-gray-400'>
                <div className='flex items-center gap-3'>
                  <span>Diff</span>
                  <span className='text-emerald-300'>+{cssDiffStats.added}</span>
                  <span className='text-rose-300'>-{cssDiffStats.removed}</span>
                  <span className='text-gray-500'>={cssDiffStats.same}</span>
                </div>
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  onClick={(): void => setCssAiDiffOnly((prev: boolean) => !prev)}
                >
                  {cssAiDiffOnly ? 'Changes only' : 'Show all'}
                </Button>
              </div>
              <div className='mt-2 max-h-48 overflow-auto rounded bg-black/40 p-2 font-mono text-[11px]'>
                {cssDiffLines.length > 0 ? (
                  cssDiffLines.map(
                    (line: { type: 'add' | 'remove' | 'same'; text: string }, index: number) => {
                      const prefix =
                        line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  ';
                      const colorClass =
                        line.type === 'add'
                          ? 'text-emerald-300'
                          : line.type === 'remove'
                            ? 'text-rose-300'
                            : 'text-gray-300';
                      return (
                        <div
                          key={`${line.type}-${index}`}
                          className={`whitespace-pre ${colorClass}`}
                        >
                          {prefix}
                          {line.text}
                        </div>
                      );
                    }
                  )
                ) : (
                  <div className='text-gray-500'>No differences yet.</div>
                )}
                {cssDiff?.truncated ? (
                  <div className='mt-1 text-gray-500'>Diff truncated\u2026</div>
                ) : null}
              </div>
            </div>
          </FormSection>
        )}
      </div>
    </FormSection>
  );
}

export { CssAiSection };
