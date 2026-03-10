'use client';

import React from 'react';

import { getPromptValidationObservabilitySnapshot } from '@/shared/lib/prompt-core/runtime-observability';
import {
  Button,
  FormSection,
  Input,
  Label,
  StatusToggle,
  SelectSimple,
  EmptyState,
  Card,
  Badge,
  Hint,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useBenchmarkState } from '../context/hooks/useBenchmark';
import { useDocumentState } from '../context/hooks/useDocument';
import { useSettingsState, useSettingsActions } from '../context/hooks/useSettings';
import { promptExploderClampNumber } from '../helpers/formatting';
import { getPromptExploderRuntimePatternCacheSnapshot } from '../parser';
import {
  buildPromptExploderValidationRuleStackOptions,
  promptExploderValidationStackFromBridgeSource,
  promptExploderValidatorScopeFromStack,
} from '../validation-stack';

import type { LearningDraft } from '../context/settings/SettingsDraftsContext';
import type { PromptExploderLearnedTemplate } from '../types';

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

export function PatternRuntimePanel(): React.JSX.Element {
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

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setRuntimeHealthTick((current) => current + 1);
    }, 4_000);
    return () => {
      window.clearInterval(timer);
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
            options={validationStackOptions.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />{' '}
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
            options={[
              { value: 'all', label: 'All Rules' },
              { value: 'pattern_pack', label: 'Pattern Pack Only' },
              { value: 'learned_only', label: 'Learned Rules Only' },
            ]}
          />
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
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous: LearningDraft) => ({
                ...previous,
                similarityThreshold: promptExploderClampNumber(value, 0.3, 0.95),
              }));
            }}
          />
        </div>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Template Merge Threshold</Label>
          <Input
            type='number'
            min={0.3}
            max={0.95}
            step={0.01}
            value={learningDraft.templateMergeThreshold.toFixed(2)}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous: LearningDraft) => ({
                ...previous,
                templateMergeThreshold: promptExploderClampNumber(value, 0.3, 0.95),
              }));
            }}
          />
        </div>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Min Approvals For Match</Label>
          <Input
            type='number'
            min={1}
            max={20}
            step={1}
            value={String(learningDraft.minApprovalsForMatching)}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous: LearningDraft) => ({
                ...previous,
                minApprovalsForMatching: promptExploderClampNumber(Math.floor(value), 1, 20),
              }));
            }}
          />
        </div>
        <div className='min-w-0 space-y-1'>
          <Label className='text-[11px] text-gray-400'>Runtime Template Cap</Label>
          <Input
            type='number'
            min={50}
            max={5000}
            step={10}
            value={String(learningDraft.maxTemplates)}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous: LearningDraft) => ({
                ...previous,
                maxTemplates: promptExploderClampNumber(Math.floor(value), 50, 5000),
              }));
            }}
          />
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
          </Badge>{' '}
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
            onChange={(event) => setSnapshotDraftName(event.target.value)}
            placeholder='Snapshot name (optional)'
          />
          <SelectSimple
            size='sm'
            value={selectedSnapshotId}
            onValueChange={setSelectedSnapshotId}
            options={
              availableSnapshots.length > 0
                ? availableSnapshots.map((snapshot) => ({
                  value: snapshot.id,
                  label: `${snapshot.name} (${snapshot.ruleCount})`,
                }))
                : [{ value: '', label: 'No snapshots' }]
            }
          />
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
          <EmptyState
            title='No learned templates'
            description='Templates will appear here as they are discovered from your prompts.'
            variant='compact'
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
                    options={[
                      { value: 'draft', label: 'Draft' },
                      { value: 'candidate', label: 'Candidate' },
                      { value: 'active', label: 'Active' },
                      { value: 'disabled', label: 'Disabled' },
                    ]}
                  />
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
