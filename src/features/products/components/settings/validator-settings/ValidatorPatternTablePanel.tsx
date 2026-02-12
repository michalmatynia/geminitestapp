'use client';

import { Copy, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';

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
} from '@/shared/types/domain/products';
import { Button, EmptyState, Input, Label, SectionPanel } from '@/shared/ui';

import { INSTANCE_SCOPE_LABELS } from './constants';
import { ToggleButton } from './ToggleButton';

import type { SequenceGroupDraft, SequenceGroupView } from './types';

type ValidatorPatternTablePanelProps = {
  summary: { total: number; enabled: number };
  loading: boolean;
  patterns: ProductValidationPattern[];
  orderedPatterns: ProductValidationPattern[];
  patternActionsPending: boolean;
  reorderPending: boolean;
  createPatternPending: boolean;
  updatePatternPending: boolean;
  draggedPatternId: string | null;
  dragOverPatternId: string | null;
  setDraggedPatternId: (value: string | null) => void;
  setDragOverPatternId: (value: string | null) => void;
  sequenceGroups: Map<string, SequenceGroupView>;
  firstPatternIdByGroup: Map<string, string>;
  getGroupDraft: (groupId: string) => SequenceGroupDraft;
  setGroupDrafts: React.Dispatch<React.SetStateAction<Record<string, SequenceGroupDraft>>>;
  getSequenceGroupId: (pattern: ProductValidationPattern) => string | null;
  formatReplacementFields: (fields: string[] | null | undefined) => string;
  openCreate: () => void;
  onCreateSkuAutoIncrementSequence: () => void;
  onCreateLatestPriceStockSequence: () => void;
  onCreateNameLengthMirrorPattern: () => void;
  onCreateNameCategoryMirrorPattern: () => void;
  onCreateNameMirrorPolishSequence: () => void;
  onSaveSequenceGroup: (groupId: string) => void;
  onUngroup: (groupId: string) => void;
  onPatternDrop: (
    pattern: ProductValidationPattern,
    event: React.DragEvent<HTMLDivElement>
  ) => void;
  onTogglePattern: (pattern: ProductValidationPattern) => void;
  onDuplicatePattern: (pattern: ProductValidationPattern) => void;
  onEditPattern: (pattern: ProductValidationPattern) => void;
  onDeletePattern: (pattern: ProductValidationPattern) => void;
};

export function ValidatorPatternTablePanel({
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
  onCreateNameLengthMirrorPattern,
  onCreateNameCategoryMirrorPattern,
  onCreateNameMirrorPolishSequence,
  onSaveSequenceGroup,
  onUngroup,
  onPatternDrop,
  onTogglePattern,
  onDuplicatePattern,
  onEditPattern,
  onDeletePattern,
}: ValidatorPatternTablePanelProps): React.JSX.Element {
  return (
    <SectionPanel variant='subtle' className='p-4'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold text-white'>Regex Pattern Table</p>
          <p className='text-xs text-gray-400'>
            Active patterns: {summary.enabled}/{summary.total}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            onClick={onCreateSkuAutoIncrementSequence}
            disabled={patternActionsPending}
            className='border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20'
          >
            + SKU Auto Sequence
          </Button>
          <Button
            onClick={onCreateLatestPriceStockSequence}
            disabled={patternActionsPending}
            className='border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20'
          >
            + Latest Price & Stock
          </Button>
          <Button
            onClick={onCreateNameLengthMirrorPattern}
            disabled={patternActionsPending}
            className='border border-teal-500/40 bg-teal-500/10 text-teal-100 hover:bg-teal-500/20'
          >
            + Name Segment to Length + Height
          </Button>
          <Button
            onClick={onCreateNameCategoryMirrorPattern}
            disabled={patternActionsPending}
            className='border border-lime-500/40 bg-lime-500/10 text-lime-100 hover:bg-lime-500/20'
          >
            + Name Segment to Category
          </Button>
          <Button
            onClick={onCreateNameMirrorPolishSequence}
            disabled={patternActionsPending}
            className='border border-indigo-500/40 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20'
          >
            + Name EN to PL
          </Button>
          <Button onClick={openCreate} className='bg-white text-gray-900 hover:bg-gray-200'>
            <Plus className='mr-2 size-4' />
            Add Pattern
          </Button>
        </div>
      </div>

      {loading ? (
        <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
          Loading validator patterns...
        </div>
      ) : patterns.length === 0 ? (
        <EmptyState
          title='No validator patterns'
          description='Create your first regex rule to validate product names, descriptions, and SKU.'
          action={
            <Button onClick={openCreate} variant='outline'>
              <Plus className='mr-2 size-4' />
              Create Pattern
            </Button>
          }
        />
      ) : (
        <div className='space-y-2'>
          {orderedPatterns.map((pattern: ProductValidationPattern) => {
            const dynamicRecipe = parseDynamicReplacementRecipe(pattern.replacementValue);
            const staticReplacement = getStaticReplacementValue(pattern.replacementValue);
            const groupId = getSequenceGroupId(pattern);
            const group = groupId ? sequenceGroups.get(groupId) : null;
            const isGroupFirst = Boolean(groupId && firstPatternIdByGroup.get(groupId) === pattern.id);
            const groupDraft = groupId ? getGroupDraft(groupId) : null;
            const isDragging = draggedPatternId === pattern.id;
            const isDragTarget = dragOverPatternId === pattern.id && draggedPatternId !== pattern.id;
            return (
              <div key={pattern.id} className='space-y-2'>
                {isGroupFirst && group && (
                  <SectionPanel variant='subtle-compact' className='border border-cyan-500/35 bg-cyan-500/8 p-3'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='rounded border border-cyan-400/50 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase text-cyan-100'>
                        Sequence / Group
                      </span>
                      <span className='text-xs text-cyan-100/90'>
                        {group.patternIds.length} pattern{group.patternIds.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto_auto]'>
                      <div>
                        <Label className='text-[11px] text-cyan-100/80'>Group Label</Label>
                        <Input
                          className='mt-1 h-8'
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
                      </div>
                      <div>
                        <Label className='text-[11px] text-cyan-100/80'>Debounce (ms)</Label>
                        <Input
                          type='number'
                          min={0}
                          max={30000}
                          className='mt-1 h-8'
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
                      </div>
                      <div className='flex items-end'>
                        <Button
                          type='button'
                          disabled={patternActionsPending}
                          className='h-8 rounded bg-slate-800 px-3 text-xs text-slate-100 hover:bg-slate-700'
                          onClick={() => onSaveSequenceGroup(group.id)}
                        >
                          Save Group
                        </Button>
                      </div>
                      <div className='flex items-end'>
                        <Button
                          type='button'
                          disabled={patternActionsPending}
                          className='h-8 rounded border border-amber-500/45 bg-amber-500/15 px-3 text-xs text-amber-100 hover:bg-amber-500/25'
                          onClick={() => onUngroup(group.id)}
                        >
                          Ungroup
                        </Button>
                      </div>
                    </div>
                  </SectionPanel>
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
                    onPatternDrop(pattern, event);
                  }}
                >
                  <SectionPanel
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
                          <span className='rounded border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[10px] uppercase text-blue-200'>
                            {pattern.target}
                          </span>
                          <span className='rounded border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[10px] uppercase text-indigo-200'>
                            {pattern.target === 'name' || pattern.target === 'description'
                              ? pattern.locale || 'any locale'
                              : 'n/a'}
                          </span>
                          <span
                            className={`rounded border px-2 py-0.5 text-[10px] uppercase ${
                              pattern.severity === 'warning'
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                                : 'border-red-500/40 bg-red-500/10 text-red-200'
                            }`}
                          >
                            {pattern.severity}
                          </span>
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
                        <ToggleButton
                          enabled={pattern.enabled}
                          disabled={updatePatternPending || reorderPending}
                          onClick={() => onTogglePattern(pattern)}
                        />
                        <Button
                          type='button'
                          onClick={() => onDuplicatePattern(pattern)}
                          className='rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 hover:bg-slate-700'
                          title='Duplicate pattern'
                          disabled={createPatternPending || reorderPending}
                        >
                          <Copy className='size-3' />
                        </Button>
                        <Button
                          type='button'
                          onClick={() => onEditPattern(pattern)}
                          className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700'
                          title='Edit pattern'
                          disabled={reorderPending}
                        >
                          <Pencil className='size-3' />
                        </Button>
                        <Button
                          type='button'
                          onClick={() => onDeletePattern(pattern)}
                          className='rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600'
                          title='Delete pattern'
                          disabled={reorderPending}
                        >
                          <Trash2 className='size-3' />
                        </Button>
                      </div>
                    </div>
                  </SectionPanel>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionPanel>
  );
}
