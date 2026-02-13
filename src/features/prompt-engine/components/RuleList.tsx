'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Button, Input, Label } from '@/shared/ui';

import { RuleItem } from './RuleItem';
import { usePromptEngine, type RuleDraft } from '../context/PromptEngineContext';

import type { PromptValidationRule } from '../settings';

type SequenceGroupView = {
  id: string;
  label: string;
  debounceMs: number;
  draftUids: string[];
};

const DEFAULT_SEQUENCE_STEP = 10;

const getSequenceGroupId = (rule: PromptValidationRule | null | undefined): string | null => {
  const value = rule?.sequenceGroupId?.trim();
  return value ? value : null;
};

const getRuleSequence = (rule: PromptValidationRule, fallbackIndex: number): number => {
  if (typeof rule.sequence === 'number' && Number.isFinite(rule.sequence)) {
    return Math.max(0, Math.floor(rule.sequence));
  }
  return (fallbackIndex + 1) * DEFAULT_SEQUENCE_STEP;
};

function sortDraftsBySequence<T extends { parsed: PromptValidationRule | null }>(
  drafts: T[],
): T[] {
  return drafts
    .map((draft: T, index: number) => ({ draft, index }))
    .sort((a, b) => {
      if (!a.draft.parsed && !b.draft.parsed) return 0;
      if (!a.draft.parsed) return 1;
      if (!b.draft.parsed) return -1;
      const aSeq = getRuleSequence(a.draft.parsed, a.index);
      const bSeq = getRuleSequence(b.draft.parsed, b.index);
      if (aSeq !== bSeq) return aSeq - bSeq;
      return a.draft.parsed.id.localeCompare(b.draft.parsed.id);
    })
    .map((entry) => entry.draft);
}

function buildSequenceGroups<T extends { uid: string; parsed: PromptValidationRule | null }>(
  drafts: T[],
): Map<string, SequenceGroupView> {
  const groups = new Map<string, SequenceGroupView>();
  for (const draft of drafts) {
    const groupId = getSequenceGroupId(draft.parsed);
    if (!groupId) continue;
    const existing = groups.get(groupId);
    if (existing) {
      existing.draftUids.push(draft.uid);
      if (!existing.label && draft.parsed?.sequenceGroupLabel?.trim()) {
        existing.label = draft.parsed.sequenceGroupLabel.trim();
      }
      continue;
    }
    groups.set(groupId, {
      id: groupId,
      label: draft.parsed?.sequenceGroupLabel?.trim() || 'Sequence / Group',
      debounceMs:
        typeof draft.parsed?.sequenceGroupDebounceMs === 'number' &&
        Number.isFinite(draft.parsed.sequenceGroupDebounceMs)
          ? Math.max(0, Math.floor(draft.parsed.sequenceGroupDebounceMs))
          : 0,
      draftUids: [draft.uid],
    });
  }
  return groups;
}

type SequenceGroupDraft = {
  label: string;
  debounceMs: string;
};

type RuleListEntry =
  | {
      kind: 'rule';
      draft: RuleDraft;
    }
  | {
      kind: 'group';
      group: SequenceGroupView;
      drafts: RuleDraft[];
      firstDraftUid: string;
    };

export function RuleList(): React.JSX.Element {
  const {
    filteredDrafts,
    query,
    severity,
    scope,
    patternTab,
    exploderSubTab,
    includeDisabled,
    handleSequenceDrop,
    handleSaveSequenceGroup,
    handleUngroupSequenceGroup,
  } = usePromptEngine();
  const [draggedUid, setDraggedUid] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [groupDrafts, setGroupDrafts] = useState<Record<string, SequenceGroupDraft>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const activeTabLabel =
    patternTab === 'core'
      ? 'Core'
      : exploderSubTab === 'image_studio_rules'
        ? 'Image Studio Rules'
        : 'Prompt Exploder Rules';

  const sequencingLocked =
    query.trim().length > 0 ||
    severity !== 'all' ||
    scope !== 'all' ||
    !includeDisabled;
  const orderedDrafts = useMemo(() => sortDraftsBySequence(filteredDrafts), [filteredDrafts]);
  const sequenceGroups = useMemo(() => buildSequenceGroups(orderedDrafts), [orderedDrafts]);

  const draftsByGroup = useMemo(() => {
    const map = new Map<string, RuleDraft[]>();
    for (const draft of orderedDrafts) {
      const groupId = getSequenceGroupId(draft.parsed);
      if (!groupId) continue;
      const list = map.get(groupId) ?? [];
      list.push(draft);
      map.set(groupId, list);
    }
    return map;
  }, [orderedDrafts]);

  const entries = useMemo((): RuleListEntry[] => {
    const list: RuleListEntry[] = [];
    const consumed = new Set<string>();
    for (const draft of orderedDrafts) {
      if (consumed.has(draft.uid)) continue;
      const groupId = getSequenceGroupId(draft.parsed);
      if (!groupId) {
        list.push({ kind: 'rule', draft });
        continue;
      }
      const group = sequenceGroups.get(groupId);
      const groupDrafts = draftsByGroup.get(groupId) ?? [draft];
      for (const child of groupDrafts) consumed.add(child.uid);
      if (!group) {
        for (const child of groupDrafts) {
          list.push({ kind: 'rule', draft: child });
        }
        continue;
      }
      list.push({
        kind: 'group',
        group,
        drafts: groupDrafts,
        firstDraftUid: groupDrafts[0]?.uid ?? draft.uid,
      });
    }
    return list;
  }, [draftsByGroup, orderedDrafts, sequenceGroups]);

  const getGroupDraft = (groupId: string): SequenceGroupDraft => {
    const existing = groupDrafts[groupId];
    if (existing) return existing;
    const group = sequenceGroups.get(groupId);
    return {
      label: group?.label ?? 'Sequence / Group',
      debounceMs: String(group?.debounceMs ?? 0),
    };
  };

  return (
    <div className='space-y-4'>
      {filteredDrafts.length === 0 ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-6'>
          <div className='text-sm text-gray-400'>
            No rules match this filter in the {activeTabLabel} list.
          </div>
        </div>
      ) : null}
      {sequencingLocked ? (
        <div className='rounded-lg border border-amber-500/40 bg-amber-500/10 p-4'>
          <div className='text-xs text-amber-200'>
            Sequence drag-and-drop is disabled while filters are active. Clear search, set severity to
            <span className='mx-1 font-medium'>All</span>
            and scope to
            <span className='mx-1 font-medium'>All scopes</span>
            , then enable
            <span className='mx-1 font-medium'>Include disabled</span>
            to reorder/group rules.
          </div>
        </div>
      ) : null}
      {entries.map((entry) => {
        if (entry.kind === 'rule') {
          const draft = entry.draft;
          const isDragging = draggedUid === draft.uid;
          const isDragTarget = dragOverKey === draft.uid && draggedUid !== draft.uid;
          return (
            <div key={draft.uid} className='space-y-2'>
              <div
                onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
                  if (sequencingLocked) return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (dragOverKey !== draft.uid) {
                    setDragOverKey(draft.uid);
                  }
                }}
                onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
                  if (dragOverKey !== draft.uid) return;
                  const nextTarget = event.relatedTarget as Node | null;
                  if (nextTarget && event.currentTarget.contains(nextTarget)) return;
                  setDragOverKey(null);
                }}
                onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
                  if (sequencingLocked) return;
                  event.preventDefault();
                  event.stopPropagation();
                  const droppedUid = draggedUid || event.dataTransfer.getData('text/plain');
                  if (!droppedUid || droppedUid === draft.uid) {
                    setDraggedUid(null);
                    setDragOverKey(null);
                    return;
                  }
                  handleSequenceDrop(droppedUid, draft.uid);
                  setDraggedUid(null);
                  setDragOverKey(null);
                }}
              >
                <RuleItem
                  draft={draft}
                  draggableEnabled={!sequencingLocked}
                  isDragging={isDragging}
                  isDragTarget={isDragTarget}
                  onDragStart={() => {
                    if (sequencingLocked) return;
                    setDraggedUid(draft.uid);
                    setDragOverKey(null);
                  }}
                  onDragEnd={() => {
                    setDraggedUid(null);
                    setDragOverKey(null);
                  }}
                />
              </div>
            </div>
          );
        }

        const group = entry.group;
        const groupDraft = getGroupDraft(group.id);
        const isCollapsed = collapsedGroups[group.id] ?? false;
        const groupDropKey = `group:${group.id}`;
        const isGroupDropTarget = dragOverKey === groupDropKey && draggedUid !== null;
        return (
          <div key={group.id} className='space-y-2'>
            <div
              className={`rounded-md border p-3 ${isGroupDropTarget ? 'border-cyan-200/60 bg-cyan-500/12' : 'border-cyan-500/35 bg-cyan-500/8'}`}
              onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
                if (sequencingLocked) return;
                event.preventDefault();
                event.stopPropagation();
                if (dragOverKey !== groupDropKey) {
                  setDragOverKey(groupDropKey);
                }
              }}
              onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
                if (dragOverKey !== groupDropKey) return;
                const nextTarget = event.relatedTarget as Node | null;
                if (nextTarget && event.currentTarget.contains(nextTarget)) return;
                setDragOverKey(null);
              }}
              onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
                if (sequencingLocked) return;
                event.preventDefault();
                event.stopPropagation();
                const droppedUid = draggedUid || event.dataTransfer.getData('text/plain');
                if (!droppedUid || droppedUid === entry.firstDraftUid) {
                  setDraggedUid(null);
                  setDragOverKey(null);
                  return;
                }
                handleSequenceDrop(droppedUid, entry.firstDraftUid);
                setDraggedUid(null);
                setDragOverKey(null);
              }}
            >
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <button
                  type='button'
                  className='inline-flex items-center gap-2 rounded border border-cyan-400/45 bg-cyan-400/10 px-2 py-1 text-[10px] uppercase text-cyan-100 hover:bg-cyan-400/20'
                  onClick={() => {
                    setCollapsedGroups((prev: Record<string, boolean>) => ({
                      ...prev,
                      [group.id]: !(prev[group.id] ?? false),
                    }));
                  }}
                >
                  {isCollapsed ? <ChevronRight className='size-3' /> : <ChevronDown className='size-3' />}
                  Sequence / Group
                </button>
                <span className='text-xs text-cyan-100/90'>
                  {entry.drafts.length} rule{entry.drafts.length === 1 ? '' : 's'}
                </span>
              </div>

              {!isCollapsed ? (
                <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto_auto]'>
                  <div>
                    <Label className='text-[11px] text-cyan-100/80'>Group Label</Label>
                    <Input
                      className='mt-1 h-8'
                      value={groupDraft.label}
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
                    />
                  </div>
                  <div>
                    <Label className='text-[11px] text-cyan-100/80'>Debounce (ms)</Label>
                    <Input
                      type='number'
                      min={0}
                      max={30000}
                      className='mt-1 h-8'
                      value={groupDraft.debounceMs}
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
                      className='h-8 rounded bg-slate-800 px-3 text-xs text-slate-100 hover:bg-slate-700'
                      onClick={() => {
                        const parsed = Number(groupDraft.debounceMs);
                        const debounceMs = Number.isFinite(parsed) ? parsed : group.debounceMs;
                        handleSaveSequenceGroup(group.id, groupDraft.label, debounceMs);
                      }}
                    >
                      Save Group
                    </Button>
                  </div>
                  <div className='flex items-end'>
                    <Button
                      type='button'
                      className='h-8 rounded border border-amber-500/45 bg-amber-500/15 px-3 text-xs text-amber-100 hover:bg-amber-500/25'
                      onClick={() => handleUngroupSequenceGroup(group.id)}
                    >
                      Ungroup
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {!isCollapsed ? (
              <div className='ml-6 space-y-2'>
                {entry.drafts.map((draft) => {
                  const isDragging = draggedUid === draft.uid;
                  const isDragTarget = dragOverKey === draft.uid && draggedUid !== draft.uid;
                  return (
                    <div
                      key={draft.uid}
                      onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
                        if (sequencingLocked) return;
                        event.preventDefault();
                        event.stopPropagation();
                        if (dragOverKey !== draft.uid) {
                          setDragOverKey(draft.uid);
                        }
                      }}
                      onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
                        if (dragOverKey !== draft.uid) return;
                        const nextTarget = event.relatedTarget as Node | null;
                        if (nextTarget && event.currentTarget.contains(nextTarget)) return;
                        setDragOverKey(null);
                      }}
                      onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
                        if (sequencingLocked) return;
                        event.preventDefault();
                        event.stopPropagation();
                        const droppedUid = draggedUid || event.dataTransfer.getData('text/plain');
                        if (!droppedUid || droppedUid === draft.uid) {
                          setDraggedUid(null);
                          setDragOverKey(null);
                          return;
                        }
                        handleSequenceDrop(droppedUid, draft.uid);
                        setDraggedUid(null);
                        setDragOverKey(null);
                      }}
                    >
                      <RuleItem
                        draft={draft}
                        draggableEnabled={!sequencingLocked}
                        isDragging={isDragging}
                        isDragTarget={isDragTarget}
                        onDragStart={() => {
                          if (sequencingLocked) return;
                          setDraggedUid(draft.uid);
                          setDragOverKey(null);
                        }}
                        onDragEnd={() => {
                          setDraggedUid(null);
                          setDragOverKey(null);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
