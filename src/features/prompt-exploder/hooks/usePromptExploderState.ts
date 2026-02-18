'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
} from '@/features/admin/pages/validator-scope';
import { recordPromptValidationCounter } from '@/features/prompt-core/runtime-observability';
import {
  parsePromptEngineSettings,
  PROMPT_ENGINE_SETTINGS_KEY,
  type PromptValidationRule,
} from '@/features/prompt-engine/settings';
import {
  useSettingsMap,
  useUpdateSetting,
} from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  type PromptExploderBenchmarkReport,
} from '../benchmark';
import {
  savePromptExploderApplyPrompt,
  savePromptExploderApplyPromptForCaseResolver,
} from '../bridge';
import {
  isPromptExploderOrchestratorEnabled,
  isPromptValidationStrictStackMode,
  resolvePromptExploderOrchestratorRollout,
} from '../feature-flags';
import {
  promptExploderClampNumber,
} from '../helpers/formatting';
import {
  promptExploderCreateApprovalDraftFromSegment,
} from '../helpers/segment-helpers';
import {
  ensureSegmentTitle,
  explodePromptText,
  reassemblePromptSegments,
  updatePromptExploderDocument,
} from '../parser';
import {
  type PromptExploderParserTuningRuleDraft,
} from '../parser-tuning';
import {
  parsePromptExploderLibrary,
  PROMPT_EXPLODER_LIBRARY_KEY,
  sortPromptExploderLibraryItemsByUpdated,
} from '../prompt-library';
import {
  explodePromptWithValidationRuntime,
  resolvePromptValidationRuntime,
} from '../prompt-validation-orchestrator';
import {
  leavePromptRuntimeScope,
  tryEnterPromptRuntimeScope,
} from '../runtime-load-shedder';
import {
  parsePromptExploderSettings,
  PROMPT_EXPLODER_SETTINGS_KEY,
} from '../settings';
import { extractCaseResolverBridgePayloadFromSegments } from '../utils/case-resolver-extraction';
import {
  buildPromptExploderValidationRuleStackOptions,
  DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
  normalizePromptExploderValidationRuleStack,
  promptExploderValidationStackFromBridgeSource,
} from '../validation-stack';

import type {
  PromptExploderBinding,
  PromptExploderDocument,
  PromptExploderLearnedTemplate,
  PromptExploderSegment,
} from '../types';

const EMPTY_CASE_RESOLVER_PARTY_SELECTION = {
  addresserSegmentId: '',
  addresseeSegmentId: '',
};

export function usePromptExploderState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSetting = useUpdateSetting();

  const [promptText, setPromptText] = useState('');
  const [documentState, setDocumentState] = useState<PromptExploderDocument | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [benchmarkReport, setBenchmarkReport] =
    useState<PromptExploderBenchmarkReport | null>(null);
  const [manualBindings, setManualBindings] = useState<PromptExploderBinding[]>([]);
  const [sessionLearnedRules] = useState<PromptValidationRule[]>([]);
  const [sessionLearnedTemplates] = useState<PromptExploderLearnedTemplate[]>([]);
  const [learningDraft, setLearningDraft] = useState({
    runtimeRuleProfile: 'all' as 'all' | 'pattern_pack' | 'learned_only',
    runtimeValidationRuleStack: DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
    enabled: true,
    similarityThreshold: 0.68,
    templateMergeThreshold: 0.63,
    benchmarkSuggestionUpsertTemplates: true,
    minApprovalsForMatching: 1,
    maxTemplates: 1000,
    autoActivateLearnedTemplates: true,
  });
  const [parserTuningDrafts, setParserTuningDrafts] = useState<
    PromptExploderParserTuningRuleDraft[]
  >([]);
  const [isParserTuningOpen, setIsParserTuningOpen] = useState(false);
  const [dismissedBenchmarkSuggestionIds, setDismissedBenchmarkSuggestionIds] =
    useState<string[]>([]);
  const [snapshotDraftName, setSnapshotDraftName] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [approvalDraft, setApprovalDraft] = useState(
    promptExploderCreateApprovalDraftFromSegment(null)
  );
  const [bindingDraft, setBindingDraft] = useState<{
    type: 'depends_on' | 'mirrors' | 'extracts_to';
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
  const [incomingBridgeSource] =
    useState<'image-studio' | 'case-resolver' | null>(null);
  const [incomingCaseResolverContext] = useState<{
    fileId: string;
    fileName: string;
  } | null>(null);
  const [caseResolverPartySelection, setCaseResolverPartySelection] =
    useState(EMPTY_CASE_RESOLVER_PARTY_SELECTION);
  const [selectedCaseResolverStructuredDraft, setSelectedCaseResolverStructuredDraft] =
    useState<Record<string, unknown> | null>(null);
  const explodeInFlightRef = useRef(false);
  const lastExplosionRef = useRef<{
    signature: string;
    document: PromptExploderDocument;
  } | null>(null);

  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';
  const returnTarget = returnTo.startsWith('/admin/case-resolver') ? 'case-resolver' : 'image-studio';
  const shouldPreferCaseResolverValidationStack =
    incomingBridgeSource === 'case-resolver' || returnTarget === 'case-resolver';

  const rawPromptSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const rawExploderSettings = settingsQuery.data?.get(PROMPT_EXPLODER_SETTINGS_KEY) ?? null;
  const rawPromptLibrary =
    settingsQuery.data?.get(PROMPT_EXPLODER_LIBRARY_KEY) ?? null;
  const rawValidatorPatternLists =
    settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  
  const promptSettings = useMemo(
    () => parsePromptEngineSettings(rawPromptSettings),
    [rawPromptSettings]
  );
  const promptExploderSettings = useMemo(
    () => parsePromptExploderSettings(rawExploderSettings),
    [rawExploderSettings]
  );
  const promptLibraryState = useMemo(
    () => parsePromptExploderLibrary(rawPromptLibrary),
    [rawPromptLibrary]
  );
  const validatorPatternLists = useMemo(
    () => parseValidatorPatternLists(rawValidatorPatternLists),
    [rawValidatorPatternLists]
  );
  const validationPatternStackOptions = useMemo(
    () => buildPromptExploderValidationRuleStackOptions(validatorPatternLists),
    [validatorPatternLists]
  );
  const promptLibraryItems = useMemo(
    () => sortPromptExploderLibraryItemsByUpdated(promptLibraryState.items),
    [promptLibraryState.items]
  );
  const strictStackMode = useMemo(
    () => isPromptValidationStrictStackMode(),
    []
  );
  const runtimeResolution = useMemo(() => {
    const preferredValidatorScope = shouldPreferCaseResolverValidationStack
      ? 'case-resolver-prompt-exploder'
      : 'prompt-exploder';
    try {
      return {
        runtime: resolvePromptValidationRuntime({
          promptSettings,
          promptExploderSettings,
          validatorPatternLists,
          runtimeRuleProfile: learningDraft.runtimeRuleProfile,
          runtimeValidationRuleStack: learningDraft.runtimeValidationRuleStack,
          learningEnabled: learningDraft.enabled,
          minApprovalsForMatching: learningDraft.minApprovalsForMatching,
          maxTemplates: learningDraft.maxTemplates,
          sessionLearnedRules,
          sessionLearnedTemplates,
          preferredValidatorScope,
          strictUnknownStack: strictStackMode,
        }),
        warning: null as Error | null,
      };
    } catch (error) {
      return {
        runtime: resolvePromptValidationRuntime({
          promptSettings,
          promptExploderSettings,
          validatorPatternLists,
          runtimeRuleProfile: learningDraft.runtimeRuleProfile,
          runtimeValidationRuleStack: learningDraft.runtimeValidationRuleStack,
          learningEnabled: learningDraft.enabled,
          minApprovalsForMatching: learningDraft.minApprovalsForMatching,
          maxTemplates: learningDraft.maxTemplates,
          sessionLearnedRules,
          sessionLearnedTemplates,
          preferredValidatorScope,
          strictUnknownStack: false,
        }),
        warning: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }, [
    learningDraft.enabled,
    learningDraft.maxTemplates,
    learningDraft.minApprovalsForMatching,
    learningDraft.runtimeRuleProfile,
    learningDraft.runtimeValidationRuleStack,
    promptExploderSettings,
    promptSettings,
    sessionLearnedRules,
    sessionLearnedTemplates,
    shouldPreferCaseResolverValidationStack,
    strictStackMode,
    validatorPatternLists,
  ]);

  useEffect(() => {
    if (!runtimeResolution.warning) return;
    logClientError(runtimeResolution.warning, {
      context: {
        source: 'usePromptExploderState',
        action: 'resolvePromptValidationRuntime',
        stack: learningDraft.runtimeValidationRuleStack,
        correlationId: runtimeResolution.runtime.correlationId,
        level: 'warn',
      },
    });
    toast(runtimeResolution.warning.message, { variant: 'warning' });
  }, [
    learningDraft.runtimeValidationRuleStack,
    runtimeResolution.runtime.correlationId,
    runtimeResolution.warning,
    toast,
  ]);

  const activeValidationScope = runtimeResolution.runtime.identity.scope;
  const effectiveRules = runtimeResolution.runtime.effectiveRules;
  const runtimeValidationRules = runtimeResolution.runtime.runtimeValidationRules;
  const effectiveLearnedTemplates = runtimeResolution.runtime.effectiveLearnedTemplates;

  const selectedSegment = useMemo(() => {
    if (!documentState || !selectedSegmentId) return null;
    return documentState.segments.find((segment) => segment.id === selectedSegmentId) ?? null;
  }, [documentState, selectedSegmentId]);

  const segmentById = useMemo(() => {
    return new Map((documentState?.segments ?? []).map((segment) => [segment.id, segment]));
  }, [documentState?.segments]);

  // Handle auto-settings sync
  useEffect(() => {
    const persistedStack = normalizePromptExploderValidationRuleStack(
      promptExploderSettings.runtime.validationRuleStack,
      validatorPatternLists
    );
    const preferredStack = shouldPreferCaseResolverValidationStack
      ? promptExploderValidationStackFromBridgeSource('case-resolver', validatorPatternLists)
      : persistedStack;
    
    setLearningDraft({
      runtimeRuleProfile: promptExploderSettings.runtime.ruleProfile,
      runtimeValidationRuleStack: preferredStack,
      enabled: promptExploderSettings.learning.enabled,
      similarityThreshold: promptExploderSettings.learning.similarityThreshold,
      templateMergeThreshold: promptExploderSettings.learning.templateMergeThreshold,
      benchmarkSuggestionUpsertTemplates: promptExploderSettings.learning.benchmarkSuggestionUpsertTemplates,
      minApprovalsForMatching: promptExploderSettings.learning.minApprovalsForMatching,
      maxTemplates: promptExploderSettings.learning.maxTemplates,
      autoActivateLearnedTemplates: promptExploderSettings.learning.autoActivateLearnedTemplates,
    });
  }, [promptExploderSettings, shouldPreferCaseResolverValidationStack, validatorPatternLists]);

  const handleExplode = useCallback((): void => {
    const trimmed = promptText.trim();
    if (!trimmed) {
      toast('Enter a prompt first.', { variant: 'info' });
      return;
    }
    if (explodeInFlightRef.current) {
      recordPromptValidationCounter('runtime_backpressure_drop', 1, {
        scope: runtimeResolution.runtime.identity.scope,
      });
      toast('Prompt explosion is already running.', { variant: 'info' });
      return;
    }
    if (!tryEnterPromptRuntimeScope(runtimeResolution.runtime.identity.scope)) {
      recordPromptValidationCounter('runtime_backpressure_drop', 1, {
        scope: runtimeResolution.runtime.identity.scope,
      });
      toast('Runtime is busy for this scope. Try again in a moment.', {
        variant: 'info',
      });
      return;
    }
    explodeInFlightRef.current = true;

    try {
      const similarityThreshold = promptExploderClampNumber(
        learningDraft.similarityThreshold,
        0.3,
        0.95
      );
      const learnedTemplateSignature = runtimeResolution.runtime.runtimeLearnedTemplates
        .map((template) => `${template.id}:${template.state}:${template.updatedAt}`)
        .join('|');
      const runtimeSignature = [
        trimmed,
        runtimeResolution.runtime.identity.cacheKey,
        similarityThreshold.toFixed(4),
        learnedTemplateSignature,
      ].join('::');
      if (lastExplosionRef.current?.signature === runtimeSignature) {
        recordPromptValidationCounter('runtime_fast_path_hit', 1, {
          scope: runtimeResolution.runtime.identity.scope,
        });
        const nextDocument = lastExplosionRef.current.document;
        setManualBindings([]);
        setDocumentState(nextDocument);
        setSelectedSegmentId(nextDocument.segments[0]?.id ?? null);
        toast(`Reused ${nextDocument.segments.length} cached segment(s).`, {
          variant: 'info',
        });
        return;
      }
      recordPromptValidationCounter('runtime_fast_path_miss', 1, {
        scope: runtimeResolution.runtime.identity.scope,
      });

      const rollout = resolvePromptExploderOrchestratorRollout({
        settingsEnabled: promptExploderSettings.runtime.orchestratorEnabled,
        cohortSeed: runtimeResolution.runtime.identity.cacheKey,
      });
      const orchestratorEnabled = isPromptExploderOrchestratorEnabled(
        promptExploderSettings.runtime.orchestratorEnabled,
        runtimeResolution.runtime.identity.cacheKey
      );
      const nextDocument = orchestratorEnabled
        ? explodePromptWithValidationRuntime({
          prompt: trimmed,
          runtime: runtimeResolution.runtime,
          similarityThreshold,
        })
        : explodePromptText({
          prompt: trimmed,
          validationRules: runtimeResolution.runtime.runtimeValidationRules,
          learnedTemplates: runtimeResolution.runtime.runtimeLearnedTemplates,
          similarityThreshold,
          validationScope: runtimeResolution.runtime.identity.scope,
        });
      lastExplosionRef.current = {
        signature: runtimeSignature,
        document: nextDocument,
      };

      setManualBindings([]);
      setDocumentState(nextDocument);
      setSelectedSegmentId(nextDocument.segments[0]?.id ?? null);
      toast(`Exploded into ${nextDocument.segments.length} segment(s).`, {
        variant: 'success',
      });
      if (!orchestratorEnabled) {
        logClientError(
          new Error('Prompt runtime orchestrator disabled for current rollout cohort.'),
          {
            context: {
              source: 'usePromptExploderState',
              action: 'handleExplode.rollout',
              scope: runtimeResolution.runtime.identity.scope,
              stack: runtimeResolution.runtime.identity.stack,
              rolloutReason: rollout.reason,
              rolloutPercent: rollout.canaryPercent,
              rolloutBucket: rollout.bucket,
              level: 'warn',
            },
          }
        );
      }
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'usePromptExploderState',
          action: 'handleExplode',
          correlationId: runtimeResolution.runtime.correlationId,
          scope: runtimeResolution.runtime.identity.scope,
          stack: runtimeResolution.runtime.identity.stack,
          level: 'error',
        },
      });
      toast(
        error instanceof Error ? error.message : 'Prompt explosion failed.',
        { variant: 'error' }
      );
    } finally {
      explodeInFlightRef.current = false;
      leavePromptRuntimeScope(runtimeResolution.runtime.identity.scope);
    }
  }, [
    promptText,
    runtimeResolution.runtime,
    learningDraft.similarityThreshold,
    promptExploderSettings.runtime.orchestratorEnabled,
    toast,
  ]);

  const handleSaveDocument = useCallback(async (name: string): Promise<void> => {
    if (!documentState) return;
    try {
      const now = new Date().toISOString();
      const newItem = {
        id: `lib_${Date.now()}`,
        name,
        prompt: promptText,
        segments: documentState.segments,
        manualBindings,
        createdAt: now,
        updatedAt: now,
      };
      const nextLibrary = {
        ...promptLibraryState,
        items: [...promptLibraryState.items, newItem],
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_LIBRARY_KEY,
        value: serializeSetting(nextLibrary),
      });
      toast('Project saved: ' + name, { variant: 'success' });
    } catch {
      toast('Failed to save project.', { variant: 'error' });
    }
  }, [documentState, promptText, manualBindings, promptLibraryState, updateSetting, toast]);

  const updateSegment = useCallback((segmentId: string, updater: (segment: PromptExploderSegment) => PromptExploderSegment): void => {
    setDocumentState((current: PromptExploderDocument | null) => {
      if (!current) return current;
      const nextSegments = current.segments.map((segment: PromptExploderSegment) =>
        segment.id === segmentId ? ensureSegmentTitle(updater(segment)) : segment
      );
      return updatePromptExploderDocument(current, nextSegments, manualBindings);
    });
  }, [manualBindings]);

  const handleApplyToBridge = useCallback((): void => {
    if (!documentState) return;
    const reassembled = reassemblePromptSegments(documentState.segments);
    if (returnTarget === 'case-resolver') {
      const payload = extractCaseResolverBridgePayloadFromSegments(documentState.segments);
      savePromptExploderApplyPromptForCaseResolver(
        reassembled,
        incomingCaseResolverContext,
        payload.parties,
        payload.metadata
      );
    } else {
      savePromptExploderApplyPrompt(reassembled);
    }
    router.push(returnTo);
  }, [documentState, returnTarget, incomingCaseResolverContext, returnTo, router]);

  return {
    promptText,
    setPromptText,
    documentState,
    setDocumentState,
    selectedSegmentId,
    setSelectedSegmentId,
    selectedSegment,
    learningDraft,
    setLearningDraft,
    activeValidationScope,
    validationPatternStackOptions,
    runtimeValidationRules,
    effectiveLearnedTemplates,
    effectiveRules,
    benchmarkReport,
    setBenchmarkReport,
    isParserTuningOpen,
    setIsParserTuningOpen,
    parserTuningDrafts,
    setParserTuningDrafts,
    manualBindings,
    setManualBindings,
    handleExplode,
    handleSaveDocument,
    updateSegment,
    handleApplyToBridge,
    returnTo,
    returnTarget,
    settingsQuery,
    promptSettings,
    promptExploderSettings,
    validatorPatternLists,
    promptLibraryItems,
    approvalDraft,
    setApprovalDraft,
    bindingDraft,
    setBindingDraft,
    snapshotDraftName,
    setSnapshotDraftName,
    selectedSnapshotId,
    setSelectedSnapshotId,
    dismissedBenchmarkSuggestionIds,
    setDismissedBenchmarkSuggestionIds,
    caseResolverPartySelection,
    setCaseResolverPartySelection,
    selectedCaseResolverStructuredDraft,
    setSelectedCaseResolverStructuredDraft,
    incomingBridgeSource,
    incomingCaseResolverContext,
    segmentById,
  };
}
