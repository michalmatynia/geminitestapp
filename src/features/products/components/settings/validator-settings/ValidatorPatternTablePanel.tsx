'use client';

import { ChevronDown, ChevronRight, Copy, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { memo } from 'react';

import {
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
  normalizeProductValidationSkipNoopReplacementProposal,
} from '@/features/products/utils/validator-instance-behavior';
import {
  describeDynamicReplacementRecipe,
  getStaticReplacementValue,
  parseDynamicReplacementRecipe,
} from '@/features/products/utils/validator-replacement-recipe';
import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products';
import type { SequenceGroupDraft } from '@/shared/contracts/products';
import {
  Button,
  EmptyState,
  FormField,
  FormSection,
  Input,
  LoadingState,
  StatusBadge,
  StatusToggle,
  useToast,
} from '@/shared/ui';

import { INSTANCE_SCOPE_LABELS } from './constants';
import { ValidatorPatternImportModal } from './ValidatorPatternImportModal';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';
import { buildFullValidatorDocumentationClipboardText } from './validator-documentation-clipboard';


type PatternRowProps = {
  pattern: ProductValidationPattern;
  isDragging: boolean;
  isDragTarget: boolean;
  patternActionsPending: boolean;
  updatePatternPending: boolean;
  createPatternPending: boolean;
  reorderPending: boolean;
  groupId: string | null;
  group: { id: string; label: string; debounceMs: number; patternIds: string[] } | null;
  isGroupFirst: boolean;
  groupDraft: SequenceGroupDraft | null;
  dynamicRecipe: ReturnType<typeof parseDynamicReplacementRecipe>;
  staticReplacement: string | null;
  onSaveSequenceGroup: (groupId: string) => void;
  onUngroup: (groupId: string) => void;
  onPatternDrop: (pattern: ProductValidationPattern, event: React.DragEvent<HTMLDivElement>) => void;
  onTogglePattern: (pattern: ProductValidationPattern) => void;
  onDuplicatePattern: (pattern: ProductValidationPattern) => void;
  onEditPattern: (pattern: ProductValidationPattern) => void;
  onDeletePattern: (pattern: ProductValidationPattern) => void;
  setDraggedPatternId: (id: string | null) => void;
  setDragOverPatternId: (id: string | null) => void;
  dragOverPatternId: string | null;
  draggedPatternId: string | null;
  setGroupDrafts: React.Dispatch<React.SetStateAction<Record<string, SequenceGroupDraft>>>;
  formatReplacementFields: (fields: unknown) => string;
  isPatternCollapsed: boolean;
  isGroupCollapsed: boolean;
  onTogglePatternCollapse: (patternId: string) => void;
  onToggleGroupCollapse: (groupId: string) => void;
};

const PatternRow = memo(function PatternRow({
  pattern,
  isDragging,
  isDragTarget,
  patternActionsPending,
  updatePatternPending,
  createPatternPending,
  reorderPending,
  groupId,
  group,
  isGroupFirst,
  groupDraft,
  dynamicRecipe,
  staticReplacement,
  onSaveSequenceGroup,
  onUngroup,
  onPatternDrop,
  onTogglePattern,
  onDuplicatePattern,
  onEditPattern,
  onDeletePattern,
  setDraggedPatternId,
  setDragOverPatternId,
  dragOverPatternId,
  setGroupDrafts,
  formatReplacementFields,
  isPatternCollapsed,
  isGroupCollapsed,
  onTogglePatternCollapse,
  onToggleGroupCollapse,
}: PatternRowProps): React.JSX.Element {
  const hidePatternCard = Boolean(groupId && isGroupCollapsed);

  return (
    <div key={pattern.id} className='space-y-2'>
      {isGroupFirst && group && (
        <div
          onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
            if (patternActionsPending) return;
            event.preventDefault();
            event.stopPropagation();
            if (dragOverPatternId !== pattern.id) {
              setDragOverPatternId(pattern.id);
            }
          }}
          onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
            if (patternActionsPending) return;
            event.preventDefault();
            event.stopPropagation();
            onPatternDrop(pattern, event);
          }}
        >
          <FormSection
            title='Sequence / Group'
            description={`${group.patternIds.length} pattern${group.patternIds.length === 1 ? '' : 's'}`}
            variant='subtle-compact'
            className={`border-cyan-500/35 bg-cyan-500/5 p-3 ${
              isDragTarget ? 'ring-1 ring-cyan-300/55' : ''
            }`}
          >
            <div className='mt-1 flex items-center justify-end'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-7 px-2 text-cyan-100 hover:bg-cyan-500/10'
                onClick={() => onToggleGroupCollapse(group.id)}
              >
                {isGroupCollapsed ? (
                  <>
                    <ChevronRight className='mr-1 size-4' />
                    Expand sequence
                  </>
                ) : (
                  <>
                    <ChevronDown className='mr-1 size-4' />
                    Collapse sequence
                  </>
                )}
              </Button>
            </div>
            {!isGroupCollapsed && (
              <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto_auto]'>
                <FormField label='Group Label'>
                  <Input
                    className='h-8'
                    value={groupDraft?.label ?? group.label}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => {
                        const current = prev[group.id] ?? {
                          label: group.label,
                          debounceMs: String(group.debounceMs),
                        };
                        return {
                          ...prev,
                          [group.id]: {
                            ...current,
                            label: event.target.value,
                          },
                        };
                      });
                    }}
                    placeholder='Sequence / Group'
                  />
                </FormField>
                <FormField label='Debounce (ms)'>
                  <Input
                    type='number'
                    min={0}
                    max={30000}
                    className='h-8'
                    value={groupDraft?.debounceMs ?? String(group.debounceMs)}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      setGroupDrafts((prev: Record<string, SequenceGroupDraft>) => {
                        const current = prev[group.id] ?? {
                          label: group.label,
                          debounceMs: String(group.debounceMs),
                        };
                        return {
                          ...prev,
                          [group.id]: {
                            ...current,
                            debounceMs: event.target.value,
                          },
                        };
                      });
                    }}
                  />
                </FormField>
                <div className='flex items-end'>
                  <Button
                    type='button'
                    disabled={patternActionsPending}
                    variant='outline'
                    size='sm'
                    className='h-8'
                    onClick={() => onSaveSequenceGroup(group.id)}
                  >
                    Save Group
                  </Button>
                </div>
                <div className='flex items-end'>
                  <Button
                    type='button'
                    disabled={patternActionsPending}
                    variant='outline'
                    size='sm'
                    className='h-8 border-amber-500/40 text-amber-200 hover:bg-amber-500/10'
                    onClick={() => onUngroup(group.id)}
                  >
                    Ungroup
                  </Button>
                </div>
              </div>
            )}
          </FormSection>
        </div>
      )}

      {!hidePatternCard && (
        <div
          className={`relative ${groupId ? 'ml-4' : ''}`}
          onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
            if (patternActionsPending) return;
            event.preventDefault();
            event.stopPropagation();
            if (dragOverPatternId !== pattern.id) {
              setDragOverPatternId(pattern.id);
            }
          }}
          onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
            if (dragOverPatternId !== pattern.id) return;
            const nextTarget = event.relatedTarget as Node | null;
            if (nextTarget && event.currentTarget.contains(nextTarget)) return;
            setDragOverPatternId(null);
          }}
          onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
            event.preventDefault();
            event.stopPropagation();
            onPatternDrop(pattern, event);
          }}
        >
          <FormSection
            variant='subtle-compact'
            className={`flex flex-col gap-3 bg-gray-900 transition-opacity ${
              isDragging ? 'opacity-50' : 'opacity-100'
            } ${
              groupId ? 'border-l-2 border-cyan-400/35' : ''
            } ${
              isDragTarget ? 'ring-1 ring-cyan-300/55' : ''
            }`}
          >
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <button
                    type='button'
                    draggable={!patternActionsPending}
                    onDragStart={(event: React.DragEvent<HTMLButtonElement>): void => {
                      if (patternActionsPending) return;
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', pattern.id);
                      setDraggedPatternId(pattern.id);
                      setDragOverPatternId(null);
                    }}
                    onDragEnd={(): void => {
                      setDraggedPatternId(null);
                      setDragOverPatternId(null);
                    }}
                    className='cursor-grab rounded border border-slate-600/70 bg-slate-800/60 p-1 text-slate-300 hover:bg-slate-700/70 active:cursor-grabbing'
                    title='Drag and drop onto another pattern to build a sequence group'
                    aria-label='Drag and drop onto another pattern to build a sequence group'
                    disabled={patternActionsPending}
                  >
                    <GripVertical className='size-3.5' />
                  </button>
                  <span className='truncate text-sm font-medium text-white'>{pattern.label}</span>
                  <StatusBadge status={pattern.target} variant='info' size='sm' className='font-medium' />
                  <StatusBadge
                    status={
                      pattern.target === 'name' || pattern.target === 'description'
                        ? pattern.locale || 'any locale'
                        : 'n/a'
                    }
                    variant='processing'
                    size='sm'
                    className='font-medium'
                  />
                  <StatusBadge
                    status={pattern.severity}
                    variant={pattern.severity === 'warning' ? 'warning' : 'error'}
                    size='sm'
                    className='font-bold'
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='xs'
                    className='h-6 px-1 text-slate-300 hover:bg-slate-700/60'
                    onClick={() => onTogglePatternCollapse(pattern.id)}
                    title={isPatternCollapsed ? 'Expand pattern' : 'Collapse pattern'}
                  >
                    {isPatternCollapsed ? (
                      <ChevronRight className='size-4' />
                    ) : (
                      <ChevronDown className='size-4' />
                    )}
                  </Button>
                </div>
                {isPatternCollapsed ? (
                  <p className='mt-1 text-[11px] text-slate-300'>
                    {groupId ? `Group: ${groupId}` : 'Standalone pattern'} | Regex: /{pattern.regex}/
                    {pattern.flags ?? ''}
                  </p>
                ) : (
                  <>
                    <div className='mt-1 truncate font-mono text-xs text-gray-300'>
                    /{pattern.regex}/{pattern.flags ?? ''}
                    </div>
                    <p className='mt-1 text-xs text-gray-400'>{pattern.message}</p>
                    {groupId ? (
                      <p className='mt-1 text-[11px] text-violet-200/90'>
                        Sequence: {pattern.sequence ?? 'auto'} | Group: {groupId} | Chain:{' '}
                        {pattern.chainMode ?? 'continue'} | Max executions: {pattern.maxExecutions ?? 1} | Pass
                        output: {pattern.passOutputToNext ?? true ? 'ON' : 'OFF'}
                      </p>
                    ) : (
                      <p className='mt-1 text-[11px] text-violet-200/90'>
                        Order: {pattern.sequence ?? 'auto'} | Standalone pattern (not in sequence flow)
                      </p>
                    )}
                    <p className='mt-1 text-[11px] text-sky-200/90'>
                    Launch:{' '}
                      {pattern.launchEnabled
                        ? `${pattern.launchSourceMode} ${pattern.launchSourceField ?? ''} ${pattern.launchOperator} ${pattern.launchValue ?? ''}`.trim()
                        : 'always'}
                    </p>
                    {pattern.launchEnabled && (
                      <p className='mt-1 text-[11px] text-sky-200/90'>
                      Launch scopes:{' '}
                        {normalizeProductValidationPatternLaunchScopes(
                          pattern.launchAppliesToScopes,
                          pattern.appliesToScopes
                        )
                          .map((scope: ProductValidationInstanceScope) => INSTANCE_SCOPE_LABELS[scope])
                          .join(' | ')}
                      </p>
                    )}
                    <p className='mt-1 text-[11px] text-fuchsia-200/90'>
                    Runtime:{' '}
                      {pattern.runtimeEnabled && pattern.runtimeType !== 'none'
                        ? `${pattern.runtimeType}${pattern.runtimeConfig ? ' configured' : ''}`
                        : 'off'}
                    </p>
                    <p className='mt-1 text-[11px] text-emerald-200/90'>
                    Scopes:{' '}
                      {normalizeProductValidationPatternScopes(pattern.appliesToScopes)
                        .map((scope: ProductValidationInstanceScope) => INSTANCE_SCOPE_LABELS[scope])
                        .join(' | ')}
                    </p>
                    <p className='mt-1 text-[11px] text-emerald-200/90'>
                    Deny policy:{' '}
                      {normalizeProductValidationPatternDenyBehaviorOverride(
                        pattern.denyBehaviorOverride
                      ) ?? 'inherit from form'}
                    </p>
                    {pattern.replacementEnabled && staticReplacement && (
                      <p className='mt-1 text-xs text-emerald-300'>
                      Replacer: <span className='font-mono'>{staticReplacement}</span>
                      </p>
                    )}
                    {pattern.replacementEnabled && dynamicRecipe && (
                      <p className='mt-1 text-xs text-cyan-200'>
                      Dynamic replacer: {describeDynamicReplacementRecipe(dynamicRecipe)}
                      </p>
                    )}
                    {pattern.replacementEnabled && (
                      <p className='mt-1 text-[11px] text-emerald-200/90'>
                      Fields: {formatReplacementFields(pattern.replacementFields)}
                      </p>
                    )}
                    {pattern.replacementEnabled && (
                      <p className='mt-1 text-[11px] text-emerald-200/90'>
                      Replacement scopes:{' '}
                        {normalizeProductValidationPatternReplacementScopes(
                          pattern.replacementAppliesToScopes,
                          pattern.appliesToScopes
                        )
                          .map((scope: ProductValidationInstanceScope) => INSTANCE_SCOPE_LABELS[scope])
                          .join(' | ')}
                      </p>
                    )}
                    {pattern.replacementEnabled && (
                      <p className='mt-1 text-[11px] text-cyan-200/90'>
                      Apply mode: {pattern.replacementAutoApply ? 'Auto-apply' : 'Proposal only'}
                      </p>
                    )}
                    {pattern.replacementEnabled && (
                      <p className='mt-1 text-[11px] text-cyan-200/90'>
                      No-op proposals:{' '}
                        {normalizeProductValidationSkipNoopReplacementProposal(
                          pattern.skipNoopReplacementProposal
                        )
                          ? 'Skip same-value replacements'
                          : 'Show same-value replacements'}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className='flex items-center gap-2'>
                <StatusToggle
                  enabled={pattern.enabled}
                  disabled={updatePatternPending || reorderPending}
                  onToggle={() => onTogglePattern(pattern)}
                />
                <Button
                  type='button'
                  onClick={() => onDuplicatePattern(pattern)}
                  variant='outline'
                  size='xs'
                  title='Duplicate pattern'
                  disabled={createPatternPending || reorderPending}
                  className='h-7 w-7 p-0'
                >
                  <Copy className='size-3' />
                </Button>
                <Button
                  type='button'
                  onClick={() => onEditPattern(pattern)}
                  variant='outline'
                  size='xs'
                  title='Edit pattern'
                  disabled={reorderPending}
                  className='h-7 w-7 p-0'
                >
                  <Pencil className='size-3' />
                </Button>
                <Button
                  type='button'
                  onClick={() => onDeletePattern(pattern)}
                  variant='destructive'
                  size='xs'
                  title='Delete pattern'
                  disabled={reorderPending}
                  className='h-7 w-7 p-0'
                >
                  <Trash2 className='size-3' />
                </Button>
              </div>
            </div>
          </FormSection>
        </div>
      )}
    </div>
  );
}, (prev, next) =>
  prev.pattern === next.pattern &&
  prev.isDragging === next.isDragging &&
  prev.isDragTarget === next.isDragTarget &&
  prev.patternActionsPending === next.patternActionsPending &&
  prev.updatePatternPending === next.updatePatternPending &&
  prev.createPatternPending === next.createPatternPending &&
  prev.reorderPending === next.reorderPending &&
  prev.groupDraft === next.groupDraft &&
  prev.group === next.group &&
  prev.isGroupFirst === next.isGroupFirst &&
  prev.isPatternCollapsed === next.isPatternCollapsed &&
  prev.isGroupCollapsed === next.isGroupCollapsed &&
  prev.dragOverPatternId === next.dragOverPatternId
);

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorpatterntablepanel
 */
export function ValidatorPatternTablePanel(): React.JSX.Element {
  const { toast } = useToast();
  const {
    summary,
    loading,
    patterns,
    orderedPatterns,
    patternActionsPending,
    reorderPending,
    createPatternPending,
    updatePatternPending,
    draggedPatternId,
    dragOverPatternId,
    setDraggedPatternId,
    setDragOverPatternId,
    sequenceGroups,
    firstPatternIdByGroup,
    getGroupDraft,
    setGroupDrafts,
    getSequenceGroupId,
    formatReplacementFields,
    openCreate,
    onCreateSkuAutoIncrementSequence,
    onCreateLatestPriceStockSequence,
    handleCreateNameLengthMirrorPattern,
    handleCreateNameCategoryMirrorPattern,
    handleCreateNameMirrorPolishSequence,
    handleSaveSequenceGroup,
    handleUngroup,
    handlePatternDrop,
    handleTogglePattern,
    handleDuplicatePattern,
    openEdit,
    setPatternToDelete,
  } = useValidatorSettingsContext();

  const handleCreateSkuAutoIncrement = (): void => {
    void onCreateSkuAutoIncrementSequence();
  };
  const handleCreateLatestPriceStock = (): void => {
    void onCreateLatestPriceStockSequence();
  };
  const handleCreateNameLengthMirror = (): void => {
    void handleCreateNameLengthMirrorPattern();
  };
  const handleCreateNameCategoryMirror = (): void => {
    void handleCreateNameCategoryMirrorPattern();
  };
  const handleCreateNameMirrorPolish = (): void => {
    void handleCreateNameMirrorPolishSequence();
  };
  const onSaveSequenceGroup = (groupId: string): void => {
    void handleSaveSequenceGroup(groupId);
  };
  const onUngroup = (groupId: string): void => {
    void handleUngroup(groupId);
  };
  const onPatternDrop = (
    pattern: ProductValidationPattern,
    event: React.DragEvent<HTMLDivElement>
  ): void => {
    handlePatternDrop(pattern, event);
  };
  const onTogglePattern = (pattern: ProductValidationPattern): void => {
    void handleTogglePattern(pattern);
  };
  const onDuplicatePattern = (pattern: ProductValidationPattern): void => {
    handleDuplicatePattern(pattern);
  };
  const onEditPattern = (pattern: ProductValidationPattern): void => {
    openEdit(pattern);
  };
  const onDeletePattern = (pattern: ProductValidationPattern): void => {
    setPatternToDelete(pattern);
  };
  const handleCopyFullDocumentation = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      toast('Clipboard API is not available in this browser.', { variant: 'error' });
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildFullValidatorDocumentationClipboardText()
      );
      toast('Full validator documentation copied (including JSON snippets).', {
        variant: 'success',
      });
    } catch {
      toast('Failed to copy full validator documentation.', { variant: 'error' });
    }
  };

  const [collapsedPatternIds, setCollapsedPatternIds] = React.useState<Set<string>>(new Set());
  const [collapsedGroupIds, setCollapsedGroupIds] = React.useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = React.useState(false);

  React.useEffect(() => {
    const validIds = new Set(orderedPatterns.map((pattern: ProductValidationPattern) => pattern.id));
    setCollapsedPatternIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id: string) => {
        if (validIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [orderedPatterns]);

  React.useEffect(() => {
    const validGroupIds = new Set(Array.from(sequenceGroups.keys()));
    setCollapsedGroupIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id: string) => {
        if (validGroupIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [sequenceGroups]);

  const togglePatternCollapse = React.useCallback((patternId: string): void => {
    setCollapsedPatternIds((prev) => {
      const next = new Set(prev);
      if (next.has(patternId)) {
        next.delete(patternId);
      } else {
        next.add(patternId);
      }
      return next;
    });
  }, []);

  const toggleGroupCollapse = React.useCallback((groupId: string): void => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const collapseAll = React.useCallback((): void => {
    setCollapsedPatternIds(new Set(orderedPatterns.map((pattern: ProductValidationPattern) => pattern.id)));
    setCollapsedGroupIds(new Set(Array.from(sequenceGroups.keys())));
  }, [orderedPatterns, sequenceGroups]);

  const expandAll = React.useCallback((): void => {
    setCollapsedPatternIds(new Set());
    setCollapsedGroupIds(new Set());
  }, []);

  return (
    <FormSection
      title='Regex Pattern Table'
      description={`Active patterns: ${summary.enabled}/${summary.total}`}
      variant='subtle'
      className='p-4'
      actions={(
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={collapseAll}
            disabled={patterns.length === 0}
          >
            Collapse all
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={expandAll}
            disabled={patterns.length === 0}
          >
            Expand all
          </Button>
          <Button
            onClick={handleCreateSkuAutoIncrement}
            disabled={patternActionsPending}
            variant='outline'
            className='border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10'
          >
            + SKU Auto Sequence
          </Button>
          <Button
            onClick={handleCreateLatestPriceStock}
            disabled={patternActionsPending}
            variant='outline'
            className='border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
          >
            + Latest Price & Stock
          </Button>
          <Button
            onClick={handleCreateNameLengthMirror}
            disabled={patternActionsPending}
            variant='outline'
            className='border-teal-500/40 text-teal-200 hover:bg-teal-500/10'
          >
            + Name Segment to Length + Height
          </Button>
          <Button
            onClick={handleCreateNameCategoryMirror}
            disabled={patternActionsPending}
            variant='outline'
            className='border-lime-500/40 text-lime-200 hover:bg-lime-500/10'
          >
            + Name Segment to Category
          </Button>
          <Button
            onClick={handleCreateNameMirrorPolish}
            disabled={patternActionsPending}
            variant='outline'
            className='border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/10'
          >
            + Name EN to PL
          </Button>
          <Button
            type='button'
            onClick={() => setShowImportModal(true)}
            variant='outline'
            className='border-fuchsia-500/40 text-fuchsia-200 hover:bg-fuchsia-500/10'
          >
            Import JSON
          </Button>
          <Button
            type='button'
            onClick={() => {
              void handleCopyFullDocumentation();
            }}
            variant='outline'
            className='border-sky-500/40 text-sky-200 hover:bg-sky-500/10'
            title='Copy all validation docs sections including JSON snippets'
          >
            Copy Full Validation Docs
          </Button>
          <Button onClick={() => openCreate()} variant='default'>
            <Plus className='mr-2 size-4' />
            Add Pattern
          </Button>
        </div>
      )}
    >
      <div className='mt-4'>
        {loading ? (
          <LoadingState message='Loading validator patterns...' className='py-8 border border-dashed' />
        ) : patterns.length === 0 ? (
          <EmptyState
            title='No validator patterns'
            description='Create your first regex rule to validate product names, descriptions, and SKU.'
            action={
              <Button onClick={() => openCreate()} variant='outline'>
                <Plus className='mr-2 size-4' />
                Create Pattern
              </Button>
            }
          />
        ) : (
          <div className='space-y-4'>
            {orderedPatterns.map((pattern: ProductValidationPattern) => {
              const dynamicRecipe = parseDynamicReplacementRecipe(pattern.replacementValue);
              const staticReplacement = getStaticReplacementValue(pattern.replacementValue);
              const groupId = getSequenceGroupId(pattern);
              const group = groupId ? sequenceGroups.get(groupId) ?? null : null;
              const isGroupFirst = Boolean(groupId && firstPatternIdByGroup.get(groupId) === pattern.id);
              const groupDraft = groupId ? getGroupDraft(groupId) : null;
              const isDragging = draggedPatternId === pattern.id;
              const isDragTarget = dragOverPatternId === pattern.id && draggedPatternId !== pattern.id;
              return (
                <PatternRow
                  key={pattern.id}
                  pattern={pattern}
                  isDragging={isDragging}
                  isDragTarget={isDragTarget}
                  patternActionsPending={patternActionsPending}
                  updatePatternPending={updatePatternPending}
                  createPatternPending={createPatternPending}
                  reorderPending={reorderPending}
                  groupId={groupId}
                  group={group}
                  isGroupFirst={isGroupFirst}
                  groupDraft={groupDraft}
                  dynamicRecipe={dynamicRecipe}
                  staticReplacement={staticReplacement}
                  onSaveSequenceGroup={onSaveSequenceGroup}
                  onUngroup={onUngroup}
                  onPatternDrop={onPatternDrop}
                  onTogglePattern={onTogglePattern}
                  onDuplicatePattern={onDuplicatePattern}
                  onEditPattern={onEditPattern}
                  onDeletePattern={onDeletePattern}
                  setDraggedPatternId={setDraggedPatternId}
                  setDragOverPatternId={setDragOverPatternId}
                  dragOverPatternId={dragOverPatternId}
                  draggedPatternId={draggedPatternId}
                  setGroupDrafts={setGroupDrafts}
                  formatReplacementFields={formatReplacementFields}
                  isPatternCollapsed={collapsedPatternIds.has(pattern.id)}
                  isGroupCollapsed={groupId ? collapsedGroupIds.has(groupId) : false}
                  onTogglePatternCollapse={togglePatternCollapse}
                  onToggleGroupCollapse={toggleGroupCollapse}
                />
              );
            })}
          </div>
        )}
      </div>
      <ValidatorPatternImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </FormSection>
  );
}
