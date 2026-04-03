'use client';

import React, { useCallback, useMemo, useState } from 'react';

import type { ParseCustomBenchmarkCasesResult } from '@/shared/contracts/prompt-exploder';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useToast } from '@/shared/ui';

import {
  DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES,
  EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES,
  PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET,
  PROMPT_EXPLODER_DEFAULT_LOW_CONFIDENCE_THRESHOLD,
  PROMPT_EXPLODER_DEFAULT_SUGGESTION_LIMIT,
  runPromptExploderBenchmark,
  type PromptExploderBenchmarkCase,
  type PromptExploderBenchmarkReport,
  type PromptExploderBenchmarkCaseReport,
} from '../benchmark';
import {
  defaultCustomBenchmarkCaseIdFromPrompt,
  mergeCustomBenchmarkCases,
  parseCustomBenchmarkCasesDraft,
  upsertCustomBenchmarkCase,
} from '../custom-benchmark-cases';
import {
  promptExploderBenchmarkSuiteLabel,
  promptExploderClampNumber,
} from '../helpers/formatting';
import { useDocumentActions, useDocumentState } from './DocumentContext';
import { useSettingsActions, useSettingsState } from './SettingsContext';
import { useBenchmarkSuggestionActions } from './benchmark/useBenchmarkSuggestionActions';

import type { PromptExploderBenchmarkSuggestion, PromptExploderSegment } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BenchmarkState {
  benchmarkReport: PromptExploderBenchmarkReport | null;
  benchmarkSuiteDraft: 'default' | 'extended' | 'custom';
  benchmarkLowConfidenceThresholdDraft: number;
  benchmarkSuggestionLimitDraft: number;
  customBenchmarkCasesDraft: string;
  customCaseDraftId: string;
  dismissedBenchmarkSuggestionIds: string[];
  benchmarkSuggestions: PromptExploderBenchmarkSuggestion[];
  visibleBenchmarkSuggestions: PromptExploderBenchmarkSuggestion[];
  parsedCustomBenchmarkCases: ParseCustomBenchmarkCasesResult;
}

export interface BenchmarkActions {
  setBenchmarkSuiteDraft: React.Dispatch<React.SetStateAction<'default' | 'extended' | 'custom'>>;
  setBenchmarkLowConfidenceThresholdDraft: React.Dispatch<React.SetStateAction<number>>;
  setBenchmarkSuggestionLimitDraft: React.Dispatch<React.SetStateAction<number>>;
  setCustomBenchmarkCasesDraft: React.Dispatch<React.SetStateAction<string>>;
  setCustomCaseDraftId: React.Dispatch<React.SetStateAction<string>>;
  setBenchmarkReport: React.Dispatch<React.SetStateAction<PromptExploderBenchmarkReport | null>>;
  setDismissedBenchmarkSuggestionIds: React.Dispatch<React.SetStateAction<string[]>>;
  handleRunBenchmark: () => void;
  handleAddCurrentPromptAsCustomBenchmarkCase: () => void;
  handleClearCustomBenchmarkCases: () => void;
  handleLoadCustomBenchmarkTemplate: (suite: 'default' | 'extended') => void;
  handleAppendBenchmarkTemplateToCustom: (suite: 'default' | 'extended') => void;
  handleAddBenchmarkSuggestionRules: (
    suggestions: PromptExploderBenchmarkSuggestion[]
  ) => Promise<void>;
  handleAddBenchmarkSuggestionRule: (
    suggestion: PromptExploderBenchmarkSuggestion
  ) => Promise<void>;
  handleDismissBenchmarkSuggestion: (suggestionId: string) => void;
  handleDismissAllVisibleBenchmarkSuggestions: () => void;
  handleResetDismissedBenchmarkSuggestions: () => void;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const benchmarkStateContextResult = createStrictContext<BenchmarkState>({
  hookName: 'useBenchmarkState',
  providerName: 'BenchmarkProvider',
  displayName: 'BenchmarkStateContext',
  errorFactory: (message) => internalError(message),
});

const benchmarkActionsContextResult = createStrictContext<BenchmarkActions>({
  hookName: 'useBenchmarkActions',
  providerName: 'BenchmarkProvider',
  displayName: 'BenchmarkActionsContext',
  errorFactory: (message) => internalError(message),
});

const BenchmarkStateContext = benchmarkStateContextResult.Context;
const BenchmarkActionsContext = benchmarkActionsContextResult.Context;

// ── Provider ─────────────────────────────────────────────────────────────────

export function BenchmarkProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();

  const {
    settingsMap,
    activeValidationScope,
    runtimeValidationRules,
    runtimeLearnedTemplates,
    learningDraft,
    promptSettings,
    promptExploderSettings,
    effectiveLearnedTemplates,
    templateMergeThreshold,
    sessionLearnedRules,
  } = useSettingsState();
  const { setSessionLearnedRules, setSessionLearnedTemplates, updateSetting, updateSettingsBulk } =
    useSettingsActions();
  const { promptText, documentState } = useDocumentState();
  const { setDocumentState, setManualBindings, setSelectedSegmentId } = useDocumentActions();

  const [benchmarkReport, setBenchmarkReport] = useState<PromptExploderBenchmarkReport | null>(
    null
  );
  const [benchmarkSuiteDraft, setBenchmarkSuiteDraft] = useState<'default' | 'extended' | 'custom'>(
    'default'
  );
  const [benchmarkLowConfidenceThresholdDraft, setBenchmarkLowConfidenceThresholdDraft] = useState(
    PROMPT_EXPLODER_DEFAULT_LOW_CONFIDENCE_THRESHOLD
  );
  const [benchmarkSuggestionLimitDraft, setBenchmarkSuggestionLimitDraft] = useState(
    PROMPT_EXPLODER_DEFAULT_SUGGESTION_LIMIT
  );
  const [customBenchmarkCasesDraft, setCustomBenchmarkCasesDraft] = useState('[]');
  const [customCaseDraftId, setCustomCaseDraftId] = useState('');
  const [dismissedBenchmarkSuggestionIds, setDismissedBenchmarkSuggestionIds] = useState<string[]>(
    []
  );

  // ── Derived ────────────────────────────────────────────────────────────────

  const parsedCustomBenchmarkCases = useMemo(
    (): ParseCustomBenchmarkCasesResult =>
      parseCustomBenchmarkCasesDraft(customBenchmarkCasesDraft),
    [customBenchmarkCasesDraft]
  );

  const benchmarkSuggestions = useMemo((): PromptExploderBenchmarkSuggestion[] => {
    if (!benchmarkReport) return [];
    return benchmarkReport.cases.flatMap(
      (caseReport: PromptExploderBenchmarkCaseReport) => caseReport.lowConfidenceSuggestions
    );
  }, [benchmarkReport]);

  const visibleBenchmarkSuggestions = useMemo((): PromptExploderBenchmarkSuggestion[] => {
    if (benchmarkSuggestions.length === 0) return [];
    const hiddenIds = new Set(dismissedBenchmarkSuggestionIds);
    return benchmarkSuggestions.filter(
      (suggestion: PromptExploderBenchmarkSuggestion) => !hiddenIds.has(suggestion.id || '')
    );
  }, [benchmarkSuggestions, dismissedBenchmarkSuggestionIds]);
  // ── Actions ────────────────────────────────────────────────────────────────

  const handleRunBenchmark = useCallback(() => {
    let customCases: PromptExploderBenchmarkCase[] | null = null;
    if (benchmarkSuiteDraft === 'custom') {
      if (!parsedCustomBenchmarkCases.ok) {
        toast(`Custom benchmark JSON is invalid: ${parsedCustomBenchmarkCases.error}`, {
          variant: 'error',
        });
        return;
      }
      if (parsedCustomBenchmarkCases.cases.length === 0) {
        toast('Add at least one custom benchmark case before running.', { variant: 'info' });
        return;
      }
      customCases = parsedCustomBenchmarkCases.cases;
    }
    const benchmarkLowConfidenceThreshold = promptExploderClampNumber(
      benchmarkLowConfidenceThresholdDraft,
      0.3,
      0.9
    );
    const benchmarkSuggestionLimit = promptExploderClampNumber(
      Math.floor(benchmarkSuggestionLimitDraft),
      1,
      20
    );
    const report = runPromptExploderBenchmark({
      validationRules: runtimeValidationRules,
      learnedTemplates: runtimeLearnedTemplates,
      similarityThreshold: promptExploderClampNumber(learningDraft.similarityThreshold, 0.3, 0.95),
      validationScope: activeValidationScope,
      suite: benchmarkSuiteDraft === 'extended' ? 'extended' : 'default',
      lowConfidenceThreshold: benchmarkLowConfidenceThreshold,
      suggestionLimit: benchmarkSuggestionLimit,
      cases: customCases,
    });
    setBenchmarkReport(report);
    setDismissedBenchmarkSuggestionIds([]);
    const recallPercent = (report.aggregate.expectedTypeRecall * 100).toFixed(1);
    toast(
      `Benchmark (${promptExploderBenchmarkSuiteLabel(report.suite)}) completed. Expected-type recall: ${recallPercent}%`,
      {
        variant:
          report.aggregate.expectedTypeRecall >= PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET
            ? 'success'
            : 'warning',
      }
    );
  }, [
    activeValidationScope,
    benchmarkLowConfidenceThresholdDraft,
    benchmarkSuggestionLimitDraft,
    benchmarkSuiteDraft,
    learningDraft.similarityThreshold,
    parsedCustomBenchmarkCases,
    runtimeLearnedTemplates,
    runtimeValidationRules,
    toast,
  ]);

  const handleAddCurrentPromptAsCustomBenchmarkCase = useCallback(() => {
    const prompt = promptText.trim();
    if (!prompt) {
      toast('Source prompt is empty.', { variant: 'info' });
      return;
    }
    const defaultCaseId = defaultCustomBenchmarkCaseIdFromPrompt(prompt);
    const caseId = customCaseDraftId.trim() || defaultCaseId;
    const expectedTypes = (
      documentState?.segments.length
        ? [...new Set(documentState.segments.map((segment: PromptExploderSegment) => segment.type))]
        : ['assigned_text']
    ) as PromptExploderSegment['type'][];
    const minSegments = Math.max(1, documentState?.segments.length ?? 1);
    const parsed: ParseCustomBenchmarkCasesResult =
      parseCustomBenchmarkCasesDraft(customBenchmarkCasesDraft);
    if (!parsed.ok) {
      toast(`Custom benchmark JSON is invalid: ${parsed.error}`, { variant: 'error' });
      return;
    }
    const nextCases = upsertCustomBenchmarkCase(parsed.cases, {
      id: caseId,
      prompt,
      expectedTypes,
      minSegments,
    });
    setCustomBenchmarkCasesDraft(JSON.stringify(nextCases, null, 2));
    setBenchmarkSuiteDraft('custom');
    toast(`Custom benchmark case upserted: ${caseId}`, { variant: 'success' });
  }, [customBenchmarkCasesDraft, customCaseDraftId, documentState?.segments, promptText, toast]);

  const handleClearCustomBenchmarkCases = useCallback(() => {
    setCustomBenchmarkCasesDraft('[]');
    toast('Custom benchmark cases cleared.', { variant: 'info' });
  }, [toast]);

  const handleLoadCustomBenchmarkTemplate = useCallback(
    (suite: 'default' | 'extended') => {
      const templateCases =
        suite === 'extended'
          ? EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES
          : DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES;
      setCustomBenchmarkCasesDraft(JSON.stringify(templateCases, null, 2));
      setBenchmarkSuiteDraft('custom');
      toast(
        `Loaded ${suite} benchmark template into custom suite (${templateCases.length} case(s)).`,
        { variant: 'success' }
      );
    },
    [toast]
  );

  const handleAppendBenchmarkTemplateToCustom = useCallback(
    (suite: 'default' | 'extended') => {
      const parsed: ParseCustomBenchmarkCasesResult =
        parseCustomBenchmarkCasesDraft(customBenchmarkCasesDraft);
      if (!parsed.ok) {
        toast(`Custom benchmark JSON is invalid: ${parsed.error}`, { variant: 'error' });
        return;
      }
      const templateCases =
        suite === 'extended'
          ? EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES
          : DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES;
      const nextCases = mergeCustomBenchmarkCases(parsed.cases, templateCases);
      setCustomBenchmarkCasesDraft(JSON.stringify(nextCases, null, 2));
      setBenchmarkSuiteDraft('custom');
      toast(
        `Appended ${suite} template into custom suite. Total custom cases: ${nextCases.length}.`,
        { variant: 'success' }
      );
    },
    [customBenchmarkCasesDraft, toast]
  );

  const { handleAddBenchmarkSuggestionRules, handleAddBenchmarkSuggestionRule } =
    useBenchmarkSuggestionActions({
      activeValidationScope,
      documentState,
      effectiveLearnedTemplates,
      learningDraft,
      promptExploderSettings,
      promptText,
      promptSettings,
      runtimeLearnedTemplates,
      runtimeValidationRules,
      sessionLearnedRules,
      setDismissedBenchmarkSuggestionIds,
      setDocumentState,
      setManualBindings,
      setSelectedSegmentId,
      setSessionLearnedRules,
      setSessionLearnedTemplates,
      settingsMap,
      templateMergeThreshold,
      toast,
      updateSetting,
      updateSettingsBulk,
    });

  const handleDismissBenchmarkSuggestion = useCallback((suggestionId: string) => {
    setDismissedBenchmarkSuggestionIds((previous) =>
      previous.includes(suggestionId) ? previous : [...previous, suggestionId]
    );
  }, []);

  const handleDismissAllVisibleBenchmarkSuggestions = useCallback(() => {
    if (visibleBenchmarkSuggestions.length === 0) return;
    setDismissedBenchmarkSuggestionIds((previous) => [
      ...new Set([
        ...previous,
        ...visibleBenchmarkSuggestions
          .map((s: PromptExploderBenchmarkSuggestion) => s.id)
          .filter((id: string | undefined): id is string => Boolean(id)),
      ]),
    ]);
  }, [visibleBenchmarkSuggestions]);

  const handleResetDismissedBenchmarkSuggestions = useCallback(() => {
    setDismissedBenchmarkSuggestionIds([]);
  }, []);

  // ── Memoized context values ────────────────────────────────────────────────

  const stateValue = useMemo<BenchmarkState>(
    () => ({
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
    }),
    [
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
    ]
  );

  const actionsValue = useMemo<BenchmarkActions>(
    () => ({
      setBenchmarkSuiteDraft,
      setBenchmarkLowConfidenceThresholdDraft,
      setBenchmarkSuggestionLimitDraft,
      setCustomBenchmarkCasesDraft,
      setCustomCaseDraftId,
      setBenchmarkReport,
      setDismissedBenchmarkSuggestionIds,
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
    }),
    [
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
    ]
  );

  return (
    <BenchmarkStateContext.Provider value={stateValue}>
      <BenchmarkActionsContext.Provider value={actionsValue}>
        {children}
      </BenchmarkActionsContext.Provider>
    </BenchmarkStateContext.Provider>
  );
}

// ── Hook exports ─────────────────────────────────────────────────────────────

export const useBenchmarkState = benchmarkStateContextResult.useStrictContext;

export const useBenchmarkActions = benchmarkActionsContextResult.useStrictContext;

export { BenchmarkStateContext, BenchmarkActionsContext };
