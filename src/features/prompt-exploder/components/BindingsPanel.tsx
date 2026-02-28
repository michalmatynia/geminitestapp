'use client';

import { Link2, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import { Button, FormSection, Input, SelectSimple } from '@/shared/ui';

import { useBindingsState, useBindingsActions } from '../context/hooks/useBindings';
import { useDocumentState } from '../context/hooks/useDocument';
import { promptExploderFormatSubsectionLabel } from '../helpers/segment-helpers';

import type {
  PromptExploderBinding,
  PromptExploderBindingType,
  PromptExploderSubsection,
} from '../types';

export function BindingsPanel(): React.JSX.Element {
  const { documentState, segmentOptions, segmentById } = useDocumentState();
  const { bindingDraft, fromSubsectionOptions, toSubsectionOptions } = useBindingsState();
  const { setBindingDraft, handleAddManualBinding, handleRemoveManualBinding } =
    useBindingsActions();

  const describeBindingEndpoint = (
    segmentId: string,
    subsectionId: string | null | undefined
  ): string => {
    const segment = segmentById.get(segmentId);
    if (!segment) return 'Unknown segment';
    if (!subsectionId) return segment.title || 'Untitled';
    const subsection = (segment.subsections || []).find(
      (candidate: PromptExploderSubsection) => candidate.id === subsectionId
    );
    if (!subsection) return segment.title || 'Untitled';
    return `${segment.title || 'Untitled'} · ${promptExploderFormatSubsectionLabel(subsection)}`;
  };

  return (
    <FormSection
      title='Bindings'
      description='Auto-detected links between references and parameter usage.'
      variant='subtle'
      className='p-4'
    >
      {!documentState ? (
        <div className='text-xs text-gray-500'>Explode a prompt to manage bindings.</div>
      ) : (
        <div className='space-y-3'>
          <div className='rounded border border-border/50 bg-card/20 p-2'>
            <div className='grid gap-2'>
              <div className='grid gap-2 md:grid-cols-3'>
                <SelectSimple
                  size='sm'
                  value={bindingDraft.type}
                  onValueChange={(value: string) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      type: value as PromptExploderBindingType,
                    }));
                  }}
                  options={[
                    { value: 'depends_on', label: 'Depends On' },
                    { value: 'references', label: 'References' },
                    { value: 'uses_param', label: 'Uses Param' },
                  ]}
                />
                <SelectSimple
                  size='sm'
                  value={bindingDraft.fromSegmentId}
                  onValueChange={(value: string) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      fromSegmentId: value,
                      fromSubsectionId: '',
                    }));
                  }}
                  options={segmentOptions}
                />
                <SelectSimple
                  size='sm'
                  value={bindingDraft.fromSubsectionId}
                  onValueChange={(value: string) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      fromSubsectionId: value,
                    }));
                  }}
                  options={fromSubsectionOptions}
                />
              </div>
              <div className='grid gap-2 md:grid-cols-2'>
                <SelectSimple
                  size='sm'
                  value={bindingDraft.toSegmentId}
                  onValueChange={(value: string) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      toSegmentId: value,
                      toSubsectionId: '',
                    }));
                  }}
                  options={segmentOptions}
                />
                <SelectSimple
                  size='sm'
                  value={bindingDraft.toSubsectionId}
                  onValueChange={(value: string) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      toSubsectionId: value,
                    }));
                  }}
                  options={toSubsectionOptions}
                />
              </div>
              <div className='grid gap-2 md:grid-cols-2'>
                <Input
                  value={bindingDraft.sourceLabel}
                  onChange={(event) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      sourceLabel: event.target.value,
                    }));
                  }}
                  placeholder='Source label (optional)'
                />
                <Input
                  value={bindingDraft.targetLabel}
                  onChange={(event) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      targetLabel: event.target.value,
                    }));
                  }}
                  placeholder='Target label (optional)'
                />
              </div>
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleAddManualBinding}
                  disabled={segmentOptions.length === 0}
                >
                  <Plus className='mr-2 size-3.5' />
                  Add Manual Binding
                </Button>
              </div>
            </div>
          </div>

          {documentState.bindings.length === 0 ? (
            <div className='text-xs text-gray-500'>No bindings detected.</div>
          ) : (
            <div className='max-h-[280px] space-y-2 overflow-auto'>
              {documentState.bindings.map((binding: PromptExploderBinding) => (
                <div
                  key={binding.id}
                  className='rounded border border-border/50 bg-card/20 p-2 text-xs'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 text-gray-200'>
                      <Link2 className='size-3.5' />
                      <span className='uppercase text-[10px] tracking-wide text-gray-500'>
                        {(binding.type || '').replaceAll('_', ' ')}
                      </span>{' '}
                      <span className='rounded border border-border/60 px-1 py-0.5 text-[9px] uppercase text-gray-400'>
                        {binding.origin}
                      </span>
                    </div>
                    {binding.origin === 'manual' ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => handleRemoveManualBinding(binding.id ?? '')}
                        title='Remove manual binding'
                        aria-label='Remove manual binding'
                      >
                        <Trash2 className='size-3.5' />
                      </Button>
                    ) : null}
                  </div>
                  <div className='mt-1 text-gray-300'>
                    {binding.sourceLabel} → {binding.targetLabel}
                  </div>
                  <div className='mt-1 text-[10px] text-gray-500'>
                    {describeBindingEndpoint(binding.fromSegmentId ?? '', binding.fromSubsectionId)}{' '}
                    → {describeBindingEndpoint(binding.toSegmentId ?? '', binding.toSubsectionId)}
                  </div>{' '}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </FormSection>
  );
}
