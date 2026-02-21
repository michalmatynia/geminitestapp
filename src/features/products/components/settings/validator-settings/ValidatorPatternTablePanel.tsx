'use client';

import { Copy, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
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
  LoadingState,
  Input, 
  StatusToggle, 
  FormSection, 
  FormField, 
  StatusBadge 
} from '@/shared/ui';

import { INSTANCE_SCOPE_LABELS } from './constants';
import { ValidatorDocTooltip } from './ValidatorDocsTooltips';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';


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
}: PatternRowProps): React.JSX.Element {
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
                <ValidatorDocTooltip docId='validator.group.save'>
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
                </ValidatorDocTooltip>
              </div>
              <div className='flex items-end'>
                <ValidatorDocTooltip docId='validator.group.ungroup'>
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
                </ValidatorDocTooltip>
              </div>
            </div>
          </FormSection>
        </div>
      )}

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
                <ValidatorDocTooltip docId='validator.pattern.drag'>
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
                </ValidatorDocTooltip>
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
              </div>
              <div className='mt-1 truncate font-mono text-xs text-gray-300'>
              /{pattern.regex}/{pattern.flags ?? ''}
              </div>
              <p className='mt-1 text-xs text-gray-400'>{pattern.message}</p>
              <p className='mt-1 text-[11px] text-violet-200/90'>
              Sequence: {pattern.sequence ?? 'auto'} | Group: {groupId ?? 'none'} | Chain: {pattern.chainMode ?? 'continue'} | Max executions:{' '}
                {pattern.maxExecutions ?? 1} | Pass output: {pattern.passOutputToNext ?? true ? 'ON' : 'OFF'}
              </p>
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
            </div>

            <div className='flex items-center gap-2'>
              <ValidatorDocTooltip docId='validator.pattern.toggle'>
                <StatusToggle
                  enabled={pattern.enabled}
                  disabled={updatePatternPending || reorderPending}
                  onToggle={() => onTogglePattern(pattern)}
                />
              </ValidatorDocTooltip>
              <ValidatorDocTooltip docId='validator.pattern.duplicate'>
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
              </ValidatorDocTooltip>
              <ValidatorDocTooltip docId='validator.pattern.edit'>
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
              </ValidatorDocTooltip>
              <ValidatorDocTooltip docId='validator.pattern.delete'>
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
              </ValidatorDocTooltip>
            </div>
          </div>
        </FormSection>
      </div>
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
  prev.dragOverPatternId === next.dragOverPatternId
);

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorpatterntablepanel
 */
export function ValidatorPatternTablePanel(): React.JSX.Element {
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

  return (
    <FormSection
      title='Regex Pattern Table'
      description={`Active patterns: ${summary.enabled}/${summary.total}`}
      variant='subtle'
      className='p-4'
      actions={(
        <div className='flex flex-wrap items-center gap-2'>
          <ValidatorDocTooltip docId='validator.patterns.sequence.sku'>
            <Button
              onClick={handleCreateSkuAutoIncrement}
              disabled={patternActionsPending}
              variant='outline'
              className='border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10'
            >
              + SKU Auto Sequence
            </Button>
          </ValidatorDocTooltip>
          <ValidatorDocTooltip docId='validator.patterns.sequence.latestPriceStock'>
            <Button
              onClick={handleCreateLatestPriceStock}
              disabled={patternActionsPending}
              variant='outline'
              className='border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
            >
              + Latest Price & Stock
            </Button>
          </ValidatorDocTooltip>
          <ValidatorDocTooltip docId='validator.patterns.sequence.nameDimensions'>
            <Button
              onClick={handleCreateNameLengthMirror}
              disabled={patternActionsPending}
              variant='outline'
              className='border-teal-500/40 text-teal-200 hover:bg-teal-500/10'
            >
              + Name Segment to Length + Height
            </Button>
          </ValidatorDocTooltip>
          <ValidatorDocTooltip docId='validator.patterns.sequence.nameCategory'>
            <Button
              onClick={handleCreateNameCategoryMirror}
              disabled={patternActionsPending}
              variant='outline'
              className='border-lime-500/40 text-lime-200 hover:bg-lime-500/10'
            >
              + Name Segment to Category
            </Button>
          </ValidatorDocTooltip>
          <ValidatorDocTooltip docId='validator.patterns.sequence.nameMirrorPl'>
            <Button
              onClick={handleCreateNameMirrorPolish}
              disabled={patternActionsPending}
              variant='outline'
              className='border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/10'
            >
              + Name EN to PL
            </Button>
          </ValidatorDocTooltip>
          <ValidatorDocTooltip docId='validator.patterns.add'>
            <Button onClick={() => openCreate()} variant='default'>
              <Plus className='mr-2 size-4' />
              Add Pattern
            </Button>
          </ValidatorDocTooltip>
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
                />
              );
            })}
          </div>
        )}
      </div>
    </FormSection>
  );
}
