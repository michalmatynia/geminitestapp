'use client';

import React, { useEffect, useState } from 'react';
import { Link2, Plus, RefreshCcw, Settings2, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { PromptExploderParserTuningRuleDraft } from '@/shared/contracts/prompt-exploder';
import type { PromptExploderRuleSegmentType } from '@/shared/contracts/prompt-engine';
import { internalError } from '@/shared/errors/app-error';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';
import { getPromptValidationObservabilitySnapshot } from '@/shared/lib/prompt-core/runtime-observability';
import { safeClearInterval, safeSetInterval } from '@/shared/lib/timers';
import {
  AdminAiEyebrow,
  Alert,
  Badge,
  Button,
  Card,
  CompactEmptyState,
  DocsTooltipEnhancer,
  EmptyState,
  FormField,
  FormSection,
  Hint,
  Input,
  Label,
  ListPanel,
  SectionHeader,
  SelectSimple,
  SimpleSettingsList,
  StatusToggle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ToggleRow,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import {
  DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES,
  EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES,
  PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET,
  type PromptExploderBenchmarkCaseReport,
} from '../benchmark';
import { PromptExploderLibraryTab } from '../components/PromptExploderLibraryTab';
import { SegmentDetailEditor } from '../components/segment-editor/SegmentDetailEditor';
import { PromptExploderSegmentsTreeEditor } from '../components/tree/PromptExploderSegmentsTreeEditor';
import { PromptExploderProvider } from '../context';
import {
  SettingsActionsContext,
  SettingsStateContext,
} from '../context/SettingsContext';
import { useBenchmarkActions, useBenchmarkState } from '../context/hooks/useBenchmark';
import { useBindingsActions, useBindingsState } from '../context/hooks/useBindings';
import { useDocumentActions, useDocumentState } from '../context/hooks/useDocument';
import { useLibraryActions, useLibraryState } from '../context/hooks/useLibrary';
import { useSettingsActions, useSettingsState } from '../context/hooks/useSettings';
import type { LearningDraft } from '../context/settings/SettingsDraftsContext';
import { PROMPT_EXPLODER_DOC_CATALOG } from '../docs/catalog';
import { promptExploderClampNumber, promptExploderFormatTimestamp } from '../helpers/formatting';
import { promptExploderFormatSubsectionLabel } from '../helpers/segment-helpers';
import { usePromptExploderDocsTooltips } from '../hooks/usePromptExploderDocsTooltips';
import { getPromptExploderRuntimePatternCacheSnapshot } from '../parser';
import type { PromptExploderLibraryItem } from '../prompt-library';
import type {
  PromptExploderBinding,
  PromptExploderBindingType,
  PromptExploderLearnedTemplate,
  PromptExploderSubsection,
} from '../types';
import {
  buildPromptExploderValidationRuleStackOptions,
  promptExploderValidationStackFromBridgeSource,
  promptExploderValidatorScopeFromStack,
} from '../validation-stack';

const PROMPT_EXPLODER_ACTIVE_TAB_KEY = 'prompt_exploder:active_tab';

const BINDING_TYPE_OPTIONS = [
  { value: 'depends_on', label: 'Depends On' },
  { value: 'references', label: 'References' },
  { value: 'uses_param', label: 'Uses Param' },
] as const satisfies ReadonlyArray<LabeledOptionDto<PromptExploderBindingType>>;

const RUNTIME_RULE_PROFILE_OPTIONS = [
  { value: 'all', label: 'All Rules' },
  { value: 'pattern_pack', label: 'Pattern Pack Only' },
  { value: 'learned_only', label: 'Learned Rules Only' },
] as const satisfies ReadonlyArray<
  LabeledOptionDto<'all' | 'pattern_pack' | 'learned_only'>
>;

const TEMPLATE_STATE_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
] as const satisfies ReadonlyArray<LabeledOptionDto<PromptExploderLearnedTemplate['state']>>;

const PARSER_TUNING_SEGMENT_TYPE_OPTIONS: Array<
  LabeledOptionDto<PromptExploderRuleSegmentType | 'none'>
> = [
  { value: 'none', label: 'No type hint' },
  { value: 'metadata', label: 'Metadata' },
  { value: 'assigned_text', label: 'Assigned Text' },
  { value: 'list', label: 'List' },
  { value: 'parameter_block', label: 'Parameter Block' },
  { value: 'referential_list', label: 'Referential List' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'hierarchical_list', label: 'Hierarchical List' },
  { value: 'conditional_list', label: 'Conditional List' },
  { value: 'qa_matrix', label: 'QA Matrix' },
];

type BenchmarkSuiteOption = 'default' | 'extended' | 'custom';

const BENCHMARK_SUITE_OPTIONS = [
  {
    value: 'default',
    label: 'Default',
  },
  {
    value: 'extended',
    label: 'Extended',
  },
  {
    value: 'custom',
    label: 'Custom (JSON)',
  },
] as const satisfies ReadonlyArray<LabeledOptionDto<BenchmarkSuiteOption>>;

const normalizeDocQuery = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const looksLikeCaseResolverPrompt = (value: string): boolean => {
  const text = value.trim();
  if (!text) return false;
  let score = 0;
  if (/(^|\n)\s*dotyczy\s*:/imu.test(text)) score += 2;
  if (/(^|\n)\s*uzasadnienie\b/imu.test(text)) score += 2;
  if (/(^|\n)\s*na\s+zakończenie\b/imu.test(text)) score += 1;
  if (/\b\d{2}-\d{3}\s+[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/u.test(text)) score += 1;
  if (
    /(^|\n)\s*[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][^\n]{1,50}\s+\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/u.test(text)
  ) {
    score += 1;
  }
  return score >= 3;
};

type PromptExploderErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

class PromptExploderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  PromptExploderErrorBoundaryState
> {
  override state: PromptExploderErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown): PromptExploderErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown Prompt Exploder error.',
    };
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className='space-y-3'>
        <Alert variant='error'>
          Prompt Exploder encountered a runtime error: {this.state.errorMessage ?? 'Unknown error'}
        </Alert>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
        >
          Reload Prompt Exploder
        </Button>
      </div>
    );
  }
}

function PromptExploderDocsTooltipSwitch({
  docsTooltipsEnabled,
  onDocsTooltipsChange,
}: {
  docsTooltipsEnabled: boolean;
  onDocsTooltipsChange: (enabled: boolean) => void;
}): React.JSX.Element {
  return (
    <ToggleRow
      id='prompt-exploder-docs-tooltips-toggle'
      label='Docs Tooltips'
      checked={docsTooltipsEnabled}
      onCheckedChange={(checked: boolean) => {
        onDocsTooltipsChange(checked);
      }}
      className='ml-1 border-border/60 bg-card/30 px-2 py-1'
      data-doc-id='docs_tooltips_toggle'
    />
  );
}

function PromptExploderHeaderBar({
  docsTooltipsEnabled,
  onDocsTooltipsChange,
}: {
  docsTooltipsEnabled: boolean;
  onDocsTooltipsChange: (enabled: boolean) => void;
}): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';
  const returnTarget = returnTo.startsWith('/admin/case-resolver')
    ? 'case-resolver'
    : 'image-studio';
  const { handleReloadFromStudio } = useDocumentActions();

  return (
    <SectionHeader
      eyebrow={<AdminAiEyebrow section='Prompt Exploder' />}
      title='Prompt Exploder'
      description='Explode prompts into typed segments, edit structure, and reassemble with references intact.'
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            size='xs'
            variant='outline'
            onClick={handleReloadFromStudio}
            data-doc-id='reload_incoming_draft'
          >
            <RefreshCcw className='mr-2 size-4' />
            Reload Incoming Draft
          </Button>
          <Button
            size='xs'
            variant='outline'
            onClick={() => {
              router.push('/admin/prompt-exploder/settings');
            }}
            data-doc-id='open_settings'
          >
            <Settings2 className='mr-2 size-4' />
            Settings
          </Button>
          <Button
            size='xs'
            variant='outline'
            onClick={() => {
              router.push(returnTo);
            }}
            data-doc-id='back_to_source'
          >
            {returnTarget === 'case-resolver' ? 'Back to Case Resolver' : 'Back to Image Studio'}
          </Button>
          <PromptExploderDocsTooltipSwitch
            docsTooltipsEnabled={docsTooltipsEnabled}
            onDocsTooltipsChange={onDocsTooltipsChange}
          />
        </div>
      }
    />
  );
}

function PromptExploderDocsTab(): React.JSX.Element {
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const normalizedQuery = normalizeDocQuery(query);
    if (!normalizedQuery) return PROMPT_EXPLODER_DOC_CATALOG;
    return PROMPT_EXPLODER_DOC_CATALOG.filter((doc) => {
      const haystack = normalizeDocQuery(
        `${doc.title} ${doc.summary} ${doc.section} ${doc.aliases.join(' ')} ${doc.id}`
      );
      return haystack.includes(normalizedQuery);
    });
  }, [query]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((doc) => {
      const current = map.get(doc.section) ?? [];
      current.push(doc);
      map.set(doc.section, current);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <FormSection
      title='Docs'
      description='Canonical Prompt Exploder documentation used by the tooltip system (source in /docs).'
      variant='subtle'
      className='p-4'
    >
      <div className='space-y-4'>
        <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]'>
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            aria-label='Search docs entries'
            placeholder='Search docs entries, actions, sections, aliases...'
           title='Search docs entries, actions, sections, aliases...'/>
          <div className='rounded border border-border/50 bg-card/20 px-3 py-2 text-xs text-gray-400'>
            Entries: <span className='text-gray-200'>{filtered.length}</span>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className='text-sm text-gray-500'>No docs entries matched this query.</div>
        ) : (
          <div className='space-y-4'>
            {grouped.map(([section, entries]) => (
              <div key={section} className='rounded border border-border/60 bg-card/20 p-3'>
                <Hint size='xs' uppercase className='mb-2 font-semibold text-gray-300'>
                  {section}
                </Hint>
                <div className='space-y-2'>
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className='rounded border border-border/50 bg-card/30 p-2 text-xs'
                    >
                      <div className='font-medium text-gray-100'>{entry.title}</div>
                      <div className='mt-1 text-gray-300'>{entry.summary}</div>
                      <div className='mt-1 text-[10px] text-gray-500'>
                        id: <span className='font-mono'>{entry.id}</span> · aliases:{' '}
                        <span className='font-mono'>{entry.aliases.join(', ')}</span>
                      </div>
                      <div className='mt-1 text-[10px] text-gray-500'>
                        docs: <span className='font-mono'>{entry.docPath}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormSection>
  );
}

function SourcePromptPanel(): React.JSX.Element {
  const { promptText, returnTarget } = useDocumentState();
  const { setPromptText, handleExplode, handleApplyToImageStudio } = useDocumentActions();
  const { captureSegmentationRecordOnApply } = useLibraryActions();
  const { runtimeGuardrailIssue, promptExploderSettings } = useSettingsState();
  const { toast } = useToast();
  const caseResolverExtractionModeLabel =
    promptExploderSettings.runtime.caseResolverExtractionMode === 'rules_with_heuristics'
      ? 'Rules + Heuristics'
      : 'Rules Only';

  const handleApply = async (): Promise<void> => {
    const captureResult = await captureSegmentationRecordOnApply();
    if (!captureResult.captured) {
      toast('Segmentation context capture skipped (missing prompt or document).', {
        variant: 'warning',
      });
    }
    await handleApplyToImageStudio();
  };

  return (
    <FormSection
      title='Source Prompt'
      description='Paste a prompt and explode it into structured segments.'
      variant='subtle'
      className='p-4'
      actions={
        <div className='flex items-center gap-2'>
          <Button type='button' onClick={handleExplode} disabled={Boolean(runtimeGuardrailIssue)}>
            Explode Prompt
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void handleApply();
            }}
          >
            {returnTarget === 'case-resolver' ? 'Apply to Case Resolver' : 'Apply to Image Studio'}
          </Button>
        </div>
      }
    >
      <div className='mt-3 space-y-2'>
        {runtimeGuardrailIssue ? (
          <Card variant='danger' padding='sm' className='border-rose-500/40 text-xs'>
            {runtimeGuardrailIssue}
          </Card>
        ) : null}
        {returnTarget === 'case-resolver' ? (
          <Card
            variant='info'
            padding='sm'
            className='border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-100'
          >
            Case Resolver extraction mode: {caseResolverExtractionModeLabel}
          </Card>
        ) : null}
        <Textarea
          className='min-h-[280px] font-mono text-[12px]'
          value={promptText}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setPromptText(event.target.value);
          }}
          aria-label='Source prompt'
          placeholder='Paste prompt text...'
         title='Paste prompt text...'/>
      </div>
    </FormSection>
  );
}

function ExplosionMetricsPanel(): React.JSX.Element {
  const { explosionMetrics } = useDocumentState();

  return (
    <FormSection
      title='Explosion Metrics'
      description='Observability metrics for current segmentation quality.'
      variant='subtle'
      className='p-4'
    >
      {!explosionMetrics ? (
        <div className='text-xs text-gray-500'>Run Prompt Exploder to generate metrics.</div>
      ) : (
        <div className='space-y-2 text-xs text-gray-300'>
          <div>
            Segments: {explosionMetrics.total} · avg confidence{' '}
            {(explosionMetrics.avgConfidence * 100).toFixed(1)}% · low confidence ({'<'}
            {explosionMetrics.lowConfidenceThreshold.toFixed(2)}):{' '}
            {explosionMetrics.lowConfidenceCount}
          </div>
          <div>Typed coverage: {(explosionMetrics.typedCoverage * 100).toFixed(1)}%</div>
          <div className='rounded border border-border/50 bg-card/20 p-2'>
            {Object.entries(explosionMetrics.typeCounts)
              .sort((left, right) => right[1] - left[1])
              .map(([type, count]) => (
                <div key={type}>
                  {type}: {count}
                </div>
              ))}
          </div>
        </div>
      )}
    </FormSection>
  );
}

function WarningsPanel(): React.JSX.Element {
  const { documentState } = useDocumentState();

  return (
    <FormSection
      title='Warnings'
      description='Quality checks from the exploder runtime.'
      variant='subtle'
      className='p-4'
    >
      {!documentState?.warnings || documentState.warnings.length === 0 ? (
        <div className='text-xs text-gray-500'>No warnings.</div>
      ) : (
        <Card variant='warning' padding='md' className='border-amber-500/20'>
          <ul className='list-disc pl-5 text-xs text-amber-200'>
            {documentState.warnings.map((warning: unknown) => (
              <li key={String(warning)}>{String(warning)}</li>
            ))}
          </ul>
        </Card>
      )}
    </FormSection>
  );
}

function PromptProjectsPanel(): React.JSX.Element {
  const { promptText, documentState } = useDocumentState();
  const { isBusy } = useSettingsState();
  const { selectedLibraryItemId, libraryNameDraft, promptLibraryItems, selectedLibraryItem } =
    useLibraryState();
  const {
    setLibraryNameDraft,
    handleNewLibraryEntry,
    handleSaveLibraryItem,
    handleLoadLibraryItem,
    handleDeleteLibraryItem,
  } = useLibraryActions();

  return (
    <FormSection
      title='Prompt Exploder Projects'
      description='Manage all Prompt Exploder projects and their saved explosions.'
      variant='subtle'
      className='p-4'
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void handleSaveLibraryItem();
            }}
            disabled={isBusy}
          >
            Save Project
          </Button>
          <Button type='button' variant='outline' onClick={handleNewLibraryEntry}>
            New Project
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              if (!selectedLibraryItemId) return;
              void handleDeleteLibraryItem(selectedLibraryItemId);
            }}
            disabled={!selectedLibraryItemId || isBusy}
          >
            Delete Project
          </Button>
        </div>
      }
    >
      <div className='grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]'>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Projects</Label>
          <div className='max-h-[280px] overflow-auto rounded border border-border/50 bg-card/20'>
            <SimpleSettingsList
              items={promptLibraryItems.map((item: PromptExploderLibraryItem) => ({
                id: item.id,
                title: item.name,
                description: item.prompt,
                subtitle: `segments ${item.document?.segments.length ?? 0} · updated ${promptExploderFormatTimestamp(item.updatedAt)}`,
                original: item,
              }))}
              selectedId={selectedLibraryItemId ?? undefined}
              onSelect={(item) => handleLoadLibraryItem(item.id)}
              emptyMessage='No projects saved yet.'
              padding='sm'
            />
          </div>
        </div>
        <div className='space-y-2'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Project Name</Label>
            <Input
              value={libraryNameDraft}
              onChange={(event) => {
                setLibraryNameDraft(event.target.value);
              }}
              aria-label='Project name'
              placeholder='Project name'
             title='Project name'/>
          </div>
          <div className='rounded border border-border/50 bg-card/20 p-2 text-xs text-gray-500'>
            <div>
              Active project:{' '}
              <span className='text-gray-300'>{selectedLibraryItem?.name ?? 'Unsaved draft'}</span>
            </div>
            <div>
              Prompt length: <span className='text-gray-300'>{promptText.length}</span>
            </div>
            <div>
              Saved segments:{' '}
              <span className='text-gray-300'>
                {selectedLibraryItem?.document?.segments.length ?? 0}
              </span>
            </div>
            <div>
              Current segments:{' '}
              <span className='text-gray-300'>{documentState?.segments.length ?? 0}</span>
            </div>
          </div>
          <div className='text-[11px] text-gray-500'>
            Save Project stores both prompt text and the current exploded document.
          </div>
        </div>
      </div>
    </FormSection>
  );
}

function SegmentEditorPanel(): React.JSX.Element {
  const { documentState } = useDocumentState();

  return (
    <FormSection
      title='Segments'
      description='Edit segment content and ordering before reassembly.'
      variant='subtle'
      className='p-4'
    >
      {!documentState?.segments?.length ? (
        <EmptyState
          title='No segments yet'
          description='Run Prompt Exploder to generate editable segments.'
        />
      ) : (
        <div className='mt-3 grid gap-3 lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]'>
          <PromptExploderSegmentsTreeEditor />
          <SegmentDetailEditor />
        </div>
      )}
    </FormSection>
  );
}

function BindingsPanel(): React.JSX.Element {
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
                  options={BINDING_TYPE_OPTIONS}
                 ariaLabel='Select option' title='Select option'/>
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
                 ariaLabel='Select option' title='Select option'/>
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
                 ariaLabel='Select option' title='Select option'/>
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
                 ariaLabel='Select option' title='Select option'/>
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
                 ariaLabel='Select option' title='Select option'/>
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
                 aria-label='Source label (optional)' title='Source label (optional)'/>
                <Input
                  value={bindingDraft.targetLabel}
                  onChange={(event) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      targetLabel: event.target.value,
                    }));
                  }}
                  placeholder='Target label (optional)'
                 aria-label='Target label (optional)' title='Target label (optional)'/>
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

function ReassembledPromptPanel(): React.JSX.Element {
  const { documentState, returnTarget } = useDocumentState();
  const { handleApplyToImageStudio } = useDocumentActions();
  const { captureSegmentationRecordOnApply } = useLibraryActions();
  const { toast } = useToast();

  const handleApply = async (): Promise<void> => {
    const captureResult = await captureSegmentationRecordOnApply();
    if (!captureResult.captured) {
      toast('Segmentation context capture skipped (missing prompt or document).', {
        variant: 'warning',
      });
    }
    await handleApplyToImageStudio();
  };

  return (
    <FormSection
      title='Reassembled Prompt'
      description='Preview final output after include/omit and reorder edits.'
      variant='subtle'
      className='p-4'
      actions={
        <Button
          type='button'
          variant='outline'
          onClick={(): void => {
            void handleApply();
          }}
        >
          {returnTarget === 'case-resolver' ? 'Apply to Case Resolver' : 'Apply to Image Studio'}
        </Button>
      }
    >
      <div className='mt-2'>
        <Textarea
          className='min-h-[420px] font-mono text-[11px]'
          value={documentState?.reassembledPrompt ?? ''}
          readOnly
          aria-label='Reassembled prompt'
         title='Textarea'/>
      </div>
    </FormSection>
  );
}

function PatternRuntimePanel(): React.JSX.Element {
  const [runtimeHealthTick, setRuntimeHealthTick] = React.useState(0);
  const { promptText } = useDocumentState();
  const {
    runtimeValidationRules,
    activeValidationRuleStack,
    validatorPatternLists,
    effectiveLearnedTemplates,
    runtimeLearnedTemplates,
    templateMergeThreshold,
    learningDraft,
    promptExploderSettings,
    runtimeGuardrailIssue,
    snapshotDraftName,
    selectedSnapshotId,
    availableSnapshots,
    selectedSnapshot,
    isBusy,
  } = useSettingsState();
  const {
    setLearningDraft,
    setSnapshotDraftName,
    setSelectedSnapshotId,
    handleSaveLearningSettings,
    handleCapturePatternSnapshot,
    handleRestorePatternSnapshot,
    handleDeletePatternSnapshot,
    handleTemplateStateChange,
    handleDeleteTemplate,
  } = useSettingsActions();
  const {
    benchmarkSuiteDraft,
    benchmarkLowConfidenceThresholdDraft,
    benchmarkSuggestionLimitDraft,
  } = useBenchmarkState();
  const snapshotOptions = React.useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      availableSnapshots.length > 0
        ? availableSnapshots.map((snapshot) => ({
          value: snapshot.id,
          label: `${snapshot.name} (${snapshot.ruleCount})`,
        }))
        : [{ value: '', label: 'No snapshots' }],
    [availableSnapshots]
  );

  React.useEffect(() => {
    const timer = safeSetInterval(() => {
      setRuntimeHealthTick((current) => current + 1);
    }, 4_000);
    return () => {
      safeClearInterval(timer);
    };
  }, []);

  const runtimeHealth = React.useMemo(() => {
    void runtimeHealthTick;
    const observability = getPromptValidationObservabilitySnapshot();
    const parserCache = getPromptExploderRuntimePatternCacheSnapshot();
    const cacheHits = observability.counters.runtime_cache_hit;
    const cacheMisses = observability.counters.runtime_cache_miss;
    const selectionTotal = observability.counters.runtime_selection_total;
    const totalErrors =
      observability.errors.scope_resolution +
      observability.errors.rule_compile +
      observability.errors.runtime_execution;
    const cacheHitRate = cacheHits + cacheMisses > 0 ? cacheHits / (cacheHits + cacheMisses) : 0;
    const errorRate = selectionTotal > 0 ? totalErrors / selectionTotal : 0;
    const toPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
    const pipelineP95 =
      observability.metrics.find((metric) => metric.name === 'runtime_pipeline_ms')?.p95Ms ?? 0;
    const explodeP95 =
      observability.metrics.find((metric) => metric.name === 'explode_ms')?.p95Ms ?? 0;
    const compileP95 =
      observability.metrics.find((metric) => metric.name === 'runtime_compile_ms')?.p95Ms ?? 0;

    return {
      status: observability.health.status,
      cacheHitRate: toPercent(cacheHitRate),
      errorRate: toPercent(errorRate),
      pipelineP95: pipelineP95.toFixed(1),
      explodeP95: explodeP95.toFixed(1),
      compileP95: compileP95.toFixed(1),
      selectionTotal,
      parserCacheEntries: parserCache.keyed,
      circuitOpenScopes: parserCache.circuitOpenScopes.length,
    };
  }, [runtimeHealthTick]);

  const runtimeStatusClass =
    runtimeHealth.status === 'ok'
      ? 'text-emerald-300'
      : runtimeHealth.status === 'degraded'
        ? 'text-amber-300'
        : 'text-rose-300';
  const validationStackOptions = React.useMemo(
    () => buildPromptExploderValidationRuleStackOptions(validatorPatternLists),
    [validatorPatternLists]
  );
  const activeStackLabel = React.useMemo(() => {
    const optionLabel = validationStackOptions.find(
      (option) => option.value === activeValidationRuleStack
    )?.label;
    if (optionLabel) return optionLabel;
    return activeValidationRuleStack;
  }, [activeValidationRuleStack, validationStackOptions]);
  const isCaseResolverStack = React.useMemo(
    () =>
      promptExploderValidatorScopeFromStack(activeValidationRuleStack, validatorPatternLists) ===
      'case-resolver-prompt-exploder',
    [activeValidationRuleStack, validatorPatternLists]
  );
  const caseResolverStack = React.useMemo(
    () => promptExploderValidationStackFromBridgeSource('case-resolver', validatorPatternLists),
    [validatorPatternLists]
  );
  const shouldSuggestCaseResolverStack = React.useMemo(
    () => looksLikeCaseResolverPrompt(promptText) && !isCaseResolverStack,
    [isCaseResolverStack, promptText]
  );

  return (
    <FormSection
      title='Pattern Runtime'
      description='Prompt Exploder uses Prompt Validator rules from the selected validation stack.'
      variant='subtle'
      className='p-4'
      actions={
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <Badge variant='neutral' className='border-border/60 bg-card/30 font-normal'>
            Rules <span className='ml-1 text-gray-100'>{runtimeValidationRules.length}</span>
          </Badge>
          <Badge variant='neutral' className='border-border/60 bg-card/30 font-normal'>
            Templates <span className='ml-1 text-gray-100'>{runtimeLearnedTemplates.length}</span>
          </Badge>
          <Badge variant='neutral' className='border-border/60 bg-card/30 font-normal'>
            Health <span className={cn('ml-1', runtimeStatusClass)}>{runtimeHealth.status}</span>
          </Badge>
        </div>
      }
    >
      {shouldSuggestCaseResolverStack ? (
        <Card
          variant='warning'
          padding='sm'
          className='mt-3 flex flex-col gap-2 border-amber-500/40 bg-amber-500/10 sm:flex-row sm:items-center sm:justify-between'
        >
          <div className='text-amber-100'>
            This prompt looks like a Case Resolver document, but the active stack is{' '}
            <span className='font-medium'>{activeStackLabel}</span>.
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='border-amber-400/60 text-amber-100 hover:bg-amber-500/20'
            onClick={() => {
              setLearningDraft((previous: LearningDraft) => ({
                ...previous,
                runtimeValidationRuleStack: caseResolverStack,
              }));
            }}
          >
            Switch to Case Resolver Stack
          </Button>
        </Card>
      ) : null}
      {runtimeGuardrailIssue ? (
        <Card variant='danger' padding='sm' className='mt-3 border-rose-500/40 text-xs'>
          {runtimeGuardrailIssue}
        </Card>
      ) : null}
      <div className='mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4'>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/20'>
          <Hint size='xxs' uppercase className='text-gray-500'>
            Validation Stack
          </Hint>
          <div className='mt-1 text-gray-100 break-words'>{activeStackLabel}</div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/20'>
          <Hint size='xxs' uppercase className='text-gray-500'>
            Runtime Profile
          </Hint>
          <div className='mt-1 text-gray-100'>{learningDraft.runtimeRuleProfile}</div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/20'>
          <Hint size='xxs' uppercase className='text-gray-500'>
            Learned Templates
          </Hint>
          <div className='mt-1 text-gray-100'>{effectiveLearnedTemplates.length}</div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/20'>
          <Hint size='xxs' uppercase className='text-gray-500'>
            Runtime Templates
          </Hint>
          <div className='mt-1 text-gray-100'>{runtimeLearnedTemplates.length}</div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/20'>
          <Hint size='xxs' uppercase className='text-gray-500'>
            Merge Threshold
          </Hint>
          <div className='mt-1 text-gray-100'>{templateMergeThreshold.toFixed(2)}</div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/20'>
          <Hint size='xxs' uppercase className='text-gray-500'>
            Benchmark Suite
          </Hint>
          <div className='mt-1 text-gray-100'>{String(benchmarkSuiteDraft)}</div>
        </Card>{' '}
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/20'>
          <Hint size='xxs' uppercase className='text-gray-500'>
            Low Confidence
          </Hint>
          <div className='mt-1 text-gray-100'>
            {promptExploderClampNumber(benchmarkLowConfidenceThresholdDraft, 0.3, 0.9).toFixed(2)}
          </div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/20'>
          <Hint size='xxs' uppercase className='text-gray-500'>
            Suggestion Cap
          </Hint>
          <div className='mt-1 text-gray-100'>
            {promptExploderClampNumber(Math.floor(benchmarkSuggestionLimitDraft), 1, 20)}
          </div>
        </Card>
        <Card
          variant='subtle-compact'
          padding='sm'
          className='border-border/60 bg-card/20 sm:col-span-2 xl:col-span-4'
        >
          <Hint size='xxs' uppercase className='text-gray-500'>
            Benchmark Template Upsert
          </Hint>
          <div className='mt-1 text-gray-100'>
            {learningDraft.benchmarkSuggestionUpsertTemplates ? 'on' : 'off'}
          </div>
        </Card>
        <Card
          variant='subtle-compact'
          padding='sm'
          className='border-border/60 bg-card/20 sm:col-span-2 xl:col-span-4'
        >
          <Hint size='xxs' uppercase className='text-gray-500'>
            Runtime Policy
          </Hint>
          <div className='mt-1 text-gray-100'>strict canonical stack resolution</div>
        </Card>
        <Card
          variant='subtle-compact'
          padding='sm'
          className='border-border/60 bg-card/20 sm:col-span-2 xl:col-span-4'
        >
          <Hint size='xxs' uppercase className='text-gray-500'>
            Case Resolver Extraction Mode
          </Hint>
          <div className='mt-1 text-gray-100'>
            {promptExploderSettings.runtime.caseResolverExtractionMode === 'rules_only'
              ? 'rules only (UI-defined capture rules)'
              : 'rules with heuristics enabled'}
          </div>
        </Card>
      </div>
      <div className='mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3'>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Validation Stack</Label>
          <SelectSimple
            size='sm'
            value={learningDraft.runtimeValidationRuleStack}
            onValueChange={(value: string) => {
              setLearningDraft((previous: LearningDraft) => ({
                ...previous,
                runtimeValidationRuleStack: value,
              }));
            }}
            options={validationStackOptions}
            ariaLabel='Validation stack'
           title='Select option'/>
        </div>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Runtime Rule Profile</Label>
          <SelectSimple
            size='sm'
            value={learningDraft.runtimeRuleProfile}
            onValueChange={(value: string) => {
              setLearningDraft((previous: LearningDraft) => ({
                ...previous,
                runtimeRuleProfile: value as 'all' | 'pattern_pack' | 'learned_only',
              }));
            }}
            options={RUNTIME_RULE_PROFILE_OPTIONS}
            ariaLabel='Runtime rule profile'
           title='Select option'/>
        </div>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Learning</Label>
          <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
            <StatusToggle
              enabled={learningDraft.enabled}
              onToggle={() => {
                setLearningDraft((previous: LearningDraft) => ({
                  ...previous,
                  enabled: !previous.enabled,
                }));
              }}
            />
          </div>
        </div>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Similarity Threshold</Label>
          <Input
            type='number'
            min={0.3}
            max={0.95}
            step={0.01}
            value={learningDraft.similarityThreshold.toFixed(2)}
            aria-label='Similarity threshold'
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous: LearningDraft) => ({
                ...previous,
                similarityThreshold: promptExploderClampNumber(value, 0.3, 0.95),
              }));
            }}
           title='Input field'/>
        </div>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Template Merge Threshold</Label>
          <Input
            type='number'
            min={0.3}
            max={0.95}
            step={0.01}
            value={learningDraft.templateMergeThreshold.toFixed(2)}
            aria-label='Template merge threshold'
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous: LearningDraft) => ({
                ...previous,
                templateMergeThreshold: promptExploderClampNumber(value, 0.3, 0.95),
              }));
            }}
           title='Input field'/>
        </div>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Min Approvals For Match</Label>
          <Input
            type='number'
            min={1}
            max={20}
            step={1}
            value={String(learningDraft.minApprovalsForMatching)}
            aria-label='Minimum approvals for match'
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous: LearningDraft) => ({
                ...previous,
                minApprovalsForMatching: promptExploderClampNumber(Math.floor(value), 1, 20),
              }));
            }}
           title='Input field'/>
        </div>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Runtime Template Cap</Label>
          <Input
            type='number'
            min={50}
            max={5000}
            step={10}
            value={String(learningDraft.maxTemplates)}
            aria-label='Runtime template cap'
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous: LearningDraft) => ({
                ...previous,
                maxTemplates: promptExploderClampNumber(Math.floor(value), 50, 5000),
              }));
            }}
           title='Input field'/>
        </div>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Auto Activate Learned</Label>
          <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
            <StatusToggle
              enabled={learningDraft.autoActivateLearnedTemplates}
              onToggle={() => {
                setLearningDraft((previous: LearningDraft) => ({
                  ...previous,
                  autoActivateLearnedTemplates: !previous.autoActivateLearnedTemplates,
                }));
              }}
            />
          </div>
        </div>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Benchmark Template Upsert</Label>
          <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
            <StatusToggle
              enabled={learningDraft.benchmarkSuggestionUpsertTemplates}
              onToggle={() => {
                setLearningDraft((previous: LearningDraft) => ({
                  ...previous,
                  benchmarkSuggestionUpsertTemplates: !previous.benchmarkSuggestionUpsertTemplates,
                }));
              }}
            />
          </div>
        </div>
      </div>
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            void handleSaveLearningSettings();
          }}
          disabled={isBusy}
        >
          Save Learning Settings
        </Button>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='neutral' className='border-border/60 bg-card/20 font-normal'>
            Similarity {learningDraft.similarityThreshold.toFixed(2)}
          </Badge>
          <Badge variant='neutral' className='border-border/60 bg-card/20 font-normal'>
            Merge {learningDraft.templateMergeThreshold.toFixed(2)}
          </Badge>
          <Badge variant='neutral' className='border-border/60 bg-card/20 font-normal'>
            Min approvals {learningDraft.minApprovalsForMatching}
          </Badge>
          <Badge variant='neutral' className='border-border/60 bg-card/20 font-normal'>
            Template cap {learningDraft.maxTemplates}
          </Badge>
          <Badge variant='neutral' className='border-border/60 bg-card/20 font-normal'>
            Auto activate {learningDraft.autoActivateLearnedTemplates ? 'on' : 'off'}
          </Badge>
          <Badge variant='neutral' className='border-border/60 bg-card/20 font-normal'>
            Bench upsert {learningDraft.benchmarkSuggestionUpsertTemplates ? 'on' : 'off'}
          </Badge>
          <Badge variant='neutral' className='border-border/60 bg-card/20 font-normal'>
            Suite {String(benchmarkSuiteDraft)}
          </Badge>
        </div>
      </div>
      <Card
        variant='subtle-compact'
        padding='sm'
        className='mt-3 border-border/60 bg-card/20 text-xs text-gray-300'
      >
        <Hint size='xxs' uppercase className='mb-2 text-gray-400'>
          Runtime Health
        </Hint>
        <div className='grid gap-2 md:grid-cols-4'>
          <div>
            <div className='text-[10px] text-gray-500'>Pipeline p95 (ms)</div>
            <div>{runtimeHealth.pipelineP95}</div>
          </div>
          <div>
            <div className='text-[10px] text-gray-500'>Explode p95 (ms)</div>
            <div>{runtimeHealth.explodeP95}</div>
          </div>
          <div>
            <div className='text-[10px] text-gray-500'>Compile p95 (ms)</div>
            <div>{runtimeHealth.compileP95}</div>
          </div>
          <div>
            <div className='text-[10px] text-gray-500'>Selections</div>
            <div>{runtimeHealth.selectionTotal}</div>
          </div>
          <div>
            <div className='text-[10px] text-gray-500'>Cache Hit Rate</div>
            <div>{runtimeHealth.cacheHitRate}</div>
          </div>
          <div>
            <div className='text-[10px] text-gray-500'>Error Rate</div>
            <div>{runtimeHealth.errorRate}</div>
          </div>
          <div>
            <div className='text-[10px] text-gray-500'>Parser Cache</div>
            <div>
              {runtimeHealth.parserCacheEntries}
              {runtimeHealth.circuitOpenScopes > 0
                ? ` · circuit:${runtimeHealth.circuitOpenScopes}`
                : ''}
            </div>
          </div>
        </div>
      </Card>
      <Card variant='subtle-compact' padding='sm' className='mt-4 border-border/60 bg-card/20'>
        <Hint size='xxs' uppercase className='mb-2 text-gray-400'>
          Pattern Snapshot Governance
        </Hint>
        <div className='grid gap-2 md:grid-cols-4'>
          <Input
            className='md:col-span-2'
            value={snapshotDraftName}
            aria-label='Snapshot name'
            onChange={(event) => setSnapshotDraftName(event.target.value)}
            placeholder='Snapshot name (optional)'
           title='Snapshot name (optional)'/>
          <SelectSimple
            size='sm'
            value={selectedSnapshotId}
            onValueChange={setSelectedSnapshotId}
            options={snapshotOptions}
            ariaLabel='Snapshot selection'
           title='Select option'/>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                void handleCapturePatternSnapshot();
              }}
              disabled={isBusy}
            >
              Capture
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                void handleRestorePatternSnapshot();
              }}
              disabled={isBusy || !selectedSnapshot}
            >
              Restore
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                void handleDeletePatternSnapshot();
              }}
              disabled={isBusy || !selectedSnapshot}
            >
              Delete
            </Button>
          </div>
        </div>
        {selectedSnapshot ? (
          <div className='mt-2 text-xs text-gray-500'>
            Selected snapshot: {selectedSnapshot.name} · created {selectedSnapshot.createdAt} ·
            rules {selectedSnapshot.ruleCount}
          </div>
        ) : (
          <div className='mt-2 text-xs text-gray-500'>No snapshot selected.</div>
        )}
      </Card>
      <Card variant='subtle-compact' padding='sm' className='mt-4 border-border/60 bg-card/20'>
        <Hint size='xxs' uppercase className='mb-2 text-gray-400'>
          Learned Template Lifecycle
        </Hint>
        {effectiveLearnedTemplates.length === 0 ? (
          <CompactEmptyState
            title='No learned templates'
            description='Templates will appear here as they are discovered from your prompts.'
            className='border-none bg-transparent py-4'
           />
        ) : (
          <div className='max-h-[220px] space-y-2 overflow-auto'>
            {effectiveLearnedTemplates.slice(0, 20).map((template) => (
              <Card
                key={template.id}
                variant='subtle-compact'
                padding='sm'
                className='border-border/50 bg-card/30'
              >
                <div className='flex items-center justify-between gap-2'>
                  <div className='truncate text-xs text-gray-200'>{template.title}</div>
                  <div className='text-[10px] text-gray-500'>
                    {template.segmentType} · approvals{' '}
                    {typeof template.approvals === 'number' ? template.approvals : 0}
                  </div>
                </div>
                <div className='mt-1 flex items-center justify-between gap-2'>
                  <SelectSimple
                    size='sm'
                    value={(template.state as string) || 'candidate'}
                    onValueChange={(value: string) => {
                      void handleTemplateStateChange(
                        template.id,
                        value as PromptExploderLearnedTemplate['state']
                      );
                    }}
                    options={TEMPLATE_STATE_OPTIONS}
                    ariaLabel='Template state'
                   title='Select option'/>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      void handleDeleteTemplate(template.id);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </FormSection>
  );
}

type PromptExploderParserTuningContextValue = {
  drafts: PromptExploderParserTuningRuleDraft[];
  onPatchDraft: (
    ruleId: PromptExploderParserTuningRuleDraft['id'],
    patch: Partial<PromptExploderParserTuningRuleDraft>
  ) => void;
  onSave: () => void;
  onResetToPackDefaults: () => void;
  onOpenValidationPatterns: () => void;
  isBusy: boolean;
};

const PromptExploderParserTuningContext =
  React.createContext<PromptExploderParserTuningContextValue | null>(null);

function PromptExploderParserTuningProvider({
  value,
  children,
}: {
  value?: PromptExploderParserTuningContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const settingsState = React.useContext(SettingsStateContext);
  const settingsActions = React.useContext(SettingsActionsContext);

  const resolvedValue = React.useMemo<PromptExploderParserTuningContextValue>(() => {
    if (value) return value;

    if (!settingsState || !settingsActions) {
      throw internalError(
        'PromptExploderParserTuningProvider requires either an explicit value prop or SettingsProvider context.'
      );
    }

    return {
      drafts: settingsState.parserTuningDrafts,
      onPatchDraft: settingsActions.patchParserTuningDraft,
      onSave: () => {
        void settingsActions.handleSaveParserTuningRules();
      },
      onResetToPackDefaults: settingsActions.handleResetParserTuningDrafts,
      onOpenValidationPatterns: () => {
        const validatorScope = promptExploderValidatorScopeFromStack(
          settingsState.activeValidationRuleStack,
          settingsState.validatorPatternLists
        );
        router.push(`/admin/validator?scope=${validatorScope}`);
      },
      isBusy: settingsState.isBusy,
    };
  }, [router, settingsActions, settingsState, value]);

  return (
    <PromptExploderParserTuningContext.Provider value={resolvedValue}>
      {children}
    </PromptExploderParserTuningContext.Provider>
  );
}

function usePromptExploderParserTuningContext(): PromptExploderParserTuningContextValue {
  const context = React.useContext(PromptExploderParserTuningContext);
  if (!context) {
    throw internalError(
      'usePromptExploderParserTuningContext must be used inside PromptExploderParserTuningProvider'
    );
  }
  return context;
}

function PromptExploderParserTuningPanel(): React.JSX.Element {
  const { drafts, onPatchDraft, onSave, onResetToPackDefaults, onOpenValidationPatterns, isBusy } =
    usePromptExploderParserTuningContext();

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button type='button' variant='outline' onClick={onSave} disabled={isBusy}>
          Save Parser Tuning
        </Button>
        <Button type='button' variant='outline' onClick={onResetToPackDefaults} disabled={isBusy}>
          Reset To Pack Defaults
        </Button>
        <Button type='button' variant='outline' onClick={onOpenValidationPatterns}>
          Open Validation Patterns
        </Button>
      </div>

      <div className='max-h-[520px] space-y-2 overflow-auto rounded border border-border/50 bg-card/20 p-2'>
        {drafts.map((draft) => (
          <div key={draft.id} className='space-y-2 rounded border border-border/50 bg-card/30 p-2'>
            <div className='flex items-center justify-between gap-2'>
              <div>
                <Label className='text-xs font-medium text-gray-200'>{draft.label}</Label>
                <div className='font-mono text-[10px] text-gray-500'>{draft.id}</div>
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-[10px] text-gray-500'>Enabled</Label>
                <StatusToggle
                  enabled={draft.enabled}
                  onToggle={() => {
                    onPatchDraft(draft.id, {
                      enabled: !draft.enabled,
                    });
                  }}
                />
              </div>
            </div>

            <div className='grid gap-2 md:grid-cols-2'>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Title</Label>
                <Input
                  value={draft.title}
                  aria-label='Title'
                  onChange={(event) => {
                    onPatchDraft(draft.id, {
                      title: event.target.value,
                    });
                  }}
                 title='Input field'/>
              </div>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Type Hint</Label>
                <SelectSimple
                  size='sm'
                  value={draft.promptExploderSegmentType ?? 'none'}
                  onValueChange={(value: string) => {
                    onPatchDraft(draft.id, {
                      promptExploderSegmentType:
                        value === 'none' ? null : (value as PromptExploderRuleSegmentType),
                    });
                  }}
                  options={PARSER_TUNING_SEGMENT_TYPE_OPTIONS}
                  ariaLabel='Type hint'
                 title='Select option'/>
              </div>
            </div>

            <div className='space-y-1'>
              <Label className='text-[10px] text-gray-500'>Description</Label>
              <Textarea
                className='min-h-[64px] text-[11px]'
                value={draft.description ?? ''}
                aria-label='Description'
                onChange={(event) => {
                  onPatchDraft(draft.id, {
                    description: event.target.value.trim() || null,
                  });
                }}
               title='Textarea'/>
            </div>

            <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_120px]'>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Pattern</Label>
                <Textarea
                  className='min-h-[72px] font-mono text-[11px]'
                  value={draft.pattern}
                  aria-label='Pattern'
                  onChange={(event) => {
                    onPatchDraft(draft.id, {
                      pattern: event.target.value,
                    });
                  }}
                 title='Textarea'/>
              </div>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Flags</Label>
                <Input
                  className='font-mono text-[11px]'
                  value={draft.flags}
                  aria-label='Flags'
                  onChange={(event) => {
                    onPatchDraft(draft.id, {
                      flags: event.target.value,
                    });
                  }}
                 title='Input field'/>
              </div>
            </div>

            <div className='grid gap-2 md:grid-cols-3'>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Priority</Label>
                <Input
                  type='number'
                  min={-50}
                  max={50}
                  step={1}
                  value={String(draft.promptExploderPriority)}
                  aria-label='Priority'
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) return;
                    onPatchDraft(draft.id, {
                      promptExploderPriority: Math.min(50, Math.max(-50, Math.floor(value))),
                    });
                  }}
                 title='Input field'/>
              </div>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Confidence Boost</Label>
                <Input
                  type='number'
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={draft.promptExploderConfidenceBoost.toFixed(2)}
                  aria-label='Confidence boost'
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) return;
                    onPatchDraft(draft.id, {
                      promptExploderConfidenceBoost: Math.min(0.5, Math.max(0, value)),
                    });
                  }}
                 title='Input field'/>
              </div>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Treat As Heading</Label>
                <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
                  <StatusToggle
                    enabled={draft.promptExploderTreatAsHeading}
                    onToggle={() => {
                      onPatchDraft(draft.id, {
                        promptExploderTreatAsHeading: !draft.promptExploderTreatAsHeading,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParserTuningSection(): React.JSX.Element {
  const { isParserTuningOpen } = useSettingsState();
  const { setIsParserTuningOpen } = useSettingsActions();

  return (
    <FormSection
      title='Parser Tuning'
      description='Quick-edit boundary and subsection parser rules directly from Prompt Exploder (stored as Validation Patterns).'
      variant='subtle'
      className='p-4'
      actions={
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            setIsParserTuningOpen((previous) => !previous);
          }}
        >
          {isParserTuningOpen ? 'Collapse' : 'Expand'}
        </Button>
      }
    >
      {isParserTuningOpen ? (
        <PromptExploderParserTuningProvider>
          <PromptExploderParserTuningPanel />
        </PromptExploderParserTuningProvider>
      ) : (
        <div className='text-xs text-gray-500'>Parser tuning is collapsed.</div>
      )}
    </FormSection>
  );
}

function BenchmarkReportPanel(): React.JSX.Element {
  const { isBusy } = useSettingsState();
  const {
    benchmarkReport,
    benchmarkSuiteDraft,
    benchmarkLowConfidenceThresholdDraft,
    benchmarkSuggestionLimitDraft,
    customBenchmarkCasesDraft,
    customCaseDraftId,
    dismissedBenchmarkSuggestionIds,
    benchmarkSuggestions,
    visibleBenchmarkSuggestions,
    parsedCustomBenchmarkCases,
  } = useBenchmarkState();
  const isCustomCasesValid = parsedCustomBenchmarkCases.ok;
  const customCasesMessage = parsedCustomBenchmarkCases.ok
    ? `Valid custom suite: ${parsedCustomBenchmarkCases.cases.length} case(s).`
    : `Invalid custom suite: ${parsedCustomBenchmarkCases.error}`;
  const {
    setBenchmarkSuiteDraft,
    setBenchmarkLowConfidenceThresholdDraft,
    setBenchmarkSuggestionLimitDraft,
    setCustomBenchmarkCasesDraft,
    setCustomCaseDraftId,
    handleRunBenchmark,
    handleAddCurrentPromptAsCustomBenchmarkCase,
    handleClearCustomBenchmarkCases,
    handleLoadCustomBenchmarkTemplate,
    handleAppendBenchmarkTemplateToCustom,
    handleAddBenchmarkSuggestionRules,
    handleAddBenchmarkSuggestionRule,
    handleDismissBenchmarkSuggestion,
    handleDismissAllVisibleBenchmarkSuggestions,
    handleResetDismissedBenchmarkSuggestions,
  } = useBenchmarkActions();

  const suiteOptionsWithCounts = React.useMemo(() => {
    return BENCHMARK_SUITE_OPTIONS.map((option) => {
      if (option.value === 'default') {
        return {
          ...option,
          label: `Default (${DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES.length} cases)`,
        };
      }
      if (option.value === 'extended') {
        return {
          ...option,
          label: `Extended (${EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES.length} cases)`,
        };
      }
      return option;
    });
  }, []);

  return (
    <FormSection
      title='Benchmark Report'
      description='Per-case precision/recall benchmark using current runtime profile and learning settings.'
      variant='subtle'
      className='p-4'
      actions={
        <Button type='button' variant='outline' onClick={handleRunBenchmark}>
          Run Benchmark
        </Button>
      }
    >
      <div className='space-y-3'>
        <div className='grid gap-2 md:grid-cols-5'>
          <FormField label='Benchmark Suite' id='benchmark-suite'>
            <SelectSimple
              size='sm'
              value={benchmarkSuiteDraft}
              onValueChange={(value: string) => {
                setBenchmarkSuiteDraft(value as 'default' | 'extended' | 'custom');
              }}
              options={suiteOptionsWithCounts}
             ariaLabel='Benchmark Suite' title='Benchmark Suite'/>
          </FormField>
          <FormField label='Low-Confidence Threshold' id='low-confidence-threshold'>
            <Input
              id='low-confidence-threshold'
              type='number'
              min={0.3}
              max={0.9}
              step={0.01}
              value={promptExploderClampNumber(
                benchmarkLowConfidenceThresholdDraft,
                0.3,
                0.9
              ).toFixed(2)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setBenchmarkLowConfidenceThresholdDraft(promptExploderClampNumber(value, 0.3, 0.9));
              }}
             aria-label='Low-Confidence Threshold' title='Low-Confidence Threshold'/>
          </FormField>
          <FormField label='Suggestion Limit / Case' id='suggestion-limit'>
            <Input
              id='suggestion-limit'
              type='number'
              min={1}
              max={20}
              step={1}
              value={String(
                promptExploderClampNumber(Math.floor(benchmarkSuggestionLimitDraft), 1, 20)
              )}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setBenchmarkSuggestionLimitDraft(
                  promptExploderClampNumber(Math.floor(value), 1, 20)
                );
              }}
             aria-label='Suggestion Limit / Case' title='Suggestion Limit / Case'/>
          </FormField>
          <div className='md:col-span-2 rounded border border-border/50 bg-card/20 p-2 text-[11px] text-gray-500'>
            Suite controls benchmark depth only. Runtime rules/templates still follow the selected
            Prompt Exploder runtime profile.
          </div>
        </div>
        {benchmarkSuiteDraft === 'custom' ? (
          <FormField label='Custom Benchmark Cases JSON' id='custom-benchmark-cases'>
            <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto]'>
              <Input
                value={customCaseDraftId}
                onChange={(event) => setCustomCaseDraftId(event.target.value)}
                placeholder='Custom case id (optional override)'
               aria-label='Custom case id (optional override)' title='Custom case id (optional override)'/>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleAddCurrentPromptAsCustomBenchmarkCase}
              >
                Add Current Prompt
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  handleLoadCustomBenchmarkTemplate('default');
                }}
              >
                Use Default
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  handleLoadCustomBenchmarkTemplate('extended');
                }}
              >
                Use Extended
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  handleAppendBenchmarkTemplateToCustom('extended');
                }}
              >
                Append Extended
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleClearCustomBenchmarkCases}
              >
                Clear
              </Button>
            </div>
            <Textarea
              id='custom-benchmark-cases'
              className='mt-2 min-h-[180px] font-mono text-[11px]'
              value={customBenchmarkCasesDraft}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                setCustomBenchmarkCasesDraft(event.target.value);
              }}
              placeholder='[{\"id\":\"case_1\",\"prompt\":\"...\",\"expectedTypes\":[\"sequence\"],\"minSegments\":1}]'
              aria-label='[{\"id\":\"case_1\",\"prompt\":\"...\",\"expectedTypes\":[\"sequence\"],\"minSegments\":1}]'
              title='[{\"id\":\"case_1\",\"prompt\":\"...\",\"expectedTypes\":[\"sequence\"],\"minSegments\":1}]'
            />
            <div
              className={`mt-1 text-[10px] ${isCustomCasesValid ? 'text-gray-500' : 'text-red-300'}`}
            >
              {customCasesMessage}
            </div>
          </FormField>
        ) : null}
        {!benchmarkReport ? (
          <div className='text-xs text-gray-500'>Run benchmark to generate a report.</div>
        ) : (
          <div className='space-y-2 text-xs text-gray-300'>
            <div>Generated: {benchmarkReport.generatedAt}</div>
            <div>
              Suite: {benchmarkReport.suite} · cases: {benchmarkReport.aggregate.caseCount} ·
              expected-type recall {(benchmarkReport.aggregate.expectedTypeRecall * 100).toFixed(1)}
              % · macro F1 {(benchmarkReport.aggregate.macroF1 * 100).toFixed(1)}% · min-segment
              pass {(benchmarkReport.aggregate.minSegmentPassRate * 100).toFixed(1)}%
            </div>
            <div>
              Low-confidence threshold: {benchmarkReport.config.lowConfidenceThreshold.toFixed(2)} ·
              suggestion cap/case: {benchmarkReport.config.suggestionLimit}
            </div>
            <div>
              Low-confidence segments: {benchmarkReport.aggregate.totalLowConfidenceSegments} ·
              suggestions: {benchmarkReport.aggregate.totalLowConfidenceSuggestions}
            </div>
            <div>
              Gate ({(PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET * 100).toFixed(0)}% recall):{' '}
              <span
                className={
                  benchmarkReport.aggregate.expectedTypeRecall >=
                  PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET
                    ? 'text-emerald-300'
                    : 'text-amber-300'
                }
              >
                {benchmarkReport.aggregate.expectedTypeRecall >=
                PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET
                  ? 'PASS'
                  : 'FAIL'}
              </span>
            </div>
            <div className='max-h-[240px] space-y-2 overflow-auto rounded border border-border/50 bg-card/20 p-2'>
              {benchmarkReport.cases.map((caseReport: PromptExploderBenchmarkCaseReport) => (
                <div key={caseReport.id} className='rounded border border-border/50 bg-card/30 p-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-medium text-gray-200'>{caseReport.id}</span>
                    <span className='text-[10px] text-gray-500'>
                      segments {caseReport.segmentCount}/{caseReport.minSegments}
                    </span>
                  </div>
                  <div className='mt-1'>
                    precision {(caseReport.precision * 100).toFixed(1)}% · recall{' '}
                    {(caseReport.recall * 100).toFixed(1)}% · f1 {(caseReport.f1 * 100).toFixed(1)}%
                  </div>
                  <div className='mt-1 text-[10px] text-gray-500'>
                    missing: {caseReport.missingTypes.join(', ') || 'none'} · unexpected:{' '}
                    {caseReport.unexpectedTypes.join(', ') || 'none'} · low confidence:{' '}
                    {caseReport.lowConfidenceSegments}
                  </div>
                </div>
              ))}
            </div>
            <div className='rounded border border-border/50 bg-card/20 p-4'>
              <SectionHeader
                title='Suggested Patterns From Low-Confidence Segments'
                size='xxs'
                className='mb-3'
                actions={
                  <div className='flex items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        void handleAddBenchmarkSuggestionRules(visibleBenchmarkSuggestions);
                      }}
                      disabled={isBusy || visibleBenchmarkSuggestions.length === 0}
                    >
                      Add All Visible
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={handleDismissAllVisibleBenchmarkSuggestions}
                      disabled={visibleBenchmarkSuggestions.length === 0}
                    >
                      Dismiss Visible
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={handleResetDismissedBenchmarkSuggestions}
                      disabled={dismissedBenchmarkSuggestionIds.length === 0}
                    >
                      Reset Dismissed
                    </Button>
                  </div>
                }
              />
              <div className='mb-2 text-[10px] text-gray-500'>
                visible {visibleBenchmarkSuggestions.length} / total {benchmarkSuggestions.length} ·
                dismissed {dismissedBenchmarkSuggestionIds.length}
              </div>
              {visibleBenchmarkSuggestions.length === 0 ? (
                <div className='text-[11px] text-gray-500'>No visible suggestions in this run.</div>
              ) : (
                <div className='max-h-[240px] space-y-2 overflow-auto'>
                  {visibleBenchmarkSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className='rounded border border-border/50 bg-card/30 p-2'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div className='truncate text-[11px] text-gray-200'>
                          [{suggestion.caseId}] {suggestion.segmentTitle}
                        </div>
                        <div className='text-[10px] text-gray-500'>
                          {((suggestion.confidence || 0) * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className='mt-1 text-[10px] text-gray-500'>
                        type: {suggestion.segmentType} · matched:{' '}
                        {(suggestion.matchedPatternIds || []).join(', ') || 'none'}
                      </div>{' '}
                      <div className='mt-1 rounded border border-border/50 bg-card/20 px-2 py-1 font-mono text-[10px] text-gray-300'>
                        {suggestion.suggestedRulePattern}
                      </div>
                      <div className='mt-2 flex items-center justify-between gap-2'>
                        <div className='line-clamp-2 text-[10px] text-gray-500'>
                          {suggestion.sampleText || 'No sample text.'}
                        </div>
                        <div className='flex items-center gap-2'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              void handleAddBenchmarkSuggestionRule(suggestion);
                            }}
                            disabled={isBusy}
                          >
                            Add Suggested Rule
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              handleDismissBenchmarkSuggestion(suggestion.id ?? '');
                            }}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </FormSection>
  );
}

export default function AdminPromptExploderPage(): React.JSX.Element {
  const { docsTooltipsEnabled, setDocsTooltipsEnabled } = usePromptExploderDocsTooltips();
  const [activeTab, setActiveTab] = useState<'workspace' | 'library' | 'docs'>('workspace');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const storedTab = window.localStorage.getItem(PROMPT_EXPLODER_ACTIVE_TAB_KEY);
    if (storedTab === 'library') {
      setActiveTab('library');
      return;
    }
    if (storedTab === 'docs') setActiveTab('docs');
  }, [mounted]);

  const handleTabChange = (value: string): void => {
    const nextTab = value === 'docs' ? 'docs' : value === 'library' ? 'library' : 'workspace';
    setActiveTab(nextTab);
    window.localStorage.setItem(PROMPT_EXPLODER_ACTIVE_TAB_KEY, nextTab);
  };

  if (!mounted) {
    return (
      <ListPanel
        header={
          <div className='space-y-1'>
            <h1 className='text-lg font-semibold text-white'>Prompt Exploder</h1>
            <p className='text-sm text-gray-400'>Loading workspace…</p>
          </div>
        }
      >
        <div className='grid grid-cols-1 gap-4 xl:grid-cols-[minmax(380px,0.85fr)_minmax(640px,1.15fr)]'>
          <div className='space-y-4'>
            <div className='h-40 rounded border border-border/60 bg-card/20' />
            <div className='h-24 rounded border border-border/60 bg-card/20' />
            <div className='h-24 rounded border border-border/60 bg-card/20' />
          </div>
          <div className='space-y-4'>
            <div className='h-56 rounded border border-border/60 bg-card/20' />
            <div className='h-24 rounded border border-border/60 bg-card/20' />
            <div className='h-40 rounded border border-border/60 bg-card/20' />
          </div>
        </div>
      </ListPanel>
    );
  }

  return (
    <PromptExploderErrorBoundary>
      <PromptExploderProvider>
        <div id='prompt-exploder-docs-root' className='flex h-full flex-col min-h-0'>
          <ListPanel
            className='flex flex-1 flex-col min-h-0'
            contentClassName='flex-1 min-h-0'
            header={
              <PromptExploderHeaderBar
                docsTooltipsEnabled={docsTooltipsEnabled}
                onDocsTooltipsChange={setDocsTooltipsEnabled}
              />
            }
          >
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className='flex flex-1 flex-col min-h-0 w-full space-y-4'
            >
              <TabsList
                className='grid h-auto w-full grid-cols-3 gap-2 border border-border/60 bg-card/30 p-2'
                aria-label='Prompt exploder tabs'
              >
                <TabsTrigger value='workspace' className='h-10'>
                  Workspace
                </TabsTrigger>
                <TabsTrigger value='library' className='h-10'>
                  Library
                </TabsTrigger>
                <TabsTrigger value='docs' className='h-10'>
                  Docs
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value='workspace'
                className='flex-1 min-h-0 overflow-y-auto space-y-4 pb-4'
              >
                <div className='grid grid-cols-1 gap-4 xl:grid-cols-[minmax(380px,0.85fr)_minmax(640px,1.15fr)]'>
                  <div className='space-y-4'>
                    <SourcePromptPanel />
                    <ExplosionMetricsPanel />
                    <WarningsPanel />
                    <PromptProjectsPanel />
                  </div>
                  <div className='space-y-4'>
                    <SegmentEditorPanel />
                    <BindingsPanel />
                    <ReassembledPromptPanel />
                  </div>
                </div>

                <PatternRuntimePanel />
                <ParserTuningSection />
                <BenchmarkReportPanel />
              </TabsContent>

              <TabsContent
                value='library'
                className='flex-1 min-h-0 overflow-y-auto space-y-4 pb-4'
              >
                <PromptExploderLibraryTab />
              </TabsContent>

              <TabsContent value='docs' className='flex-1 min-h-0 overflow-y-auto'>
                <PromptExploderDocsTab />
              </TabsContent>
            </Tabs>
          </ListPanel>
        </div>
        <DocsTooltipEnhancer
          rootId='prompt-exploder-docs-root'
          enabled={docsTooltipsEnabled}
          moduleId={DOCUMENTATION_MODULE_IDS.promptExploder}
          fallbackDocId='workflow_overview'
        />
      </PromptExploderProvider>
    </PromptExploderErrorBoundary>
  );
}
