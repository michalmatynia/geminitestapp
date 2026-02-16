'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
} from '@/features/admin/pages/validator-scope';
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
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  type PromptExploderBenchmarkReport,
} from '../benchmark';
import {
  savePromptExploderApplyPrompt,
  savePromptExploderApplyPromptForCaseResolver,
} from '../bridge';
import {
  promptExploderClampNumber,
} from '../helpers/formatting';
import {
  createApprovalDraftFromSegment,
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
  getPromptExploderScopedRules,
  PROMPT_EXPLODER_PATTERN_PACK_IDS,
} from '../pattern-pack';
import {
  parsePromptExploderLibrary,
  PROMPT_EXPLODER_LIBRARY_KEY,
  sortPromptExploderLibraryItemsByUpdated,
} from '../prompt-library';
import {
  filterTemplatesForRuntime,
} from '../runtime-refresh';
import {
  parsePromptExploderSettings,
  PROMPT_EXPLODER_SETTINGS_KEY,
} from '../settings';
import {
  buildPromptExploderValidationRuleStackOptions,
  DEFAULT_PROMPT_EXPLODER_VALIDATION_RULE_STACK,
  normalizePromptExploderValidationRuleStack,
  promptExploderValidationScopeFromStack,
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
    createApprovalDraftFromSegment(null)
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
  const activeValidationScope = useMemo(
    () => promptExploderValidationScopeFromStack(
      learningDraft.runtimeValidationRuleStack,
      validatorPatternLists
    ),
    [learningDraft.runtimeValidationRuleStack, validatorPatternLists]
  );

  const scopedRules = useMemo<PromptValidationRule[]>(
    () => getPromptExploderScopedRules(promptSettings, activeValidationScope),
    [activeValidationScope, promptSettings]
  );

  const effectiveRules = useMemo<PromptValidationRule[]>(() => {
    const byId = new Map<string, PromptValidationRule>();
    [...scopedRules, ...sessionLearnedRules].forEach((rule) => {
      byId.set(rule.id, rule);
    });
    return [...byId.values()];
  }, [scopedRules, sessionLearnedRules]);

  const runtimeValidationRules = useMemo<PromptValidationRule[]>(() => {
    if (learningDraft.runtimeRuleProfile === 'learned_only') {
      return effectiveRules.filter((rule) => rule.id.startsWith('segment.learned.'));
    }
    if (learningDraft.runtimeRuleProfile === 'pattern_pack') {
      return effectiveRules.filter((rule) =>
        PROMPT_EXPLODER_PATTERN_PACK_IDS.has(rule.id)
      );
    }
    return effectiveRules;
  }, [effectiveRules, learningDraft.runtimeRuleProfile]);

  const effectiveLearnedTemplates = useMemo<PromptExploderLearnedTemplate[]>(() => {
    const byId = new Map<string, PromptExploderLearnedTemplate>();
    [...promptExploderSettings.learning.templates, ...sessionLearnedTemplates].forEach((template) => {
      byId.set(template.id, template);
    });
    return [...byId.values()];
  }, [promptExploderSettings.learning.templates, sessionLearnedTemplates]);

  const runtimeLearnedTemplates = useMemo<PromptExploderLearnedTemplate[]>(() => {
    if (!learningDraft.enabled) return [];
    return filterTemplatesForRuntime(effectiveLearnedTemplates, {
      minApprovalsForMatching: learningDraft.minApprovalsForMatching,
      maxTemplates: learningDraft.maxTemplates,
    });
  }, [effectiveLearnedTemplates, learningDraft.enabled, learningDraft.maxTemplates, learningDraft.minApprovalsForMatching]);

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

    const nextDocument = explodePromptText({
      prompt: trimmed,
      validationRules: runtimeValidationRules,
      learnedTemplates: runtimeLearnedTemplates,
      similarityThreshold: promptExploderClampNumber(learningDraft.similarityThreshold, 0.3, 0.95),
      validationScope: activeValidationScope,
    });

    setManualBindings([]);
    setDocumentState(nextDocument);
    setSelectedSegmentId(nextDocument.segments[0]?.id ?? null);
    toast(`Exploded into ${nextDocument.segments.length} segment(s).`, { variant: 'success' });
  }, [promptText, runtimeValidationRules, runtimeLearnedTemplates, learningDraft.similarityThreshold, activeValidationScope, toast]);

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
      savePromptExploderApplyPromptForCaseResolver(reassembled, incomingCaseResolverContext);
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
