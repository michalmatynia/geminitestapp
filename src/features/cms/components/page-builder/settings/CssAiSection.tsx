'use client';

import React, { useMemo, useState } from 'react';

import type { CustomCssAiProvider } from '@/features/cms/types/custom-css-ai';
import { Button, Label, Switch, Textarea, SectionPanel, Tabs, TabsList, TabsTrigger, TabsContent, UnifiedSelect, FormSection, FormField } from '@/shared/ui';

import { useInspectorAi } from '../context/InspectorAiContext';
import { buildDiffLines } from '../utils/ai-helpers';

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
    setCssAiAutoApply,
    cssAiAppend,
    setCssAiAppend,
    generateCss,
    cancelCss,
    applyCss,
    customCssAiConfig,
    updateCustomCssAiConfig,
    providerOptions,
    modelOptions,
    agentOptions,
    contextPreviewOpen,
    setContextPreviewOpen,
    contextPreviewTab,
    setContextPreviewTab,
    contextPreviewFull,
    setContextPreviewFull,
    setContextPreviewNonce,
    pageContextPreview,
    elementContextPreview,
    copyContext,
  } = useInspectorAi();

  const [cssAiDiffOnly, setCssAiDiffOnly] = useState<boolean>(true);
  const contextPlaceholder = '{{page_context}}\n{{element_context}}';

  const cssDiff = useMemo(() => {
    if (!cssAiOutput) return null;
    return buildDiffLines(customCssValue, cssAiOutput);
  }, [cssAiOutput, customCssValue]);

  const cssDiffLines = useMemo(() => {
    if (!cssDiff) return [];
    return cssAiDiffOnly ? cssDiff.lines.filter((line: { type: 'add' | 'remove' | 'same'; text: string }) => line.type !== 'same') : cssDiff.lines;
  }, [cssDiff, cssAiDiffOnly]);

  const cssDiffStats = useMemo(() => {
    if (!cssDiff) return { added: 0, removed: 0, same: 0 };
    return cssDiff.lines.reduce(
      (acc: { added: number; removed: number; same: number }, line: { type: 'add' | 'remove' | 'same'; text: string }) => {
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
        <FormField label='Provider'>
          <UnifiedSelect
            value={customCssAiConfig.provider ?? 'model'}
            onValueChange={(value: string): void =>
              updateCustomCssAiConfig({ provider: value as CustomCssAiProvider })
            }
            options={providerOptions}
            placeholder='Select provider'
          />
        </FormField>
        {customCssAiConfig.provider !== 'agent' ? (
          <FormField label='Model'>
            <UnifiedSelect
              value={customCssAiConfig.modelId ?? ''}
              onValueChange={(value: string): void =>
                updateCustomCssAiConfig({ modelId: value })
              }
              options={modelOptions.map((model: string) => ({ value: model, label: model }))}
              placeholder={modelOptions.length ? 'Select model' : 'No models available'}
            />
          </FormField>
        ) : (
          <FormField label='Deepthinking agent'>
            <UnifiedSelect
              value={customCssAiConfig.agentId ?? ''}
              onValueChange={(value: string): void =>
                updateCustomCssAiConfig({ agentId: value })
              }
              options={
                agentOptions.length
                  ? agentOptions
                  : [{ label: 'No agents configured', value: '' }]
              }
              placeholder={agentOptions.length ? 'Select agent' : 'No agents configured'}
            />
          </FormField>
        )}
        <FormField label='Prompt' description={`Context: ${contextPlaceholder}`}>
          <Textarea
            value={customCssAiConfig.prompt ?? ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
              updateCustomCssAiConfig({ prompt: e.target.value })
            }
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
          className='min-h-[64px] text-xs font-mono text-gray-300'
        />
        <div className='text-[11px] text-gray-500'>
          <span className='font-mono text-gray-300'>page_context</span> = full page UI context,{' '}
          <span className='font-mono text-gray-300'>element_context</span> = selected element details.
        </div>
        
        <FormSection title='Context preview' variant='subtle' className='p-2 space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-2 mt-2'>
            <div className='flex items-center gap-2'>
              <Switch
                checked={contextPreviewFull}
                onCheckedChange={(value: boolean | 'indeterminate'): void =>
                  setContextPreviewFull(value === true)
                }
              />
              <span className='text-[11px] text-gray-300'>Full context</span>
            </div>
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
              <TabsList className='w-full'>
                <TabsTrigger value='page' className='flex-1 text-xs'>Page</TabsTrigger>
                <TabsTrigger value='element' className='flex-1 text-xs'>Element</TabsTrigger>
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
          <div className='flex items-center gap-2'>
            <Switch
              checked={cssAiAutoApply}
              onCheckedChange={(value: boolean | 'indeterminate'): void =>
                setCssAiAutoApply(value === true)
              }
            />
            <span className='text-xs text-gray-300'>Auto-apply on generate</span>
          </div>
          <Button
            type='button'
            size='sm'
            onClick={(): void => void generateCss()}
            disabled={cssAiLoading}
          >
            {cssAiLoading ? 'Generating\u2026' : 'Generate CSS'}
          </Button>
          {cssAiLoading && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={cancelCss}
            >
              Cancel
            </Button>
          )}
        </div>
        {cssAiAutoApply && (
          <div className='flex items-center gap-2'>
            <Switch
              checked={cssAiAppend}
              onCheckedChange={(value: boolean | 'indeterminate'): void =>
                setCssAiAppend(value === true)
              }
            />
            <span className='text-xs text-gray-300'>Append when auto-applying</span>
          </div>
        )}
        {cssAiError && (
          <div className='text-xs text-red-400'>{cssAiError}</div>
        )}
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
                  cssDiffLines.map((line: { type: 'add' | 'remove' | 'same'; text: string }, index: number) => {
                    const prefix = line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  ';
                    const colorClass =
                      line.type === 'add'
                        ? 'text-emerald-300'
                        : line.type === 'remove'
                          ? 'text-rose-300'
                          : 'text-gray-300';
                    return (
                      <div key={`${line.type}-${index}`} className={`whitespace-pre ${colorClass}`}>
                        {prefix}
                        {line.text}
                      </div>
                    );
                  })
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
  );
}

export { CssAiSection };