'use client';

import { ChevronDown, ChevronRight, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { FilterField } from '@/shared/contracts/ui';
import {
  PROMPT_VALIDATION_SCOPE_LABELS,
  PROMPT_VALIDATION_SCOPE_VALUES,
  type PromptValidationRule,
  type PromptValidationScope,
  type PromptValidationSeverity,
} from '@/shared/lib/prompt-engine/settings';
import {
  Alert,
  Button,
  Card,
  ClientOnly,
  CompactEmptyState,
  CopyButton,
  FileUploadButton,
  FormSection,
  Hint,
  Input,
  JSONImportModal,
  Label,
  MetadataItem,
  SectionHeader,
  SegmentedControl,
  StatusBadge,
  Textarea,
  UI_GRID_RELAXED_CLASSNAME,
} from '@/shared/ui';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import { cn } from '@/shared/utils';

import { RuleListDragProvider } from '../components/context/RuleListDragContext';
import { RuleItem } from '../components/RuleItem';
import { usePromptEngineActions } from '../context/prompt-engine/PromptEngineActionsContext';
import {
  type ExploderPatternSubTab,
  type PatternCollectionTab,
  usePromptEngineConfig,
} from '../context/prompt-engine/PromptEngineConfigContext';
import { usePromptEngineData } from '../context/prompt-engine/PromptEngineDataContext';
import {
  type ScopeFilter,
  type SeverityFilter,
  usePromptEngineFilters,
} from '../context/prompt-engine/PromptEngineFiltersContext';
import { type RuleDraft } from '../context/prompt-engine-context-utils';
import { PromptEngineProvider } from '../context/PromptEngineContext';
import {
  PromptEngineValidationPageProvider,
  useOptionalPromptEngineValidationPageContext,
} from '../context/PromptEngineValidationPageContext';

type AdminPromptEngineValidationPatternsPageProps = {
  embedded?: boolean;
  onSaved?: () => void;
  eyebrow?: string;
  backLinkHref?: string;
  backLinkLabel?: string;
  initialPatternTab?: PatternCollectionTab;
  initialExploderSubTab?: ExploderPatternSubTab;
  lockedPatternTab?: PatternCollectionTab;
  lockedExploderSubTab?: ExploderPatternSubTab;
  initialScope?: PromptValidationScope | 'all';
  lockedScope?: PromptValidationScope | 'all';
};

const DEFAULT_EYEBROW = 'AI · Prompt Engine';
const DEFAULT_BACK_LINK_HREF = '/admin/prompt-engine/validation';
const DEFAULT_BACK_LINK_LABEL = 'Back to Prompt Engine';

const SEVERITY_OPTIONS: Array<LabeledOptionDto<SeverityFilter>> = [
  { value: 'all', label: 'All' },
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

const SCOPE_OPTIONS: Array<LabeledOptionDto<ScopeFilter>> = [
  { value: 'all', label: 'All scopes' },
  ...PROMPT_VALIDATION_SCOPE_VALUES.map((value) => ({
    value,
    label: PROMPT_VALIDATION_SCOPE_LABELS[value],
  })),
];

const PATTERN_TAB_OPTIONS: Array<LabeledOptionDto<PatternCollectionTab>> = [
  { value: 'core', label: 'Core Patterns' },
  { value: 'prompt_exploder', label: 'Exploder' },
];

const EXPLODER_SUBTAB_OPTIONS: Array<LabeledOptionDto<ExploderPatternSubTab>> = [
  { value: 'prompt_exploder_rules', label: 'Prompt Exploder' },
  { value: 'image_studio_rules', label: 'Image Studio' },
  { value: 'case_resolver_rules', label: 'Case Resolver' },
];

const DEFAULT_SEQUENCE_STEP = 10;

const formatSeverityLabel = (severity: PromptValidationSeverity): string => {
  if (severity === 'error') return 'Error';
  if (severity === 'warning') return 'Warning';
  return 'Info';
};

const severityToVariant = (severity: PromptValidationSeverity) => {
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'info';
};

type SequenceGroupView = {
  id: string;
  label: string;
  debounceMs: number;
  draftUids: string[];
};

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

function sortDraftsBySequence<T extends { parsed: PromptValidationRule | null }>(drafts: T[]): T[] {
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
  drafts: T[]
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

function PromptEngineToolbar(): React.JSX.Element {
  const pageContext = useOptionalPromptEngineValidationPageContext();
  const resolvedEmbedded = pageContext?.embedded ?? false;
  const resolvedEyebrow = pageContext?.eyebrow ?? DEFAULT_EYEBROW;
  const resolvedBackLinkHref = pageContext?.backLinkHref ?? DEFAULT_BACK_LINK_HREF;
  const resolvedBackLinkLabel = pageContext?.backLinkLabel ?? DEFAULT_BACK_LINK_LABEL;
  const { patternTab, exploderSubTab } = usePromptEngineConfig();
  const { isSaving, isDirty, learnedDirty, isLoading } = usePromptEngineData();
  const {
    handleExport,
    handleExportLearned,
    handleImport,
    handleImportLearned,
    handleAddRule,
    handleAddLearnedRule,
    handleSave,
    handleRefresh,
  } = usePromptEngineActions();
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteTarget, setPasteTarget] = useState<'rules' | 'learned'>('rules');

  const openPasteModal = (target: 'rules' | 'learned'): void => {
    setPasteTarget(target);
    setPasteModalOpen(true);
  };

  const applyPastedJson = async (value: string): Promise<void> => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const file = new File(
      [trimmed],
      pasteTarget === 'rules'
        ? 'prompt-engine-validation-patterns.pasted.json'
        : 'prompt-engine-learned-patterns.pasted.json',
      { type: 'application/json' }
    );
    if (pasteTarget === 'rules') {
      await handleImport(file);
    } else {
      await handleImportLearned(file);
    }
    setPasteModalOpen(false);
  };

  const addRuleLabel =
    patternTab === 'prompt_exploder'
      ? exploderSubTab === 'image_studio_rules'
        ? 'Add Image Studio Rule'
        : exploderSubTab === 'case_resolver_rules'
          ? 'Add Case Resolver Rule'
          : 'Add Exploder Rule'
      : 'Add rule';

  return (
    <SectionHeader
      eyebrow={resolvedEyebrow}
      title='Validation Patterns'
      description='Browse Prompt Validator rules (patterns, similar matches, and autofix operations).'
      actions={
        <>
          {!resolvedEmbedded ? (
            <Button type='button' variant='outline' asChild aria-label='Open link' title='Open link'>
              <Link href={resolvedBackLinkHref}>{resolvedBackLinkLabel}</Link>
            </Button>
          ) : null}
          <Button type='button' variant='outline' onClick={handleExport}>
            Export JSON
          </Button>
          <Button type='button' variant='outline' onClick={handleExportLearned}>
            Export learned
          </Button>
          <FileUploadButton
            variant='outline'
            accept='application/json'
            onFilesSelected={(files: File[]) => {
              const file = files[0];
              if (!file) return;
              void handleImport(file);
            }}
          >
            Import JSON
          </FileUploadButton>
          <Button type='button' variant='outline' onClick={() => openPasteModal('rules')}>
            Paste JSON
          </Button>
          <FileUploadButton
            variant='outline'
            accept='application/json'
            onFilesSelected={(files: File[]) => {
              const file = files[0];
              if (!file) return;
              void handleImportLearned(file);
            }}
          >
            Import learned
          </FileUploadButton>
          <Button type='button' variant='outline' onClick={() => openPasteModal('learned')}>
            Paste learned
          </Button>
          <Button type='button' variant='outline' onClick={handleAddRule}>
            {addRuleLabel}
          </Button>
          <Button type='button' variant='outline' onClick={handleAddLearnedRule}>
            Add learned
          </Button>
          <Button
            type='button'
            onClick={() => void handleSave()}
            loading={isSaving}
            disabled={!isDirty && !learnedDirty}
          >
            Save changes
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => void handleRefresh()}
            loading={isLoading}
            title='Reload settings'
          >
            <RefreshCcw className='mr-2 size-4' />
            Refresh
          </Button>
        </>
      }
    >
      <JSONImportModal
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        onImport={applyPastedJson}
        title={
          pasteTarget === 'rules' ? 'Paste Validation Patterns JSON' : 'Paste Learned Patterns JSON'
        }
        subtitle='Paste a JSON array of rule objects, then import into the current tab.'
        confirmText='Import Pasted JSON'
        isLoading={isSaving}
        placeholder='Paste JSON array of rules here'
      />
    </SectionHeader>
  );
}

function PromptEngineFilters(): React.JSX.Element {
  const { patternTab, patternTabLocked, exploderSubTab, exploderSubTabLocked, scopeLocked } =
    usePromptEngineConfig();
  const {
    query,
    setQuery,
    severity,
    setSeverity,
    scope,
    setScope,
    includeDisabled,
    setIncludeDisabled,
  } = usePromptEngineFilters();
  const { filteredDrafts } = usePromptEngineData();
  const { setPatternTab, setExploderSubTab } = usePromptEngineActions();
  const activeTabLabel =
    patternTab === 'core'
      ? 'Core'
      : exploderSubTab === 'image_studio_rules'
        ? 'Image Studio Rules'
        : exploderSubTab === 'case_resolver_rules'
          ? 'Case Resolver Rules'
          : 'Prompt Exploder Rules';
  const showPatternTabSwitch = !patternTabLocked;
  const showExploderSubTabSwitch = patternTab === 'prompt_exploder' && !exploderSubTabLocked;

  const filters: FilterField[] = [
    {
      key: 'severity',
      label: 'Severity',
      type: 'select',
      options: SEVERITY_OPTIONS,
    },
    ...(scopeLocked
      ? []
      : [
          {
            key: 'scope',
            label: 'Scope',
            type: 'select',
            options: SCOPE_OPTIONS,
          } satisfies FilterField,
        ]),
    {
      key: 'includeDisabled',
      label: 'Include Disabled',
      type: 'checkbox',
    },
  ];

  return (
    <div className='space-y-3'>
      {showPatternTabSwitch ? (
        <SegmentedControl
          size='md'
          className='w-full max-w-md'
          value={patternTab}
          ariaLabel='Prompt engine pattern tabs'
          onChange={(value) => {
            setPatternTab(value);
          }}
          options={PATTERN_TAB_OPTIONS}
        />
      ) : null}
      {showExploderSubTabSwitch ? (
        <SegmentedControl
          size='md'
          className='w-full max-w-2xl'
          value={exploderSubTab}
          ariaLabel='Prompt exploder rule categories'
          onChange={(value) => {
            setExploderSubTab(value);
          }}
          options={EXPLODER_SUBTAB_OPTIONS}
        />
      ) : null}

      <div className='text-xs text-gray-400'>
        Showing <span className='text-gray-200'>{filteredDrafts.length}</span> pattern(s) in{' '}
        <span className='text-gray-200'>{activeTabLabel}</span> list.
        {scopeLocked && scope !== 'all' ? (
          <>
            {' '}
            Scope: <span className='text-gray-200'>{PROMPT_VALIDATION_SCOPE_LABELS[scope]}</span>.
          </>
        ) : null}
      </div>

      <FilterPanel
        filters={filters}
        values={{ severity, scope, includeDisabled }}
        search={query}
        searchPlaceholder='Search ids, patterns, suggestions...'
        onFilterChange={(key, value) => {
          if (key === 'severity') setSeverity(value as SeverityFilter);
          if (key === 'scope') setScope(value as ScopeFilter);
          if (key === 'includeDisabled') setIncludeDisabled(Boolean(value));
        }}
        onSearchChange={setQuery}
        onReset={() => {
          setQuery('');
          setSeverity('all');
          if (!scopeLocked) {
            setScope('all');
          }
          if (!patternTabLocked) {
            setPatternTab('core');
          }
          if (!exploderSubTabLocked) {
            setExploderSubTab('prompt_exploder_rules');
          }
          setIncludeDisabled(false);
        }}
        showHeader={false}
        compact={false}
      />
    </div>
  );
}

function RuleList(): React.JSX.Element {
  const { filteredDrafts } = usePromptEngineData();
  const { query, severity, scope, includeDisabled } = usePromptEngineFilters();
  const { patternTab, exploderSubTab } = usePromptEngineConfig();
  const { handleSequenceDrop, handleSaveSequenceGroup, handleUngroupSequenceGroup } =
    usePromptEngineActions();
  const [draggedUid, setDraggedUid] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [groupDrafts, setGroupDrafts] = useState<Record<string, SequenceGroupDraft>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const activeTabLabel =
    patternTab === 'core'
      ? 'Core'
      : exploderSubTab === 'image_studio_rules'
        ? 'Image Studio Rules'
        : exploderSubTab === 'case_resolver_rules'
          ? 'Case Resolver Rules'
          : 'Prompt Exploder Rules';

  const sequencingLocked =
    query.trim().length > 0 || severity !== 'all' || scope !== 'all' || !includeDisabled;
  const draggableEnabled = !sequencingLocked;
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

  const dragContextValue = useMemo(
    () => ({
      draggableEnabled,
      draggedUid,
      dragOverKey,
      setDraggedUid,
      setDragOverKey,
    }),
    [dragOverKey, draggableEnabled, draggedUid, setDraggedUid, setDragOverKey]
  );

  return (
    <RuleListDragProvider value={dragContextValue}>
      <div className='space-y-4'>
        {filteredDrafts.length === 0 ? (
          <CompactEmptyState
            title='No rules found'
            description={`No rules match your filters in the ${activeTabLabel} list.`}
          />
        ) : null}
        {sequencingLocked ? (
          <Card variant='warning' padding='md' className='border-amber-500/40 bg-amber-500/10'>
            <div className='mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200/70'>
              Sequencing Locked
            </div>
            <div className='text-xs text-amber-200'>
              Sequence drag-and-drop is disabled while filters are active. Clear search, set
              severity to
              <span className='mx-1 font-medium'>All</span>
              and scope to
              <span className='mx-1 font-medium'>All scopes</span>, then enable
              <span className='mx-1 font-medium'>Include disabled</span>
              to reorder/group rules.
            </div>
          </Card>
        ) : null}
        {entries.map((entry) => {
          if (entry.kind === 'rule') {
            const draft = entry.draft;
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
                  <RuleItem draft={draft} />
                </div>
              </div>
            );
          }

          const group = entry.group;
          const groupDraft = getGroupDraft(group.id);
          const isCollapsed = collapsedGroups[group.id] ?? true;
          const groupDropKey = `group:${group.id}`;
          const isGroupDropTarget = dragOverKey === groupDropKey && draggedUid !== null;
          return (
            <div key={group.id} className='space-y-2'>
              <Card
                variant='info'
                padding='sm'
                className={cn(
                  'border-cyan-500/35 bg-cyan-500/8 transition-all',
                  isGroupDropTarget && 'border-cyan-200/60 bg-cyan-500/12 ring-2 ring-cyan-400/20'
                )}
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
                    {isCollapsed ? (
                      <ChevronRight className='size-3' />
                    ) : (
                      <ChevronDown className='size-3' />
                    )}
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
                        className='mt-1 h-8 bg-black/20 border-cyan-500/20'
                        value={groupDraft.label}
                        aria-label='Group label'
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
                        title='Input field'
                      />
                    </div>
                    <div>
                      <Label className='text-[11px] text-cyan-100/80'>Debounce (ms)</Label>
                      <Input
                        type='number'
                        min={0}
                        max={30000}
                        className='mt-1 h-8 bg-black/20 border-cyan-500/20'
                        value={groupDraft.debounceMs}
                        aria-label='Group debounce in milliseconds'
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
                        title='Input field'
                      />
                    </div>
                    <div className='flex items-end'>
                      <Button
                        type='button'
                        size='xs'
                        variant='solid'
                        className='h-8'
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
                        variant='outline'
                        size='xs'
                        className='h-8 border-amber-500/45 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25'
                        onClick={() => handleUngroupSequenceGroup(group.id)}
                      >
                        Ungroup
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>

              {!isCollapsed ? (
                <div className='ml-6 space-y-2'>
                  {entry.drafts.map((draft) => {
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
                        <RuleItem draft={draft} />
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </RuleListDragProvider>
  );
}

function LearnedRuleItem(props: { draft: RuleDraft }): React.JSX.Element {
  const { draft } = props;

  const { handleLearnedRuleTextChange, handleRemoveLearnedRule } = usePromptEngineActions();
  const rule = draft.parsed;

  return (
    <FormSection
      title={rule?.title ?? 'Invalid rule'}
      variant='subtle'
      className='p-4'
      actions={
        <div className='flex items-center gap-2'>
          <CopyButton value={draft.text} variant='ghost' size='icon' />
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleRemoveLearnedRule(draft.uid)}
          >
            Remove
          </Button>
        </div>
      }
    >
      <div className='space-y-3'>
        <Textarea
          className='min-h-[140px] font-mono text-[12px]'
          value={draft.text}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleLearnedRuleTextChange(draft.uid, event.target.value)
          }
          aria-label='Textarea'
          title='Textarea'
        />
        {draft.error ? (
          <Alert variant='error' className='text-xs'>
            {draft.error}
          </Alert>
        ) : null}
        {rule ? (
          <div className='flex flex-wrap gap-4 items-center pt-1'>
            <MetadataItem label='Severity' variant='minimal'>
              <StatusBadge
                status={formatSeverityLabel(rule.severity)}
                variant={severityToVariant(rule.severity)}
                size='sm'
              />
            </MetadataItem>
            <MetadataItem label='Enabled' value={rule.enabled ? 'Yes' : 'No'} variant='minimal' />
          </div>
        ) : null}
      </div>
    </FormSection>
  );
}

function LearnedRuleList(): React.JSX.Element {
  const { patternTab, exploderSubTab } = usePromptEngineConfig();
  const { filteredLearnedDrafts } = usePromptEngineData();
  const tabLabel =
    patternTab === 'core'
      ? 'Core'
      : exploderSubTab === 'image_studio_rules'
        ? 'Image Studio Rules'
        : exploderSubTab === 'case_resolver_rules'
          ? 'Case Resolver Rules'
          : 'Prompt Exploder Rules';

  return (
    <div className='space-y-4'>
      <Card variant='subtle' padding='md' className='bg-card/40'>
        <SectionHeader
          title={`${tabLabel} Learned Rules`}
          description='Auto-generated patterns from prompts for the selected list. Review and edit before saving.'
          size='xs'
        />
      </Card>

      {filteredLearnedDrafts.length === 0 ? (
        <CompactEmptyState
          title='No learned patterns'
          description='No patterns have been generated for this context yet.'
        />
      ) : null}

      {filteredLearnedDrafts.map((draft) => (
        <LearnedRuleItem key={draft.uid} draft={draft} />
      ))}

      <ClientOnly>
        <Card variant='subtle' padding='md' className='bg-card/40'>
          <Hint uppercase className='mb-1'>
            Tip
          </Hint>
          <Hint>Use the Image Studio prompt tools to suggest learned patterns automatically.</Hint>
        </Card>
      </ClientOnly>
    </div>
  );
}

function AdminPromptEngineValidationPatternsContent(): React.JSX.Element {
  const { promptEngineSettings, isUsingDefaults } = usePromptEngineConfig();
  const { saveError } = usePromptEngineData();

  return (
    <div className='space-y-4'>
      <PromptEngineToolbar />

      <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/40'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <StatusBadge
            status={
              promptEngineSettings.promptValidation.enabled
                ? 'Validator enabled'
                : 'Validator disabled'
            }
            variant={promptEngineSettings.promptValidation.enabled ? 'success' : 'warning'}
          />
          <MetadataItem
            label='Source'
            value={isUsingDefaults ? 'defaults' : 'saved settings'}
            variant='subtle'
          />
        </div>
      </Card>

      {saveError ? <Alert variant='error'>{saveError}</Alert> : null}

      <PromptEngineFilters />

      <div className={`${UI_GRID_RELAXED_CLASSNAME} lg:grid-cols-[minmax(0,1fr)_320px]`}>
        <RuleList />
        <LearnedRuleList />
      </div>
    </div>
  );
}

function AdminPromptEngineValidationPatternsProviders(): React.JSX.Element {
  return (
    <PromptEngineProvider>
      <AdminPromptEngineValidationPatternsContent />
    </PromptEngineProvider>
  );
}

export function AdminPromptEngineValidationPatternsPage({
  embedded,
  onSaved,
  eyebrow,
  backLinkHref,
  backLinkLabel,
  initialPatternTab,
  initialExploderSubTab,
  lockedPatternTab,
  lockedExploderSubTab,
  initialScope,
  lockedScope,
}: AdminPromptEngineValidationPatternsPageProps): React.JSX.Element {
  const pageContextValue = useMemo(
    () => ({
      ...(embedded !== undefined && { embedded }),
      ...(onSaved !== undefined && { onSaved }),
      ...(eyebrow !== undefined && { eyebrow }),
      ...(backLinkHref !== undefined && { backLinkHref }),
      ...(backLinkLabel !== undefined && { backLinkLabel }),
      ...(initialPatternTab !== undefined && { initialPatternTab }),
      ...(initialExploderSubTab !== undefined && { initialExploderSubTab }),
      ...(lockedPatternTab !== undefined && { lockedPatternTab }),
      ...(lockedExploderSubTab !== undefined && { lockedExploderSubTab }),
      ...(initialScope !== undefined && { initialScope }),
      ...(lockedScope !== undefined && { lockedScope }),
    }),
    [
      backLinkHref,
      backLinkLabel,
      embedded,
      eyebrow,
      initialExploderSubTab,
      initialPatternTab,
      initialScope,
      lockedExploderSubTab,
      lockedPatternTab,
      lockedScope,
      onSaved,
    ]
  );

  return (
    <PromptEngineValidationPageProvider value={pageContextValue}>
      <AdminPromptEngineValidationPatternsProviders />
    </PromptEngineValidationPageProvider>
  );
}
