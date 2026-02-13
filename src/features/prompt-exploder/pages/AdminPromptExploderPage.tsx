'use client';

import { ArrowDown, ArrowUp, Link2, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import { extractParamsFromPrompt } from '@/features/prompt-engine/prompt-params';
import {
  parsePromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
  type PromptValidationRule,
} from '@/features/prompt-engine/settings';
import {
  useSettingsMap,
  useUpdateSetting,
} from '@/shared/hooks/use-settings';
import {
  Button,
  EmptyState,
  FormSection,
  Input,
  Label,
  SectionHeader,
  StatusToggle,
  Textarea,
  UnifiedButton,
  UnifiedSelect,
  useToast,
} from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  consumePromptExploderDraftPrompt,
  readPromptExploderDraftPrompt,
  savePromptExploderApplyPrompt,
} from '../bridge';
import {
  ensureSegmentTitle,
  explodePromptText,
  moveByDelta,
  reassemblePromptSegments,
  updatePromptExploderDocument,
} from '../parser';
import {
  ensurePromptExploderPatternPack,
  getPromptExploderScopedRules,
  PROMPT_EXPLODER_PATTERN_PACK,
} from '../pattern-pack';

import type {
  PromptExploderBinding,
  PromptExploderBindingType,
  PromptExploderDocument,
  PromptExploderListItem,
  PromptExploderSegment,
  PromptExploderSubsection,
} from '../types';

const createListItem = (text = 'New item'): PromptExploderListItem => ({
  id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  text,
  children: [],
});

const addBlankListItem = (items: PromptExploderListItem[]): PromptExploderListItem[] => {
  return [...items, createListItem()];
};

const createSubsection = (): PromptExploderSubsection => ({
  id: `subsection_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  title: 'New subsection',
  code: null,
  condition: null,
  items: [createListItem()],
});

const createManualBindingId = (): string =>
  `manual_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const formatSubsectionLabel = (subsection: PromptExploderSubsection): string => {
  const title = subsection.title.trim() || 'Untitled subsection';
  if (subsection.code) {
    return `[${subsection.code}] ${title}`;
  }
  return title;
};

export function AdminPromptExploderPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const [promptText, setPromptText] = useState('');
  const [documentState, setDocumentState] = useState<PromptExploderDocument | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [manualBindings, setManualBindings] = useState<PromptExploderBinding[]>([]);
  const [bindingDraft, setBindingDraft] = useState<{
    type: PromptExploderBindingType;
    fromSegmentId: string;
    toSegmentId: string;
    fromSubsectionId: string;
    toSubsectionId: string;
    sourceLabel: string;
    targetLabel: string;
  }>({
    type: 'depends_on',
    fromSegmentId: '',
    toSegmentId: '',
    fromSubsectionId: '',
    toSubsectionId: '',
    sourceLabel: '',
    targetLabel: '',
  });

  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';

  const rawPromptSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const promptSettings = useMemo(
    () => parsePromptEngineSettings(rawPromptSettings),
    [rawPromptSettings]
  );

  const scopedRules = useMemo<PromptValidationRule[]>(
    () => getPromptExploderScopedRules(promptSettings),
    [promptSettings]
  );

  const selectedSegment = useMemo(() => {
    if (!documentState || !selectedSegmentId) return null;
    return (
      documentState.segments.find((segment) => segment.id === selectedSegmentId) ?? null
    );
  }, [documentState, selectedSegmentId]);

  const segmentOptions = useMemo(() => {
    return (documentState?.segments ?? []).map((segment) => ({
      value: segment.id,
      label: segment.title,
    }));
  }, [documentState?.segments]);

  const segmentById = useMemo(() => {
    return new Map((documentState?.segments ?? []).map((segment) => [segment.id, segment]));
  }, [documentState?.segments]);

  const fromSubsectionOptions = useMemo(() => {
    const segment = segmentById.get(bindingDraft.fromSegmentId);
    const options = [{ value: '', label: 'Whole segment' }];
    if (!segment) return options;
    segment.subsections.forEach((subsection) => {
      options.push({
        value: subsection.id,
        label: formatSubsectionLabel(subsection),
      });
    });
    return options;
  }, [bindingDraft.fromSegmentId, segmentById]);

  const toSubsectionOptions = useMemo(() => {
    const segment = segmentById.get(bindingDraft.toSegmentId);
    const options = [{ value: '', label: 'Whole segment' }];
    if (!segment) return options;
    segment.subsections.forEach((subsection) => {
      options.push({
        value: subsection.id,
        label: formatSubsectionLabel(subsection),
      });
    });
    return options;
  }, [bindingDraft.toSegmentId, segmentById]);

  useEffect(() => {
    const fromStorage = readPromptExploderDraftPrompt();
    if (fromStorage && !promptText.trim()) {
      setPromptText(fromStorage);
      return;
    }

    if (promptText.trim().length > 0) return;

    setPromptText('=== PROMPT EXPLODER DEMO ===\n\nROLE\nDefine your role here.\n\nPARAMS\nparams = {\n  "example": true\n}');
  }, [promptText]);

  useEffect(() => {
    const segments = documentState?.segments ?? [];
    if (segments.length === 0) {
      setBindingDraft((previous) => ({
        ...previous,
        fromSegmentId: '',
        toSegmentId: '',
        fromSubsectionId: '',
        toSubsectionId: '',
      }));
      return;
    }

    const firstId = segments[0]?.id ?? '';
    const secondId = segments[1]?.id ?? firstId;
    const hasFrom = segments.some((segment) => segment.id === bindingDraft.fromSegmentId);
    const hasTo = segments.some((segment) => segment.id === bindingDraft.toSegmentId);

    if (hasFrom && hasTo) return;

    setBindingDraft((previous) => ({
      ...previous,
      fromSegmentId: hasFrom ? previous.fromSegmentId : firstId,
      toSegmentId: hasTo ? previous.toSegmentId : secondId,
    }));
  }, [bindingDraft.fromSegmentId, bindingDraft.toSegmentId, documentState?.segments]);

  useEffect(() => {
    if (!documentState) return;

    const fromSegment = segmentById.get(bindingDraft.fromSegmentId);
    const toSegment = segmentById.get(bindingDraft.toSegmentId);

    const fromSubsectionValid = Boolean(
      !bindingDraft.fromSubsectionId ||
      fromSegment?.subsections.some(
        (subsection) => subsection.id === bindingDraft.fromSubsectionId
      )
    );
    const toSubsectionValid = Boolean(
      !bindingDraft.toSubsectionId ||
      toSegment?.subsections.some(
        (subsection) => subsection.id === bindingDraft.toSubsectionId
      )
    );
    if (fromSubsectionValid && toSubsectionValid) return;

    setBindingDraft((previous) => ({
      ...previous,
      fromSubsectionId: fromSubsectionValid ? previous.fromSubsectionId : '',
      toSubsectionId: toSubsectionValid ? previous.toSubsectionId : '',
    }));
  }, [
    bindingDraft.fromSegmentId,
    bindingDraft.fromSubsectionId,
    bindingDraft.toSegmentId,
    bindingDraft.toSubsectionId,
    documentState,
    segmentById,
  ]);

  const replaceSegments = (segments: PromptExploderSegment[]): void => {
    const normalized = segments.map((segment) => ensureSegmentTitle(segment));
    setDocumentState((current) => {
      if (!current) return current;
      return updatePromptExploderDocument(current, normalized, manualBindings);
    });
  };

  const updateSegment = (segmentId: string, updater: (segment: PromptExploderSegment) => PromptExploderSegment): void => {
    setDocumentState((current) => {
      if (!current) return current;
      const nextSegments = current.segments.map((segment) =>
        segment.id === segmentId ? ensureSegmentTitle(updater(segment)) : segment
      );
      return updatePromptExploderDocument(current, nextSegments, manualBindings);
    });
  };

  const syncManualBindings = (nextManualBindings: PromptExploderBinding[]): void => {
    setManualBindings(nextManualBindings);
    setDocumentState((current) => {
      if (!current) return current;
      return updatePromptExploderDocument(current, current.segments, nextManualBindings);
    });
  };

  const updateListItemText = (
    items: PromptExploderListItem[],
    index: number,
    text: string
  ): PromptExploderListItem[] => {
    return items.map((item, itemIndex) =>
      itemIndex === index
        ? {
          ...item,
          text,
        }
        : item
    );
  };

  const handleExplode = (): void => {
    const trimmed = promptText.trim();
    if (!trimmed) {
      toast('Enter a prompt first.', { variant: 'info' });
      return;
    }

    const nextDocument = explodePromptText({
      prompt: trimmed,
      validationRules: scopedRules,
    });

    setManualBindings([]);
    setDocumentState(nextDocument);
    setSelectedSegmentId(nextDocument.segments[0]?.id ?? null);

    toast(`Exploded into ${nextDocument.segments.length} segment(s).`, { variant: 'success' });
  };

  const handleInstallPatternPack = async (): Promise<void> => {
    try {
      const result = ensurePromptExploderPatternPack(promptSettings);
      if (result.addedRuleIds.length === 0 && result.updatedRuleIds.length === 0) {
        toast('Prompt Exploder pattern pack is already installed.', { variant: 'info' });
        return;
      }

      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(result.nextSettings),
      });

      toast(
        `Pattern pack synced. Added ${result.addedRuleIds.length}, updated ${result.updatedRuleIds.length}.`,
        { variant: 'success' }
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to install pattern pack.', {
        variant: 'error',
      });
    }
  };

  const handleApplyToImageStudio = (): void => {
    if (!documentState) {
      toast('Explode the prompt before applying it.', { variant: 'info' });
      return;
    }

    const reassembled = reassemblePromptSegments(documentState.segments);
    savePromptExploderApplyPrompt(reassembled);
    toast('Reassembled prompt sent to Image Studio.', { variant: 'success' });
    router.push(returnTo);
  };

  const handleReloadFromStudio = (): void => {
    const nextPrompt = consumePromptExploderDraftPrompt();
    if (!nextPrompt) {
      toast('No draft prompt was received from Image Studio.', { variant: 'info' });
      return;
    }
    setPromptText(nextPrompt);
    toast('Loaded latest prompt draft from Image Studio.', { variant: 'success' });
  };

  const handleAddManualBinding = (): void => {
    if (!documentState) {
      toast('Explode a prompt before adding bindings.', { variant: 'info' });
      return;
    }

    const fromSegment = documentState.segments.find(
      (segment) => segment.id === bindingDraft.fromSegmentId
    );
    const toSegment = documentState.segments.find(
      (segment) => segment.id === bindingDraft.toSegmentId
    );
    if (!fromSegment || !toSegment) {
      toast('Select valid source and target segments.', { variant: 'error' });
      return;
    }

    const fromSubsection = bindingDraft.fromSubsectionId
      ? fromSegment.subsections.find(
          (subsection) => subsection.id === bindingDraft.fromSubsectionId
        ) ?? null
      : null;
    const toSubsection = bindingDraft.toSubsectionId
      ? toSegment.subsections.find(
          (subsection) => subsection.id === bindingDraft.toSubsectionId
        ) ?? null
      : null;

    if (bindingDraft.fromSubsectionId && !fromSubsection) {
      toast('Selected source subsection no longer exists.', { variant: 'error' });
      return;
    }
    if (bindingDraft.toSubsectionId && !toSubsection) {
      toast('Selected target subsection no longer exists.', { variant: 'error' });
      return;
    }

    if (
      bindingDraft.type === 'depends_on' &&
      fromSegment.id === toSegment.id &&
      (fromSubsection?.id ?? null) === (toSubsection?.id ?? null)
    ) {
      toast('Source and target cannot be the exact same endpoint for depends_on bindings.', {
        variant: 'info',
      });
      return;
    }

    const defaultSourceLabel = fromSubsection
      ? formatSubsectionLabel(fromSubsection)
      : fromSegment.title;
    const defaultTargetLabel = toSubsection
      ? formatSubsectionLabel(toSubsection)
      : toSegment.title;

    const nextBinding: PromptExploderBinding = {
      id: createManualBindingId(),
      type: bindingDraft.type,
      fromSegmentId: fromSegment.id,
      toSegmentId: toSegment.id,
      fromSubsectionId: fromSubsection?.id ?? null,
      toSubsectionId: toSubsection?.id ?? null,
      sourceLabel: bindingDraft.sourceLabel.trim() || defaultSourceLabel,
      targetLabel: bindingDraft.targetLabel.trim() || defaultTargetLabel,
      origin: 'manual',
    };

    syncManualBindings([...manualBindings, nextBinding]);
    setBindingDraft((previous) => ({
      ...previous,
      sourceLabel: '',
      targetLabel: '',
    }));
    toast('Manual binding added.', { variant: 'success' });
  };

  const handleRemoveManualBinding = (bindingId: string): void => {
    const nextManual = manualBindings.filter((binding) => binding.id !== bindingId);
    syncManualBindings(nextManual);
  };

  const describeBindingEndpoint = (
    segmentId: string,
    subsectionId: string | null | undefined
  ): string => {
    const segment = segmentById.get(segmentId);
    if (!segment) return 'Unknown segment';
    if (!subsectionId) return segment.title;
    const subsection = segment.subsections.find((candidate) => candidate.id === subsectionId);
    if (!subsection) return segment.title;
    return `${segment.title} · ${formatSubsectionLabel(subsection)}`;
  };

  return (
    <div className='container mx-auto space-y-4 py-6'>
      <SectionHeader
        eyebrow='AI · Prompt Exploder'
        title='Prompt Exploder'
        description='Explode prompts into typed segments, edit structure, and reassemble with references intact.'
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <UnifiedButton
              variant='outline'
              size='sm'
              onClick={handleReloadFromStudio}
            >
              <RefreshCcw className='mr-2 size-4' />
              Reload Studio Draft
            </UnifiedButton>
            <UnifiedButton
              variant='outline'
              size='sm'
              onClick={() => {
                router.push(returnTo);
              }}
            >
              Back to Image Studio
            </UnifiedButton>
          </div>
        }
      />

      <FormSection
        title='Pattern Runtime'
        description='Prompt Exploder uses Prompt Validator rules scoped to prompt_exploder.'
        variant='subtle'
        className='p-4'
        actions={
          <div className='text-xs text-gray-400'>
            Scoped patterns active: <span className='text-gray-200'>{scopedRules.length}</span>
          </div>
        }
      >
        <div className='mt-3 flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void handleInstallPatternPack();
            }}
            disabled={updateSetting.isPending}
          >
            Install Pattern Pack
          </Button>
          <div className='text-xs text-gray-500'>
            Pack includes {PROMPT_EXPLODER_PATTERN_PACK.length} segmentation patterns.
          </div>
        </div>
      </FormSection>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]'>
        <div className='space-y-4'>
          <FormSection
            title='Source Prompt'
            description='Paste a prompt and explode it into structured segments.'
            variant='subtle'
            className='p-4'
            actions={
              <div className='flex items-center gap-2'>
                <Button type='button' onClick={handleExplode}>
                  Explode Prompt
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleApplyToImageStudio}
                  disabled={!documentState}
                >
                  Apply to Image Studio
                </Button>
              </div>
            }
          >
            <div className='mt-3 space-y-2'>
              <Textarea
                className='min-h-[280px] font-mono text-[12px]'
                value={promptText}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setPromptText(event.target.value);
                }}
                placeholder='Paste prompt text...'
              />
            </div>
          </FormSection>

          <FormSection
            title='Segments'
            description='Edit segment content and ordering before reassembly.'
            variant='subtle'
            className='p-4'
          >
            {!documentState || documentState.segments.length === 0 ? (
              <EmptyState
                title='No segments yet'
                description='Run Prompt Exploder to generate editable segments.'
              />
            ) : (
              <div className='mt-3 grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]'>
                <div className='max-h-[65vh] space-y-2 overflow-auto rounded border border-border/60 bg-card/20 p-2'>
                  {documentState.segments.map((segment, index) => (
                    <button
                      key={segment.id}
                      type='button'
                      className={`w-full rounded border px-2 py-2 text-left text-xs transition-colors ${selectedSegmentId === segment.id ? 'border-blue-400 bg-blue-500/10 text-gray-100' : 'border-border/50 bg-card/30 text-gray-300 hover:border-blue-300/50'}`}
                      onClick={() => setSelectedSegmentId(segment.id)}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <span className='truncate font-medium'>{segment.title}</span>
                        <span className='rounded border border-border/50 bg-card/50 px-1 py-0.5 text-[10px] uppercase'>
                          {segment.type.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <div className='mt-1 flex items-center justify-between text-[10px] text-gray-500'>
                        <span>Confidence {(segment.confidence * 100).toFixed(0)}%</span>
                        <span>{segment.includeInOutput ? 'Included' : 'Omitted'}</span>
                      </div>
                      <div className='mt-2 flex items-center gap-1'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          disabled={index === 0}
                          onClick={(event) => {
                            event.stopPropagation();
                            replaceSegments(moveByDelta(documentState.segments, index, -1));
                          }}
                        >
                          <ArrowUp className='size-3.5' />
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          disabled={index === documentState.segments.length - 1}
                          onClick={(event) => {
                            event.stopPropagation();
                            replaceSegments(moveByDelta(documentState.segments, index, 1));
                          }}
                        >
                          <ArrowDown className='size-3.5' />
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>

                <div className='max-h-[65vh] space-y-3 overflow-auto rounded border border-border/60 bg-card/20 p-3'>
                  {!selectedSegment ? (
                    <div className='text-sm text-gray-500'>Select a segment to edit.</div>
                  ) : (
                    <>
                      <div className='grid gap-3 md:grid-cols-2'>
                        <div className='space-y-1'>
                          <Label className='text-[11px] text-gray-400'>Type</Label>
                          <UnifiedSelect
                            value={selectedSegment.type}
                            onValueChange={(value: string) => {
                              updateSegment(selectedSegment.id, (current) => ({
                                ...current,
                                type: value as PromptExploderSegment['type'],
                              }));
                            }}
                            options={[
                              { value: 'metadata', label: 'Metadata' },
                              { value: 'assigned_text', label: 'Assigned Text' },
                              { value: 'list', label: 'List' },
                              { value: 'parameter_block', label: 'Parameter Block' },
                              { value: 'referential_list', label: 'Referential List' },
                              { value: 'sequence', label: 'Sequence' },
                              { value: 'hierarchical_list', label: 'Hierarchical List' },
                              { value: 'conditional_list', label: 'Conditional List' },
                              { value: 'qa_matrix', label: 'QA Matrix' },
                            ]}
                          />
                        </div>
                        <div className='space-y-1'>
                          <Label className='text-[11px] text-gray-400'>Include In Output</Label>
                          <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
                            <StatusToggle
                              enabled={selectedSegment.includeInOutput}
                              onToggle={() => {
                                updateSegment(selectedSegment.id, (current) => ({
                                  ...current,
                                  includeInOutput: !current.includeInOutput,
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className='space-y-1'>
                        <Label className='text-[11px] text-gray-400'>Title</Label>
                        <Input
                          value={selectedSegment.title}
                          onChange={(event) => {
                            updateSegment(selectedSegment.id, (current) => ({
                              ...current,
                              title: event.target.value,
                            }));
                          }}
                        />
                      </div>

                      {selectedSegment.type === 'metadata' ? (
                        <div className='space-y-1'>
                          <Label className='text-[11px] text-gray-400'>Metadata Mode</Label>
                          <UnifiedSelect
                            value={selectedSegment.includeInOutput ? 'include' : 'omit'}
                            onValueChange={(value: string) => {
                              updateSegment(selectedSegment.id, (current) => ({
                                ...current,
                                includeInOutput: value === 'include',
                              }));
                            }}
                            options={[
                              { value: 'omit', label: 'Omit from reassembly' },
                              { value: 'include', label: 'Include in reassembly' },
                            ]}
                          />
                        </div>
                      ) : null}

                      {selectedSegment.type === 'parameter_block' ? (
                        <div className='space-y-2'>
                          <Label className='text-[11px] text-gray-400'>Parameters Text</Label>
                          <Textarea
                            className='min-h-[220px] font-mono text-[12px]'
                            value={selectedSegment.paramsText || selectedSegment.text}
                            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                              const nextText = event.target.value;
                              updateSegment(selectedSegment.id, (current) => {
                                const extracted = extractParamsFromPrompt(nextText);
                                return {
                                  ...current,
                                  paramsText: nextText,
                                  text: nextText,
                                  paramsObject: extracted.ok ? extracted.params : null,
                                };
                              });
                            }}
                          />
                        </div>
                      ) : null}

                      {['list', 'referential_list', 'hierarchical_list', 'conditional_list', 'qa_matrix'].includes(
                        selectedSegment.type
                      ) ? (
                          <div className='space-y-2'>
                            <div className='flex items-center justify-between'>
                              <Label className='text-[11px] text-gray-400'>List Items</Label>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  updateSegment(selectedSegment.id, (current) => ({
                                    ...current,
                                    listItems: addBlankListItem(current.listItems),
                                  }));
                                }}
                              >
                                <Plus className='mr-2 size-3.5' />
                              Add Item
                              </Button>
                            </div>
                            {selectedSegment.listItems.length === 0 ? (
                              <div className='text-xs text-gray-500'>No list items detected.</div>
                            ) : null}
                            <div className='space-y-2'>
                              {selectedSegment.listItems.map((item, index) => (
                                <div key={item.id} className='rounded border border-border/50 bg-card/20 p-2'>
                                  <div className='flex items-center gap-1'>
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='icon'
                                      disabled={index === 0}
                                      onClick={() => {
                                        updateSegment(selectedSegment.id, (current) => ({
                                          ...current,
                                          listItems: moveByDelta(current.listItems, index, -1),
                                        }));
                                      }}
                                    >
                                      <ArrowUp className='size-3.5' />
                                    </Button>
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='icon'
                                      disabled={index === selectedSegment.listItems.length - 1}
                                      onClick={() => {
                                        updateSegment(selectedSegment.id, (current) => ({
                                          ...current,
                                          listItems: moveByDelta(current.listItems, index, 1),
                                        }));
                                      }}
                                    >
                                      <ArrowDown className='size-3.5' />
                                    </Button>
                                    <Input
                                      value={item.text}
                                      onChange={(event) => {
                                        updateSegment(selectedSegment.id, (current) => ({
                                          ...current,
                                          listItems: updateListItemText(current.listItems, index, event.target.value),
                                        }));
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                      {selectedSegment.type === 'sequence' ? (
                        <div className='space-y-3'>
                          <div className='flex items-center justify-between'>
                            <div className='text-[11px] uppercase tracking-wide text-gray-400'>
                              Sequence Subsections
                            </div>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                updateSegment(selectedSegment.id, (current) => ({
                                  ...current,
                                  subsections: [...current.subsections, createSubsection()],
                                }));
                              }}
                            >
                              <Plus className='mr-2 size-3.5' />
                              Add Subsection
                            </Button>
                          </div>
                          {selectedSegment.subsections.length === 0 ? (
                            <div className='text-xs text-gray-500'>No subsections detected.</div>
                          ) : null}
                          {selectedSegment.subsections.map((subsection, subsectionIndex) => (
                            <div key={subsection.id} className='space-y-2 rounded border border-border/50 bg-card/20 p-2'>
                              <div className='flex items-center justify-between'>
                                <div className='text-[11px] text-gray-400'>
                                  Subsection {subsectionIndex + 1}
                                </div>
                                <div className='flex items-center gap-1'>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    disabled={subsectionIndex === 0}
                                    onClick={() => {
                                      updateSegment(selectedSegment.id, (current) => ({
                                        ...current,
                                        subsections: moveByDelta(current.subsections, subsectionIndex, -1),
                                      }));
                                    }}
                                  >
                                    <ArrowUp className='size-3.5' />
                                  </Button>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    disabled={subsectionIndex === selectedSegment.subsections.length - 1}
                                    onClick={() => {
                                      updateSegment(selectedSegment.id, (current) => ({
                                        ...current,
                                        subsections: moveByDelta(current.subsections, subsectionIndex, 1),
                                      }));
                                    }}
                                  >
                                    <ArrowDown className='size-3.5' />
                                  </Button>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    onClick={() => {
                                      updateSegment(selectedSegment.id, (current) => ({
                                        ...current,
                                        subsections: current.subsections.filter(
                                          (_, index) => index !== subsectionIndex
                                        ),
                                      }));
                                    }}
                                  >
                                    <Trash2 className='size-3.5' />
                                  </Button>
                                </div>
                              </div>
                              <div className='grid gap-2 md:grid-cols-2'>
                                <Input
                                  value={subsection.title}
                                  onChange={(event) => {
                                    updateSegment(selectedSegment.id, (current) => {
                                      const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                        candidateIndex === subsectionIndex
                                          ? {
                                            ...candidate,
                                            title: event.target.value,
                                          }
                                          : candidate
                                      );
                                      return {
                                        ...current,
                                        subsections: nextSubsections,
                                      };
                                    });
                                  }}
                                  placeholder='Subsection title'
                                />
                                <Input
                                  value={subsection.code ?? ''}
                                  onChange={(event) => {
                                    updateSegment(selectedSegment.id, (current) => {
                                      const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                        candidateIndex === subsectionIndex
                                          ? {
                                            ...candidate,
                                            code: event.target.value.trim().toUpperCase() || null,
                                          }
                                          : candidate
                                      );
                                      return {
                                        ...current,
                                        subsections: nextSubsections,
                                      };
                                    });
                                  }}
                                  placeholder='Reference code (e.g. RL4)'
                                />
                              </div>
                              <Input
                                value={subsection.condition ?? ''}
                                onChange={(event) => {
                                  updateSegment(selectedSegment.id, (current) => {
                                    const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                      candidateIndex === subsectionIndex
                                        ? {
                                          ...candidate,
                                          condition: event.target.value.trim() || null,
                                        }
                                        : candidate
                                    );
                                    return {
                                      ...current,
                                      subsections: nextSubsections,
                                    };
                                  });
                                }}
                                placeholder='Condition (optional)'
                              />
                              <div className='space-y-1'>
                                <div className='flex items-center justify-between'>
                                  <div className='text-[11px] text-gray-500'>Items</div>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={() => {
                                      updateSegment(selectedSegment.id, (current) => {
                                        const nextSubsections = current.subsections.map((candidate, candidateIndex) => {
                                          if (candidateIndex !== subsectionIndex) return candidate;
                                          return {
                                            ...candidate,
                                            items: addBlankListItem(candidate.items),
                                          };
                                        });
                                        return {
                                          ...current,
                                          subsections: nextSubsections,
                                        };
                                      });
                                    }}
                                  >
                                    <Plus className='mr-2 size-3.5' />
                                    Add Item
                                  </Button>
                                </div>
                                {subsection.items.map((item, itemIndex) => (
                                  <div key={item.id} className='flex items-center gap-1'>
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='icon'
                                      disabled={itemIndex === 0}
                                      onClick={() => {
                                        updateSegment(selectedSegment.id, (current) => {
                                          const nextSubsections = current.subsections.map((candidate, candidateIndex) => {
                                            if (candidateIndex !== subsectionIndex) return candidate;
                                            return {
                                              ...candidate,
                                              items: moveByDelta(candidate.items, itemIndex, -1),
                                            };
                                          });
                                          return {
                                            ...current,
                                            subsections: nextSubsections,
                                          };
                                        });
                                      }}
                                    >
                                      <ArrowUp className='size-3.5' />
                                    </Button>
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='icon'
                                      disabled={itemIndex === subsection.items.length - 1}
                                      onClick={() => {
                                        updateSegment(selectedSegment.id, (current) => {
                                          const nextSubsections = current.subsections.map((candidate, candidateIndex) => {
                                            if (candidateIndex !== subsectionIndex) return candidate;
                                            return {
                                              ...candidate,
                                              items: moveByDelta(candidate.items, itemIndex, 1),
                                            };
                                          });
                                          return {
                                            ...current,
                                            subsections: nextSubsections,
                                          };
                                        });
                                      }}
                                    >
                                      <ArrowDown className='size-3.5' />
                                    </Button>
                                    <Input
                                      value={item.text}
                                      onChange={(event) => {
                                        updateSegment(selectedSegment.id, (current) => {
                                          const nextSubsections = current.subsections.map((candidate, candidateIndex) => {
                                            if (candidateIndex !== subsectionIndex) return candidate;
                                            return {
                                              ...candidate,
                                              items: updateListItemText(candidate.items, itemIndex, event.target.value),
                                            } as PromptExploderSubsection;
                                          });
                                          return {
                                            ...current,
                                            subsections: nextSubsections,
                                          };
                                        });
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {selectedSegment.type === 'assigned_text' ? (
                        <div className='space-y-2'>
                          <Label className='text-[11px] text-gray-400'>Body</Label>
                          <Textarea
                            className='min-h-[180px] font-mono text-[12px]'
                            value={selectedSegment.text}
                            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                              updateSegment(selectedSegment.id, (current) => ({
                                ...current,
                                text: event.target.value,
                              }));
                            }}
                          />
                        </div>
                      ) : null}

                      <div className='rounded border border-border/60 bg-card/30 p-2 text-[11px] text-gray-400'>
                        Matched pattern IDs: {selectedSegment.matchedPatternIds.join(', ') || 'none'}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </FormSection>
        </div>

        <div className='space-y-4'>
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
                      <UnifiedSelect
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
                      <UnifiedSelect
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
                      <UnifiedSelect
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
                      <UnifiedSelect
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
                      <UnifiedSelect
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
                    {documentState.bindings.map((binding) => (
                      <div key={binding.id} className='rounded border border-border/50 bg-card/20 p-2 text-xs'>
                        <div className='flex items-center justify-between gap-2'>
                          <div className='flex items-center gap-2 text-gray-200'>
                            <Link2 className='size-3.5' />
                            <span className='uppercase text-[10px] tracking-wide text-gray-500'>
                              {binding.type.replaceAll('_', ' ')}
                            </span>
                            <span className='rounded border border-border/60 px-1 py-0.5 text-[9px] uppercase text-gray-400'>
                              {binding.origin}
                            </span>
                          </div>
                          {binding.origin === 'manual' ? (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => handleRemoveManualBinding(binding.id)}
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
                          {describeBindingEndpoint(binding.fromSegmentId, binding.fromSubsectionId)} →{' '}
                          {describeBindingEndpoint(binding.toSegmentId, binding.toSubsectionId)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </FormSection>

          <FormSection
            title='Warnings'
            description='Quality checks from the exploder runtime.'
            variant='subtle'
            className='p-4'
          >
            {!documentState || documentState.warnings.length === 0 ? (
              <div className='text-xs text-gray-500'>No warnings.</div>
            ) : (
              <ul className='list-disc pl-5 text-xs text-amber-200'>
                {documentState.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </FormSection>

          <FormSection
            title='Reassembled Prompt'
            description='Preview final output after include/omit and reorder edits.'
            variant='subtle'
            className='p-4'
            actions={
              <Button
                type='button'
                variant='outline'
                onClick={handleApplyToImageStudio}
                disabled={!documentState}
              >
                Apply to Image Studio
              </Button>
            }
          >
            <div className='mt-2'>
              <Textarea
                className='min-h-[420px] font-mono text-[11px]'
                value={documentState?.reassembledPrompt ?? ''}
                readOnly
              />
            </div>
          </FormSection>
        </div>
      </div>
    </div>
  );
}
