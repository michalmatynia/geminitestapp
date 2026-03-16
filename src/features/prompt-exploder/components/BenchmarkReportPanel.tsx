'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  Button,
  FormSection,
  Input,
  Textarea,
  SelectSimple,
  FormField,
  SectionHeader,
} from '@/shared/ui';

import {
  DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES,
  EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES,
  PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET,
  type PromptExploderBenchmarkCaseReport,
} from '../benchmark';
import { useBenchmarkState, useBenchmarkActions } from '../context/hooks/useBenchmark';
import { useSettingsState } from '../context/hooks/useSettings';
import { promptExploderClampNumber } from '../helpers/formatting';

type BenchmarkSuiteOption = 'default' | 'extended' | 'custom';

const BENCHMARK_SUITE_OPTIONS = [
  {
    value: 'default',
    label: `Default (${DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES.length} cases)`,
  },
  {
    value: 'extended',
    label: `Extended (${EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES.length} cases)`,
  },
  {
    value: 'custom',
    label: 'Custom (JSON)',
  },
] as const satisfies ReadonlyArray<LabeledOptionDto<BenchmarkSuiteOption>>;

export function BenchmarkReportPanel(): React.JSX.Element {
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
              options={[...BENCHMARK_SUITE_OPTIONS]}
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
              placeholder='[{"id":"case_1","prompt":"...","expectedTypes":["sequence"],"minSegments":1}]'
              aria-label='[{"id":"case_1","prompt":"...","expectedTypes":["sequence"],"minSegments":1}]'
              title='[{"id":"case_1","prompt":"...","expectedTypes":["sequence"],"minSegments":1}]'
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
