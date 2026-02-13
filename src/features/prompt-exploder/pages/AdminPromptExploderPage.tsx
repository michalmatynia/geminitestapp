'use client';

import { ArrowDown, ArrowUp, Link2, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import { extractParamsFromPrompt } from '@/features/prompt-engine/prompt-params';
import {
  defaultPromptEngineSettings,
  parsePromptEngineSettings,
  parsePromptValidationRules,
  PROMPT_ENGINE_SETTINGS_KEY,
  type PromptValidationRule,
} from '@/features/prompt-engine/settings';
import {
  useSettingsMap,
  useUpdateSetting,
} from '@/shared/hooks/use-settings';
import {
  Button,
  EmptyState,
  FormSection,
  Input,
  Label,
  SectionHeader,
  StatusToggle,
  Textarea,
  UnifiedButton,
  UnifiedSelect,
  useToast,
} from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES,
  EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES,
  PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET,
  PROMPT_EXPLODER_DEFAULT_LOW_CONFIDENCE_THRESHOLD,
  PROMPT_EXPLODER_DEFAULT_SUGGESTION_LIMIT,
  type PromptExploderBenchmarkCase,
  type PromptExploderBenchmarkReport,
  type PromptExploderBenchmarkSuggestion,
  runPromptExploderBenchmark,
} from '../benchmark';
import {
  consumePromptExploderDraftPrompt,
  readPromptExploderDraftPrompt,
  savePromptExploderApplyPrompt,
} from '../bridge';
import {
  ensureSegmentTitle,
  explodePromptText,
  moveByDelta,
  reassemblePromptSegments,
  updatePromptExploderDocument,
} from '../parser';
import {
  ensurePromptExploderPatternPack,
  getPromptExploderScopedRules,
  PROMPT_EXPLODER_PATTERN_PACK,
  PROMPT_EXPLODER_PATTERN_PACK_IDS,
} from '../pattern-pack';
import {
  parsePromptExploderSettings,
  PROMPT_EXPLODER_SETTINGS_KEY,
} from '../settings';

import type {
  PromptExploderBenchmarkSuite,
  PromptExploderBinding,
  PromptExploderBindingType,
  PromptExploderDocument,
  PromptExploderLearnedTemplate,
  PromptExploderPatternSnapshot,
  PromptExploderListItem,
  PromptExploderSegment,
  PromptExploderSubsection,
} from '../types';

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const PROMPT_EXPLODER_SEGMENT_TYPES: PromptExploderSegment['type'][] = [
  'metadata',
  'assigned_text',
  'list',
  'parameter_block',
  'referential_list',
  'sequence',
  'hierarchical_list',
  'conditional_list',
  'qa_matrix',
];

const isPromptExploderManagedRule = (rule: PromptValidationRule): boolean => {
  const scopes = rule.appliesToScopes ?? [];
  const hasPromptExploderScope = scopes.includes('prompt_exploder');
  if (hasPromptExploderScope) return true;
  if (rule.id.includes('prompt_exploder') || rule.id.includes('exploder') || rule.id.startsWith('segment.')) {
    return true;
  }
  return false;
};

const filterTemplatesForRuntime = (
  templates: PromptExploderLearnedTemplate[],
  options: { minApprovalsForMatching: number; maxTemplates: number }
): PromptExploderLearnedTemplate[] => {
  const minApprovals = clampNumber(
    Math.floor(options.minApprovalsForMatching),
    1,
    20
  );
  const maxTemplates = clampNumber(Math.floor(options.maxTemplates), 50, 5000);
  const sorted = [...templates].sort((left, right) => {
    if (right.approvals !== left.approvals) {
      return right.approvals - left.approvals;
    }
    return right.updatedAt.localeCompare(left.updatedAt);
  });
  return sorted
    .filter(
      (template) =>
        template.state === 'active' &&
        template.approvals >= minApprovals
    )
    .slice(0, maxTemplates);
};

const createListItem = (text = 'New item'): PromptExploderListItem => ({
  id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  text,
  children: [],
});

const addBlankListItem = (items: PromptExploderListItem[]): PromptExploderListItem[] => {
  return [...items, createListItem()];
};

const createSubsection = (): PromptExploderSubsection => ({
  id: `subsection_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  title: 'New subsection',
  code: null,
  condition: null,
  items: [createListItem()],
});

const createManualBindingId = (): string =>
  `manual_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const formatSubsectionLabel = (subsection: PromptExploderSubsection): string => {
  const title = subsection.title.trim() || 'Untitled subsection';
  if (subsection.code) {
    return `[${subsection.code}] ${title}`;
  }
  return title;
};

const normalizeLearningText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const learningTokens = (value: string): string[] => {
  return normalizeLearningText(value)
    .split(' ')
    .filter((token) => token.length > 2)
    .slice(0, 8);
};

const learningTokenSet = (value: string): Set<string> => {
  const tokens = normalizeLearningText(value)
    .split(' ')
    .filter((token) => token.length > 1);
  return new Set(tokens);
};

const learningJaccardSimilarity = (left: string, right: string): number => {
  const leftSet = learningTokenSet(left);
  const rightSet = learningTokenSet(right);
  if (leftSet.size === 0 && rightSet.size === 0) return 1;
  if (leftSet.size === 0 || rightSet.size === 0) return 0;
  let intersection = 0;
  leftSet.forEach((token) => {
    if (rightSet.has(token)) intersection += 1;
  });
  const union = leftSet.size + rightSet.size - intersection;
  if (union <= 0) return 0;
  return intersection / union;
};

const learningBigrams = (value: string): Set<string> => {
  const normalized = normalizeLearningText(value).replace(/\s+/g, '');
  if (!normalized) return new Set();
  if (normalized.length === 1) return new Set([normalized]);
  const out = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    out.add(normalized.slice(index, index + 2));
  }
  return out;
};

const learningDiceSimilarity = (left: string, right: string): number => {
  const leftBigrams = learningBigrams(left);
  const rightBigrams = learningBigrams(right);
  if (leftBigrams.size === 0 && rightBigrams.size === 0) return 1;
  if (leftBigrams.size === 0 || rightBigrams.size === 0) return 0;
  let overlap = 0;
  leftBigrams.forEach((token) => {
    if (rightBigrams.has(token)) overlap += 1;
  });
  return (2 * overlap) / (leftBigrams.size + rightBigrams.size);
};

const learningAnchorCoverageScore = (
  sourceText: string,
  anchorTokens: string[]
): number => {
  const normalizedSource = normalizeLearningText(sourceText);
  const anchors = anchorTokens
    .map((token) => normalizeLearningText(token))
    .filter(Boolean);
  if (anchors.length === 0) return 0;
  let hits = 0;
  anchors.forEach((token) => {
    if (normalizedSource.includes(token)) hits += 1;
  });
  return hits / anchors.length;
};

const templateSimilarityScore = (
  sourceText: string,
  template: PromptExploderLearnedTemplate
): number => {
  const titleReference = template.normalizedTitle || template.title;
  const titleScore = Math.max(
    learningDiceSimilarity(sourceText, titleReference),
    learningJaccardSimilarity(sourceText, titleReference)
  );
  const sampleScore = template.sampleText
    ? Math.max(
      learningDiceSimilarity(sourceText, template.sampleText),
      learningJaccardSimilarity(sourceText, template.sampleText)
    )
    : 0;
  const anchorScore = learningAnchorCoverageScore(sourceText, template.anchorTokens);
  return Math.max(titleScore, sampleScore * 0.8 + anchorScore * 0.2);
};

const mergeTemplateAnchorTokens = (
  existingTokens: string[],
  incomingTokens: string[]
): string[] => {
  const deduped: string[] = [];
  [...existingTokens, ...incomingTokens].forEach((token) => {
    const normalized = normalizeLearningText(token);
    if (!normalized) return;
    if (deduped.includes(normalized)) return;
    deduped.push(normalized);
  });
  return deduped.slice(0, 20);
};

const mergeTemplateSampleText = (existing: string, incoming: string): string => {
  const existingText = existing.trim();
  const incomingText = incoming.trim();
  if (!existingText) return incomingText;
  if (!incomingText) return existingText;
  const normalizedExisting = normalizeLearningText(existingText);
  const normalizedIncoming = normalizeLearningText(incomingText);
  if (!normalizedExisting) return incomingText;
  if (!normalizedIncoming) return existingText;
  if (normalizedExisting.includes(normalizedIncoming)) return existingText;
  if (normalizedIncoming.includes(normalizedExisting)) return incomingText;
  return `${existingText}\n${incomingText}`.slice(0, 1200);
};

const findSimilarTemplateMatch = (args: {
  templates: PromptExploderLearnedTemplate[];
  segmentType: PromptExploderLearnedTemplate['segmentType'];
  sourceText: string;
  similarityThreshold: number;
}): { template: PromptExploderLearnedTemplate; score: number } | null => {
  const mergeThreshold = clampNumber(args.similarityThreshold - 0.05, 0.3, 0.95);
  const candidates = args.templates
    .filter((template) => template.segmentType === args.segmentType)
    .map((template) => ({
      template,
      score: templateSimilarityScore(args.sourceText, template),
    }))
    .filter((candidate) => candidate.score >= mergeThreshold)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.template.approvals !== left.template.approvals) {
        return right.template.approvals - left.template.approvals;
      }
      return right.template.updatedAt.localeCompare(left.template.updatedAt);
    });
  return candidates[0] ?? null;
};

const deriveTemplateStateAfterApproval = (args: {
  existingState: PromptExploderLearnedTemplate['state'] | null;
  nextApprovals: number;
  minApprovalsForMatching: number;
  autoActivateLearnedTemplates: boolean;
}): PromptExploderLearnedTemplate['state'] => {
  const approvalThreshold = clampNumber(
    args.minApprovalsForMatching,
    1,
    20
  );
  if (args.autoActivateLearnedTemplates && args.nextApprovals >= approvalThreshold) {
    return 'active';
  }
  if (args.existingState === 'active') return 'active';
  if (args.existingState === 'draft') return 'draft';
  return 'candidate';
};

const buildSegmentSampleText = (segment: PromptExploderSegment): string => {
  if (segment.listItems.length > 0) {
    return segment.listItems.slice(0, 4).map((item) => item.text).join(' ');
  }
  if (segment.subsections.length > 0) {
    return segment.subsections
      .slice(0, 3)
      .map((subsection) => subsection.title)
      .join(' ');
  }
  return segment.text.slice(0, 220);
};

const buildLearnedRulePattern = (segment: PromptExploderSegment): string => {
  const tokens = learningTokens(`${segment.title} ${buildSegmentSampleText(segment)}`);
  if (tokens.length === 0) {
    const escaped = segment.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `^\\s*${escaped}\\s*$`;
  }
  const anchors = tokens.slice(0, 4);
  return anchors.map((token) => `\\b${token}\\b`).join('[\\s\\S]{0,120}');
};

const createApprovalDraftFromSegment = (
  segment: PromptExploderSegment | null
): {
  ruleTitle: string;
  rulePattern: string;
  ruleSegmentType: PromptExploderSegment['type'];
  rulePriority: number;
  ruleConfidenceBoost: number;
  ruleTreatAsHeading: boolean;
} => {
  if (!segment) {
    return {
      ruleTitle: 'Learned segment pattern',
      rulePattern: '\\bsegment\\b',
      ruleSegmentType: 'assigned_text',
      rulePriority: 30,
      ruleConfidenceBoost: 0.2,
      ruleTreatAsHeading: false,
    };
  }

  return {
    ruleTitle: `Learned ${segment.type} pattern`,
    rulePattern: buildLearnedRulePattern(segment),
    ruleSegmentType: segment.type,
    rulePriority: 30,
    ruleConfidenceBoost: 0.2,
    ruleTreatAsHeading: /^[A-Z0-9 _()[\]\\,:&+.-]{3,}$/.test(
      segment.title.trim()
    ),
  };
};

const parseCustomBenchmarkCasesDraft = (
  rawValue: string
): { ok: true; cases: PromptExploderBenchmarkCase[] } | { ok: false; error: string } => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { ok: true, cases: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON.',
    };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'Custom benchmark cases must be an array.' };
  }
  const parsedArray = parsed as unknown[];

  const allowedTypes = new Set<PromptExploderSegment['type']>(
    PROMPT_EXPLODER_SEGMENT_TYPES
  );
  const knownIds = new Set<string>();

  const cases: PromptExploderBenchmarkCase[] = [];
  for (let index = 0; index < parsedArray.length; index += 1) {
    const item: unknown = parsedArray[index];
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `Case #${index + 1} must be an object.` };
    }
    const value = item as Record<string, unknown>;
    const rawExpectedTypes: unknown[] = Array.isArray(value.expectedTypes)
      ? (value.expectedTypes as unknown[])
      : [];
    const id = typeof value.id === 'string' ? value.id.trim() : '';
    const prompt = typeof value.prompt === 'string' ? value.prompt.trim() : '';
    const expectedTypes = rawExpectedTypes.filter(
      (type): type is PromptExploderSegment['type'] => {
        return (
          typeof type === 'string' &&
          allowedTypes.has(type as PromptExploderSegment['type'])
        );
      }
    );
    const minSegments =
      typeof value.minSegments === 'number' && Number.isFinite(value.minSegments)
        ? clampNumber(Math.floor(value.minSegments), 1, 200)
        : 1;

    if (!id) {
      return { ok: false, error: `Case #${index + 1} is missing a valid id.` };
    }
    if (knownIds.has(id)) {
      return { ok: false, error: `Duplicate custom case id: "${id}".` };
    }
    knownIds.add(id);
    if (!prompt) {
      return { ok: false, error: `Case #${index + 1} is missing a prompt.` };
    }
    if (expectedTypes.length === 0) {
      return {
        ok: false,
        error: `Case "${id}" must include at least one valid expected type.`,
      };
    }

    cases.push({
      id,
      prompt,
      expectedTypes,
      minSegments,
    });
  }

  return { ok: true, cases };
};

const benchmarkSuiteLabel = (suite: PromptExploderBenchmarkSuite | 'custom'): string => {
  if (suite === 'extended') return 'extended';
  if (suite === 'custom') return 'custom';
  return 'default';
};

const suggestionRuleId = (suggestion: PromptExploderBenchmarkSuggestion): string => {
  const slug = `${suggestion.caseId}_${suggestion.segmentTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return `segment.benchmark.${suggestion.suggestedSegmentType}.${slug || 'segment'}`;
};

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'case';

export function AdminPromptExploderPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const [promptText, setPromptText] = useState('');
  const [documentState, setDocumentState] = useState<PromptExploderDocument | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [benchmarkReport, setBenchmarkReport] =
    useState<PromptExploderBenchmarkReport | null>(null);
  const [manualBindings, setManualBindings] = useState<PromptExploderBinding[]>([]);
  const [sessionLearnedRules, setSessionLearnedRules] = useState<PromptValidationRule[]>([]);
  const [sessionLearnedTemplates, setSessionLearnedTemplates] = useState<PromptExploderLearnedTemplate[]>([]);
  const [learningDraft, setLearningDraft] = useState<{
    runtimeRuleProfile: 'all' | 'pattern_pack' | 'learned_only';
    enabled: boolean;
    similarityThreshold: number;
    minApprovalsForMatching: number;
    maxTemplates: number;
    autoActivateLearnedTemplates: boolean;
  }>({
    runtimeRuleProfile: 'all',
    enabled: true,
    similarityThreshold: 0.68,
    minApprovalsForMatching: 1,
    maxTemplates: 1000,
    autoActivateLearnedTemplates: true,
  });
  const [benchmarkSuiteDraft, setBenchmarkSuiteDraft] =
    useState<PromptExploderBenchmarkSuite>('default');
  const [benchmarkLowConfidenceThresholdDraft, setBenchmarkLowConfidenceThresholdDraft] =
    useState(PROMPT_EXPLODER_DEFAULT_LOW_CONFIDENCE_THRESHOLD);
  const [benchmarkSuggestionLimitDraft, setBenchmarkSuggestionLimitDraft] =
    useState(PROMPT_EXPLODER_DEFAULT_SUGGESTION_LIMIT);
  const [customBenchmarkCasesDraft, setCustomBenchmarkCasesDraft] = useState('[]');
  const [customCaseDraftId, setCustomCaseDraftId] = useState('');
  const [dismissedBenchmarkSuggestionIds, setDismissedBenchmarkSuggestionIds] =
    useState<string[]>([]);
  const [snapshotDraftName, setSnapshotDraftName] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [approvalDraft, setApprovalDraft] = useState(
    createApprovalDraftFromSegment(null)
  );
  const [bindingDraft, setBindingDraft] = useState<{
    type: PromptExploderBindingType;
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

  const returnTo = searchParams?.get('returnTo') || '/admin/image-studio';

  const rawPromptSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const rawExploderSettings = settingsQuery.data?.get(PROMPT_EXPLODER_SETTINGS_KEY) ?? null;
  const promptSettings = useMemo(
    () => parsePromptEngineSettings(rawPromptSettings),
    [rawPromptSettings]
  );
  const promptExploderSettings = useMemo(
    () => parsePromptExploderSettings(rawExploderSettings),
    [rawExploderSettings]
  );

  useEffect(() => {
    setLearningDraft({
      runtimeRuleProfile: promptExploderSettings.runtime.ruleProfile,
      enabled: promptExploderSettings.learning.enabled,
      similarityThreshold: promptExploderSettings.learning.similarityThreshold,
      minApprovalsForMatching: promptExploderSettings.learning.minApprovalsForMatching,
      maxTemplates: promptExploderSettings.learning.maxTemplates,
      autoActivateLearnedTemplates:
        promptExploderSettings.learning.autoActivateLearnedTemplates,
    });
    setBenchmarkSuiteDraft(promptExploderSettings.runtime.benchmarkSuite);
    setBenchmarkLowConfidenceThresholdDraft(
      promptExploderSettings.runtime.benchmarkLowConfidenceThreshold
    );
    setBenchmarkSuggestionLimitDraft(
      promptExploderSettings.runtime.benchmarkSuggestionLimit
    );
    setCustomBenchmarkCasesDraft(
      JSON.stringify(promptExploderSettings.runtime.customBenchmarkCases, null, 2)
    );
  }, [
    promptExploderSettings.runtime.benchmarkLowConfidenceThreshold,
    promptExploderSettings.runtime.benchmarkSuggestionLimit,
    promptExploderSettings.runtime.benchmarkSuite,
    promptExploderSettings.runtime.customBenchmarkCases,
    promptExploderSettings.runtime.ruleProfile,
    promptExploderSettings.learning.autoActivateLearnedTemplates,
    promptExploderSettings.learning.enabled,
    promptExploderSettings.learning.maxTemplates,
    promptExploderSettings.learning.minApprovalsForMatching,
    promptExploderSettings.learning.similarityThreshold,
  ]);

  const scopedRules = useMemo<PromptValidationRule[]>(
    () => getPromptExploderScopedRules(promptSettings),
    [promptSettings]
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

  const selectedSegment = useMemo(() => {
    if (!documentState || !selectedSegmentId) return null;
    return (
      documentState.segments.find((segment) => segment.id === selectedSegmentId) ?? null
    );
  }, [documentState, selectedSegmentId]);
  const explosionMetrics = useMemo(() => {
    if (!documentState) return null;
    const lowConfidenceThreshold = clampNumber(
      benchmarkLowConfidenceThresholdDraft,
      0.3,
      0.9
    );
    const segments = documentState.segments;
    const total = segments.length;
    if (total === 0) {
      return {
        total: 0,
        avgConfidence: 0,
        lowConfidenceThreshold,
        lowConfidenceCount: 0,
        typedCoverage: 0,
        typeCounts: {} as Record<string, number>,
      };
    }
    const typeCounts: Record<string, number> = {};
    let confidenceSum = 0;
    let lowConfidenceCount = 0;
    let typedCount = 0;
    segments.forEach((segment) => {
      typeCounts[segment.type] = (typeCounts[segment.type] ?? 0) + 1;
      confidenceSum += segment.confidence;
      if (segment.confidence < lowConfidenceThreshold) lowConfidenceCount += 1;
      if (segment.type !== 'assigned_text') typedCount += 1;
    });
    return {
      total,
      avgConfidence: confidenceSum / total,
      lowConfidenceThreshold,
      lowConfidenceCount,
      typedCoverage: typedCount / total,
      typeCounts,
    };
  }, [benchmarkLowConfidenceThresholdDraft, documentState]);
  const runtimeLearnedTemplates = useMemo<PromptExploderLearnedTemplate[]>(() => {
    if (!learningDraft.enabled) return [];
    return filterTemplatesForRuntime(effectiveLearnedTemplates, {
      minApprovalsForMatching: learningDraft.minApprovalsForMatching,
      maxTemplates: learningDraft.maxTemplates,
    });
  }, [
    effectiveLearnedTemplates,
    learningDraft.enabled,
    learningDraft.maxTemplates,
    learningDraft.minApprovalsForMatching,
  ]);
  const matchedRuleDetails = useMemo(() => {
    if (!selectedSegment) return [];
    const byId = new Map(effectiveRules.map((rule) => [rule.id, rule]));
    return selectedSegment.matchedPatternIds.map((patternId) => {
      const rule = byId.get(patternId);
      return {
        id: patternId,
        title: rule?.title ?? patternId,
        segmentType: rule?.promptExploderSegmentType ?? null,
        priority: rule?.promptExploderPriority ?? 0,
        confidenceBoost: rule?.promptExploderConfidenceBoost ?? 0,
        treatAsHeading: rule?.promptExploderTreatAsHeading ?? false,
      };
    });
  }, [effectiveRules, selectedSegment]);
  const availableSnapshots = useMemo<PromptExploderPatternSnapshot[]>(() => {
    return [...promptExploderSettings.patternSnapshots].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }, [promptExploderSettings.patternSnapshots]);
  const selectedSnapshot = useMemo(() => {
    if (!selectedSnapshotId) return null;
    return (
      availableSnapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ??
      null
    );
  }, [availableSnapshots, selectedSnapshotId]);
  const parsedCustomBenchmarkCases = useMemo(
    () => parseCustomBenchmarkCasesDraft(customBenchmarkCasesDraft),
    [customBenchmarkCasesDraft]
  );
  const templateMergeThreshold = clampNumber(
    learningDraft.similarityThreshold - 0.05,
    0.3,
    0.95
  );
  const benchmarkSuggestions = useMemo(() => {
    if (!benchmarkReport) return [] as PromptExploderBenchmarkSuggestion[];
    return benchmarkReport.cases.flatMap((caseReport) => caseReport.lowConfidenceSuggestions);
  }, [benchmarkReport]);
  const visibleBenchmarkSuggestions = useMemo(() => {
    if (benchmarkSuggestions.length === 0) return [] as PromptExploderBenchmarkSuggestion[];
    const hiddenIds = new Set(dismissedBenchmarkSuggestionIds);
    return benchmarkSuggestions.filter((suggestion) => !hiddenIds.has(suggestion.id));
  }, [benchmarkSuggestions, dismissedBenchmarkSuggestionIds]);
  const similarTemplateCandidates = useMemo(() => {
    if (!selectedSegment) return [] as Array<{
      id: string;
      title: string;
      segmentType: PromptExploderLearnedTemplate['segmentType'];
      score: number;
      approvals: number;
      state: PromptExploderLearnedTemplate['state'];
      mergeEligible: boolean;
    }>;
    const sourceText = `${selectedSegment.title} ${buildSegmentSampleText(selectedSegment)}`.trim();
    const normalizedSelectedTitle = normalizeLearningText(selectedSegment.title);
    return effectiveLearnedTemplates
      .map((template) => {
        const score = templateSimilarityScore(sourceText, template);
        const sameType = template.segmentType === approvalDraft.ruleSegmentType;
        const mergeEligible = sameType && score >= templateMergeThreshold;
        return {
          id: template.id,
          title: template.title,
          segmentType: template.segmentType,
          score,
          approvals: template.approvals,
          state: template.state,
          mergeEligible,
          sameType,
          normalizedTitle: template.normalizedTitle,
        };
      })
      .filter(
        (candidate) =>
          candidate.score >= clampNumber(templateMergeThreshold - 0.1, 0.3, 0.95) ||
          candidate.normalizedTitle === normalizedSelectedTitle
      )
      .sort((left, right) => {
        if (Number(right.mergeEligible) !== Number(left.mergeEligible)) {
          return Number(right.mergeEligible) - Number(left.mergeEligible);
        }
        if (right.score !== left.score) return right.score - left.score;
        if (right.approvals !== left.approvals) return right.approvals - left.approvals;
        return right.id.localeCompare(left.id);
      })
      .slice(0, 6)
      .map(({ sameType: _sameType, normalizedTitle: _normalizedTitle, ...candidate }) => candidate);
  }, [
    approvalDraft.ruleSegmentType,
    effectiveLearnedTemplates,
    selectedSegment,
    templateMergeThreshold,
  ]);

  useEffect(() => {
    setApprovalDraft(createApprovalDraftFromSegment(selectedSegment));
  }, [selectedSegment?.id]);

  useEffect(() => {
    if (availableSnapshots.length === 0) {
      setSelectedSnapshotId('');
      return;
    }
    if (availableSnapshots.some((snapshot) => snapshot.id === selectedSnapshotId)) {
      return;
    }
    setSelectedSnapshotId(availableSnapshots[0]?.id ?? '');
  }, [availableSnapshots, selectedSnapshotId]);

  const segmentOptions = useMemo(() => {
    return (documentState?.segments ?? []).map((segment) => ({
      value: segment.id,
      label: segment.title,
    }));
  }, [documentState?.segments]);

  const segmentById = useMemo(() => {
    return new Map((documentState?.segments ?? []).map((segment) => [segment.id, segment]));
  }, [documentState?.segments]);

  const fromSubsectionOptions = useMemo(() => {
    const segment = segmentById.get(bindingDraft.fromSegmentId);
    const options = [{ value: '', label: 'Whole segment' }];
    if (!segment) return options;
    segment.subsections.forEach((subsection) => {
      options.push({
        value: subsection.id,
        label: formatSubsectionLabel(subsection),
      });
    });
    return options;
  }, [bindingDraft.fromSegmentId, segmentById]);

  const toSubsectionOptions = useMemo(() => {
    const segment = segmentById.get(bindingDraft.toSegmentId);
    const options = [{ value: '', label: 'Whole segment' }];
    if (!segment) return options;
    segment.subsections.forEach((subsection) => {
      options.push({
        value: subsection.id,
        label: formatSubsectionLabel(subsection),
      });
    });
    return options;
  }, [bindingDraft.toSegmentId, segmentById]);

  useEffect(() => {
    const fromStorage = readPromptExploderDraftPrompt();
    if (fromStorage && !promptText.trim()) {
      setPromptText(fromStorage);
      return;
    }

    if (promptText.trim().length > 0) return;

    setPromptText('=== PROMPT EXPLODER DEMO ===\n\nROLE\nDefine your role here.\n\nPARAMS\nparams = {\n  "example": true\n}');
  }, [promptText]);

  useEffect(() => {
    const segments = documentState?.segments ?? [];
    if (segments.length === 0) {
      setBindingDraft((previous) => ({
        ...previous,
        fromSegmentId: '',
        toSegmentId: '',
        fromSubsectionId: '',
        toSubsectionId: '',
      }));
      return;
    }

    const firstId = segments[0]?.id ?? '';
    const secondId = segments[1]?.id ?? firstId;
    const hasFrom = segments.some((segment) => segment.id === bindingDraft.fromSegmentId);
    const hasTo = segments.some((segment) => segment.id === bindingDraft.toSegmentId);

    if (hasFrom && hasTo) return;

    setBindingDraft((previous) => ({
      ...previous,
      fromSegmentId: hasFrom ? previous.fromSegmentId : firstId,
      toSegmentId: hasTo ? previous.toSegmentId : secondId,
    }));
  }, [bindingDraft.fromSegmentId, bindingDraft.toSegmentId, documentState?.segments]);

  useEffect(() => {
    if (!documentState) return;

    const fromSegment = segmentById.get(bindingDraft.fromSegmentId);
    const toSegment = segmentById.get(bindingDraft.toSegmentId);

    const fromSubsectionValid = Boolean(
      !bindingDraft.fromSubsectionId ||
      fromSegment?.subsections.some(
        (subsection) => subsection.id === bindingDraft.fromSubsectionId
      )
    );
    const toSubsectionValid = Boolean(
      !bindingDraft.toSubsectionId ||
      toSegment?.subsections.some(
        (subsection) => subsection.id === bindingDraft.toSubsectionId
      )
    );
    if (fromSubsectionValid && toSubsectionValid) return;

    setBindingDraft((previous) => ({
      ...previous,
      fromSubsectionId: fromSubsectionValid ? previous.fromSubsectionId : '',
      toSubsectionId: toSubsectionValid ? previous.toSubsectionId : '',
    }));
  }, [
    bindingDraft.fromSegmentId,
    bindingDraft.fromSubsectionId,
    bindingDraft.toSegmentId,
    bindingDraft.toSubsectionId,
    documentState,
    segmentById,
  ]);

  const replaceSegments = (segments: PromptExploderSegment[]): void => {
    const normalized = segments.map((segment) => ensureSegmentTitle(segment));
    setDocumentState((current) => {
      if (!current) return current;
      return updatePromptExploderDocument(current, normalized, manualBindings);
    });
  };

  const updateSegment = (segmentId: string, updater: (segment: PromptExploderSegment) => PromptExploderSegment): void => {
    setDocumentState((current) => {
      if (!current) return current;
      const nextSegments = current.segments.map((segment) =>
        segment.id === segmentId ? ensureSegmentTitle(updater(segment)) : segment
      );
      return updatePromptExploderDocument(current, nextSegments, manualBindings);
    });
  };

  const syncManualBindings = (nextManualBindings: PromptExploderBinding[]): void => {
    setManualBindings(nextManualBindings);
    setDocumentState((current) => {
      if (!current) return current;
      return updatePromptExploderDocument(current, current.segments, nextManualBindings);
    });
  };

  const updateListItemText = (
    items: PromptExploderListItem[],
    index: number,
    text: string
  ): PromptExploderListItem[] => {
    return items.map((item, itemIndex) =>
      itemIndex === index
        ? {
          ...item,
          text,
        }
        : item
    );
  };

  const handleExplode = (): void => {
    const trimmed = promptText.trim();
    if (!trimmed) {
      toast('Enter a prompt first.', { variant: 'info' });
      return;
    }

    const nextDocument = explodePromptText({
      prompt: trimmed,
      validationRules: runtimeValidationRules,
      learnedTemplates: runtimeLearnedTemplates,
      similarityThreshold: clampNumber(learningDraft.similarityThreshold, 0.3, 0.95),
    });

    setManualBindings([]);
    setDocumentState(nextDocument);
    setSelectedSegmentId(nextDocument.segments[0]?.id ?? null);

    toast(`Exploded into ${nextDocument.segments.length} segment(s).`, { variant: 'success' });
  };

  const upsertCustomBenchmarkCaseDraft = (
    nextCase: PromptExploderBenchmarkCase
  ): void => {
    const parsed = parseCustomBenchmarkCasesDraft(customBenchmarkCasesDraft);
    if (!parsed.ok) {
      toast(`Custom benchmark JSON is invalid: ${parsed.error}`, { variant: 'error' });
      return;
    }
    const nextCases = [
      ...parsed.cases.filter((benchmarkCase) => benchmarkCase.id !== nextCase.id),
      nextCase,
    ];
    setCustomBenchmarkCasesDraft(JSON.stringify(nextCases, null, 2));
    setBenchmarkSuiteDraft('custom');
    toast(`Custom benchmark case upserted: ${nextCase.id}`, { variant: 'success' });
  };

  const handleAddCurrentPromptAsCustomBenchmarkCase = (): void => {
    const prompt = promptText.trim();
    if (!prompt) {
      toast('Source prompt is empty.', { variant: 'info' });
      return;
    }
    const firstLine =
      prompt
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? 'custom_case';
    const defaultCaseId = `custom_${toSlug(firstLine)}`;
    const caseId = customCaseDraftId.trim() || defaultCaseId;

    const expectedTypes = (documentState?.segments.length
      ? [...new Set(documentState.segments.map((segment) => segment.type))]
      : ['assigned_text']) as PromptExploderSegment['type'][];
    const minSegments = Math.max(1, documentState?.segments.length ?? 1);

    upsertCustomBenchmarkCaseDraft({
      id: caseId,
      prompt,
      expectedTypes,
      minSegments,
    });
  };

  const handleClearCustomBenchmarkCases = (): void => {
    setCustomBenchmarkCasesDraft('[]');
    toast('Custom benchmark cases cleared.', { variant: 'info' });
  };

  const handleLoadCustomBenchmarkTemplate = (
    suite: 'default' | 'extended'
  ): void => {
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
  };

  const handleAppendBenchmarkTemplateToCustom = (
    suite: 'default' | 'extended'
  ): void => {
    const parsed = parseCustomBenchmarkCasesDraft(customBenchmarkCasesDraft);
    if (!parsed.ok) {
      toast(`Custom benchmark JSON is invalid: ${parsed.error}`, { variant: 'error' });
      return;
    }
    const templateCases =
      suite === 'extended'
        ? EXTENDED_PROMPT_EXPLODER_BENCHMARK_CASES
        : DEFAULT_PROMPT_EXPLODER_BENCHMARK_CASES;
    const nextById = new Map<string, PromptExploderBenchmarkCase>();
    [...parsed.cases, ...templateCases].forEach((benchmarkCase) => {
      nextById.set(benchmarkCase.id, benchmarkCase);
    });
    const nextCases = [...nextById.values()];
    setCustomBenchmarkCasesDraft(JSON.stringify(nextCases, null, 2));
    setBenchmarkSuiteDraft('custom');
    toast(
      `Appended ${suite} template into custom suite. Total custom cases: ${nextCases.length}.`,
      { variant: 'success' }
    );
  };

  const handleRunBenchmark = (): void => {
    let customCases: PromptExploderBenchmarkCase[] | null = null;
    if (benchmarkSuiteDraft === 'custom') {
      if (!parsedCustomBenchmarkCases.ok) {
        toast(`Custom benchmark JSON is invalid: ${parsedCustomBenchmarkCases.error}`, {
          variant: 'error',
        });
        return;
      }
      if (parsedCustomBenchmarkCases.cases.length === 0) {
        toast('Add at least one custom benchmark case before running.', {
          variant: 'info',
        });
        return;
      }
      customCases = parsedCustomBenchmarkCases.cases;
    }

    const benchmarkLowConfidenceThreshold = clampNumber(
      benchmarkLowConfidenceThresholdDraft,
      0.3,
      0.9
    );
    const benchmarkSuggestionLimit = clampNumber(
      Math.floor(benchmarkSuggestionLimitDraft),
      1,
      20
    );
    const report = runPromptExploderBenchmark({
      validationRules: runtimeValidationRules,
      learnedTemplates: runtimeLearnedTemplates,
      similarityThreshold: clampNumber(learningDraft.similarityThreshold, 0.3, 0.95),
      suite: benchmarkSuiteDraft === 'extended' ? 'extended' : 'default',
      lowConfidenceThreshold: benchmarkLowConfidenceThreshold,
      suggestionLimit: benchmarkSuggestionLimit,
      cases: customCases,
    });
    setBenchmarkReport(report);
    setDismissedBenchmarkSuggestionIds([]);
    const recallPercent = (report.aggregate.expectedTypeRecall * 100).toFixed(1);
    toast(
      `Benchmark (${benchmarkSuiteLabel(report.suite)}) completed. Expected-type recall: ${recallPercent}%`,
      {
        variant:
          report.aggregate.expectedTypeRecall >= PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET
            ? 'success'
            : 'warning',
      }
    );
  };

  const handleInstallPatternPack = async (): Promise<void> => {
    try {
      const result = ensurePromptExploderPatternPack(promptSettings);
      if (result.addedRuleIds.length === 0 && result.updatedRuleIds.length === 0) {
        toast('Prompt Exploder pattern pack is already installed.', { variant: 'info' });
        return;
      }

      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(result.nextSettings),
      });

      toast(
        `Pattern pack synced. Added ${result.addedRuleIds.length}, updated ${result.updatedRuleIds.length}.`,
        { variant: 'success' }
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to install pattern pack.', {
        variant: 'error',
      });
    }
  };

  const handleSaveLearningSettings = async (): Promise<void> => {
    try {
      let persistedCustomCases = promptExploderSettings.runtime.customBenchmarkCases;
      if (benchmarkSuiteDraft === 'custom') {
        if (!parsedCustomBenchmarkCases.ok) {
          toast(`Custom benchmark JSON is invalid: ${parsedCustomBenchmarkCases.error}`, {
            variant: 'error',
          });
          return;
        }
        if (parsedCustomBenchmarkCases.cases.length === 0) {
          toast('Custom suite selected but no custom cases are defined.', {
            variant: 'info',
          });
          return;
        }
        persistedCustomCases = parsedCustomBenchmarkCases.cases;
      }

      const nextSettings = {
        ...promptExploderSettings,
        runtime: {
          ...promptExploderSettings.runtime,
          ruleProfile: learningDraft.runtimeRuleProfile,
          benchmarkSuite: benchmarkSuiteDraft,
          benchmarkLowConfidenceThreshold: clampNumber(
            benchmarkLowConfidenceThresholdDraft,
            0.3,
            0.9
          ),
          benchmarkSuggestionLimit: clampNumber(
            Math.floor(benchmarkSuggestionLimitDraft),
            1,
            20
          ),
          customBenchmarkCases: persistedCustomCases,
        },
        learning: {
          ...promptExploderSettings.learning,
          enabled: learningDraft.enabled,
          similarityThreshold: clampNumber(learningDraft.similarityThreshold, 0.3, 0.95),
          minApprovalsForMatching: clampNumber(
            Math.floor(learningDraft.minApprovalsForMatching),
            1,
            20
          ),
          maxTemplates: clampNumber(Math.floor(learningDraft.maxTemplates), 50, 5000),
          autoActivateLearnedTemplates: learningDraft.autoActivateLearnedTemplates,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      toast('Prompt Exploder runtime + learning settings saved.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save Prompt Exploder learning settings.',
        { variant: 'error' }
      );
    }
  };

  const handleCapturePatternSnapshot = async (): Promise<void> => {
    try {
      const scopedPromptRules = promptSettings.promptValidation.rules.filter((rule) =>
        isPromptExploderManagedRule(rule)
      );
      const now = new Date().toISOString();
      const snapshotName =
        snapshotDraftName.trim() || `Prompt Exploder Snapshot ${now.slice(0, 19)}`;
      const snapshot: PromptExploderPatternSnapshot = {
        id: `snapshot_${Date.now().toString(36)}`,
        name: snapshotName,
        createdAt: now,
        ruleCount: scopedPromptRules.length,
        rulesJson: JSON.stringify(scopedPromptRules, null, 2),
      };
      const nextSettings = {
        ...promptExploderSettings,
        patternSnapshots: [snapshot, ...promptExploderSettings.patternSnapshots].slice(0, 40),
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setSnapshotDraftName('');
      setSelectedSnapshotId(snapshot.id);
      toast(`Snapshot saved (${snapshot.ruleCount} rules).`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to capture Prompt Exploder snapshot.',
        { variant: 'error' }
      );
    }
  };

  const handleRestorePatternSnapshot = async (): Promise<void> => {
    if (!selectedSnapshot) {
      toast('Select a snapshot to restore.', { variant: 'info' });
      return;
    }
    const parsed = parsePromptValidationRules(selectedSnapshot.rulesJson);
    if (!parsed.ok) {
      toast(`Snapshot is invalid: ${parsed.error}`, { variant: 'error' });
      return;
    }
    try {
      const basePromptSettings = promptSettings.promptValidation
        ? promptSettings
        : defaultPromptEngineSettings;
      const keptRules = basePromptSettings.promptValidation.rules.filter(
        (rule) => !isPromptExploderManagedRule(rule)
      );
      const restoredRules = parsed.rules.map((rule) => ({
        ...rule,
        appliesToScopes: [
          ...new Set([...(rule.appliesToScopes ?? []), 'prompt_exploder']),
        ],
      }));
      const nextPromptSettings = {
        ...basePromptSettings,
        promptValidation: {
          ...basePromptSettings.promptValidation,
          rules: [...keptRules, ...restoredRules],
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextPromptSettings),
      });
      toast(
        `Snapshot restored: ${selectedSnapshot.name} (${restoredRules.length} rules).`,
        { variant: 'success' }
      );
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to restore Prompt Exploder snapshot.',
        { variant: 'error' }
      );
    }
  };

  const handleDeletePatternSnapshot = async (): Promise<void> => {
    if (!selectedSnapshot) {
      toast('Select a snapshot to delete.', { variant: 'info' });
      return;
    }
    try {
      const nextSettings = {
        ...promptExploderSettings,
        patternSnapshots: promptExploderSettings.patternSnapshots.filter(
          (snapshot) => snapshot.id !== selectedSnapshot.id
        ),
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      toast(`Deleted snapshot: ${selectedSnapshot.name}`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to delete snapshot.',
        { variant: 'error' }
      );
    }
  };

  const handleTemplateStateChange = async (
    templateId: string,
    nextState: PromptExploderLearnedTemplate['state']
  ): Promise<void> => {
    try {
      const nextTemplates = promptExploderSettings.learning.templates.map((template) =>
        template.id === templateId
          ? {
            ...template,
            state: nextState,
            updatedAt: new Date().toISOString(),
          }
          : template
      );
      const nextSettings = {
        ...promptExploderSettings,
        learning: {
          ...promptExploderSettings.learning,
          templates: nextTemplates,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setSessionLearnedTemplates((previous) =>
        previous.map((template) =>
          template.id === templateId
            ? {
              ...template,
              state: nextState,
              updatedAt: new Date().toISOString(),
            }
            : template
        )
      );
      toast(`Template state changed to ${nextState}.`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to update template state.',
        { variant: 'error' }
      );
    }
  };

  const handleDeleteTemplate = async (templateId: string): Promise<void> => {
    try {
      const nextTemplates = promptExploderSettings.learning.templates.filter(
        (template) => template.id !== templateId
      );
      const nextSettings = {
        ...promptExploderSettings,
        learning: {
          ...promptExploderSettings.learning,
          templates: nextTemplates,
        },
      };
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextSettings),
      });
      setSessionLearnedTemplates((previous) =>
        previous.filter((template) => template.id !== templateId)
      );
      toast('Template removed.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to remove template.',
        { variant: 'error' }
      );
    }
  };

  const handleApplyToImageStudio = (): void => {
    if (!documentState) {
      toast('Explode the prompt before applying it.', { variant: 'info' });
      return;
    }

    const reassembled = reassemblePromptSegments(documentState.segments);
    savePromptExploderApplyPrompt(reassembled);
    toast('Reassembled prompt sent to Image Studio.', { variant: 'success' });
    router.push(returnTo);
  };

  const handleReloadFromStudio = (): void => {
    const nextPrompt = consumePromptExploderDraftPrompt();
    if (!nextPrompt) {
      toast('No draft prompt was received from Image Studio.', { variant: 'info' });
      return;
    }
    setPromptText(nextPrompt);
    toast('Loaded latest prompt draft from Image Studio.', { variant: 'success' });
  };

  const handleAddManualBinding = (): void => {
    if (!documentState) {
      toast('Explode a prompt before adding bindings.', { variant: 'info' });
      return;
    }

    const fromSegment = documentState.segments.find(
      (segment) => segment.id === bindingDraft.fromSegmentId
    );
    const toSegment = documentState.segments.find(
      (segment) => segment.id === bindingDraft.toSegmentId
    );
    if (!fromSegment || !toSegment) {
      toast('Select valid source and target segments.', { variant: 'error' });
      return;
    }

    const fromSubsection = bindingDraft.fromSubsectionId
      ? fromSegment.subsections.find(
        (subsection) => subsection.id === bindingDraft.fromSubsectionId
      ) ?? null
      : null;
    const toSubsection = bindingDraft.toSubsectionId
      ? toSegment.subsections.find(
        (subsection) => subsection.id === bindingDraft.toSubsectionId
      ) ?? null
      : null;

    if (bindingDraft.fromSubsectionId && !fromSubsection) {
      toast('Selected source subsection no longer exists.', { variant: 'error' });
      return;
    }
    if (bindingDraft.toSubsectionId && !toSubsection) {
      toast('Selected target subsection no longer exists.', { variant: 'error' });
      return;
    }

    if (
      bindingDraft.type === 'depends_on' &&
      fromSegment.id === toSegment.id &&
      (fromSubsection?.id ?? null) === (toSubsection?.id ?? null)
    ) {
      toast('Source and target cannot be the exact same endpoint for depends_on bindings.', {
        variant: 'info',
      });
      return;
    }

    const defaultSourceLabel = fromSubsection
      ? formatSubsectionLabel(fromSubsection)
      : fromSegment.title;
    const defaultTargetLabel = toSubsection
      ? formatSubsectionLabel(toSubsection)
      : toSegment.title;

    const nextBinding: PromptExploderBinding = {
      id: createManualBindingId(),
      type: bindingDraft.type,
      fromSegmentId: fromSegment.id,
      toSegmentId: toSegment.id,
      fromSubsectionId: fromSubsection?.id ?? null,
      toSubsectionId: toSubsection?.id ?? null,
      sourceLabel: bindingDraft.sourceLabel.trim() || defaultSourceLabel,
      targetLabel: bindingDraft.targetLabel.trim() || defaultTargetLabel,
      origin: 'manual',
    };

    syncManualBindings([...manualBindings, nextBinding]);
    setBindingDraft((previous) => ({
      ...previous,
      sourceLabel: '',
      targetLabel: '',
    }));
    toast('Manual binding added.', { variant: 'success' });
  };

  const handleRemoveManualBinding = (bindingId: string): void => {
    const nextManual = manualBindings.filter((binding) => binding.id !== bindingId);
    syncManualBindings(nextManual);
  };

  const handleApproveSelectedSegmentPattern = async (): Promise<void> => {
    if (!selectedSegment) {
      toast('Select a segment before approving a pattern.', { variant: 'info' });
      return;
    }
    if (!approvalDraft.rulePattern.trim()) {
      toast('Rule pattern cannot be empty.', { variant: 'error' });
      return;
    }
    try {
      void new RegExp(approvalDraft.rulePattern, 'mi');
    } catch (error) {
      toast(
        error instanceof Error
          ? `Invalid regex pattern: ${error.message}`
          : 'Invalid regex pattern.',
        { variant: 'error' }
      );
      return;
    }

    try {
      const now = new Date().toISOString();
      const segmentSampleText = buildSegmentSampleText(selectedSegment);
      const segmentLearningSource = `${selectedSegment.title} ${segmentSampleText}`.trim();
      const normalizedTitle = normalizeLearningText(selectedSegment.title);
      const exactTemplate = effectiveLearnedTemplates.find((template) => {
        return (
          template.segmentType === approvalDraft.ruleSegmentType &&
          template.normalizedTitle === normalizedTitle
        );
      });
      const similarTemplateMatch = !exactTemplate
        ? findSimilarTemplateMatch({
          templates: effectiveLearnedTemplates,
          segmentType: approvalDraft.ruleSegmentType,
          sourceText: segmentLearningSource,
          similarityThreshold: templateMergeThreshold,
        })
        : null;
      const existingTemplate = exactTemplate ?? similarTemplateMatch?.template ?? null;

      const templateId =
        existingTemplate?.id ??
        `template_${approvalDraft.ruleSegmentType}_${Date.now().toString(36)}`;
      const nextApprovals = (existingTemplate?.approvals ?? 0) + 1;
      const derivedState = deriveTemplateStateAfterApproval({
        existingState: existingTemplate?.state ?? null,
        nextApprovals,
        minApprovalsForMatching: learningDraft.minApprovalsForMatching,
        autoActivateLearnedTemplates: learningDraft.autoActivateLearnedTemplates,
      });
      const nextTemplate: PromptExploderLearnedTemplate = existingTemplate
        ? {
          ...existingTemplate,
          approvals: nextApprovals,
          state: derivedState,
          updatedAt: now,
          anchorTokens: mergeTemplateAnchorTokens(
            existingTemplate.anchorTokens,
            learningTokens(segmentLearningSource)
          ),
          sampleText: mergeTemplateSampleText(
            existingTemplate.sampleText,
            segmentSampleText
          ),
        }
        : {
          id: templateId,
          segmentType: approvalDraft.ruleSegmentType,
          state: derivedState,
          title: selectedSegment.title,
          normalizedTitle,
          anchorTokens: learningTokens(segmentLearningSource),
          sampleText: segmentSampleText,
          approvals: 1,
          createdAt: now,
          updatedAt: now,
        };

      const nextTemplates = existingTemplate
        ? effectiveLearnedTemplates.map((template) =>
          template.id === existingTemplate.id ? nextTemplate : template
        )
        : [...effectiveLearnedTemplates, nextTemplate];

      const learnedRuleId = `segment.learned.${approvalDraft.ruleSegmentType}.${templateId}`;
      const learnedRule: PromptValidationRule = {
        kind: 'regex',
        id: learnedRuleId,
        enabled: true,
        severity: 'info',
        title: approvalDraft.ruleTitle.trim() || `Learned ${approvalDraft.ruleSegmentType} pattern`,
        description: `Approved from Prompt Exploder segment: ${selectedSegment.title}`,
        pattern: approvalDraft.rulePattern.trim(),
        flags: 'mi',
        message: `Learned pattern matched a ${approvalDraft.ruleSegmentType} segment.`,
        similar: [],
        autofix: { enabled: false, operations: [] },
        sequenceGroupId: 'exploder_learned',
        sequenceGroupLabel: 'Exploder Learned',
        sequenceGroupDebounceMs: 0,
        sequence: 1000 + nextTemplates.length,
        chainMode: 'continue',
        maxExecutions: 1,
        passOutputToNext: true,
        appliesToScopes: ['prompt_exploder'],
        launchEnabled: false,
        launchAppliesToScopes: ['prompt_exploder'],
        launchScopeBehavior: 'gate',
        launchOperator: 'contains',
        launchValue: null,
        launchFlags: null,
        promptExploderSegmentType: approvalDraft.ruleSegmentType,
        promptExploderPriority: clampNumber(
          Math.floor(approvalDraft.rulePriority),
          -50,
          50
        ),
        promptExploderConfidenceBoost: clampNumber(
          approvalDraft.ruleConfidenceBoost,
          0,
          0.5
        ),
        promptExploderTreatAsHeading: approvalDraft.ruleTreatAsHeading,
      };

      const basePromptSettings = promptSettings.promptValidation
        ? promptSettings
        : defaultPromptEngineSettings;
      const learnedRules = basePromptSettings.promptValidation.learnedRules ?? [];
      const nextLearnedRules = [
        ...learnedRules.filter((rule) => rule.id !== learnedRule.id),
        learnedRule,
      ];

      const nextPromptSettings = {
        ...basePromptSettings,
        promptValidation: {
          ...basePromptSettings.promptValidation,
          learnedRules: nextLearnedRules,
        },
      };

      const nextExploderSettings = {
        ...promptExploderSettings,
        learning: {
          ...promptExploderSettings.learning,
          templates: nextTemplates,
        },
      };
      const runtimeTemplatesAfterApproval =
        nextExploderSettings.learning.enabled
          ? filterTemplatesForRuntime(nextTemplates, {
            minApprovalsForMatching:
              nextExploderSettings.learning.minApprovalsForMatching,
            maxTemplates: nextExploderSettings.learning.maxTemplates,
          })
          : [];

      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextPromptSettings),
      });
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextExploderSettings),
      });

      setSessionLearnedRules((previous) => [
        ...previous.filter((rule) => rule.id !== learnedRule.id),
        learnedRule,
      ]);
      setSessionLearnedTemplates((previous) => [
        ...previous.filter((template) => template.id !== nextTemplate.id),
        nextTemplate,
      ]);

      const sourcePrompt = promptText.trim() || documentState?.sourcePrompt || '';
      if (sourcePrompt) {
        const nextRuntimeRulesBase = runtimeValidationRules.filter(
          (rule) => rule.id !== learnedRule.id
        );
        const nextRuntimeRules =
          learningDraft.runtimeRuleProfile === 'pattern_pack'
            ? nextRuntimeRulesBase
            : [...nextRuntimeRulesBase, learnedRule];
        const refreshed = explodePromptText({
          prompt: sourcePrompt,
          validationRules: nextRuntimeRules,
          learnedTemplates: runtimeTemplatesAfterApproval,
          similarityThreshold: nextExploderSettings.learning.similarityThreshold,
        });
        setManualBindings([]);
        setDocumentState(refreshed);
        const preferredSegment = refreshed.segments.find(
          (segment) =>
            normalizeLearningText(segment.title) === normalizeLearningText(selectedSegment.title)
        );
        setSelectedSegmentId(preferredSegment?.id ?? refreshed.segments[0]?.id ?? null);
      }

      const mergeMessage = exactTemplate
        ? 'updated existing template'
        : similarTemplateMatch
          ? `merged into similar template (${(similarTemplateMatch.score * 100).toFixed(1)}% match)`
          : 'created new template';
      toast(`Pattern approved. Prompt Exploder learned and re-applied it (${mergeMessage}).`, {
        variant: 'success',
      });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to approve and learn this segment pattern.',
        { variant: 'error' }
      );
    }
  };

  const buildBenchmarkSuggestionRule = (
    suggestion: PromptExploderBenchmarkSuggestion,
    sequence: number
  ): PromptValidationRule => {
    const id = suggestionRuleId(suggestion);
    return {
      kind: 'regex',
      id,
      enabled: true,
      severity: 'info',
      title:
        suggestion.suggestedRuleTitle.trim() ||
        `Benchmark ${suggestion.suggestedSegmentType} pattern`,
      description: `Benchmark suggestion from case "${suggestion.caseId}" and segment "${suggestion.segmentTitle}".`,
      pattern: suggestion.suggestedRulePattern.trim(),
      flags: 'mi',
      message: `Benchmark learned pattern matched ${suggestion.suggestedSegmentType}.`,
      similar: [],
      autofix: { enabled: false, operations: [] },
      sequenceGroupId: 'exploder_benchmark_suggestions',
      sequenceGroupLabel: 'Exploder Benchmark Suggestions',
      sequenceGroupDebounceMs: 0,
      sequence,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: true,
      appliesToScopes: ['prompt_exploder'],
      launchEnabled: false,
      launchAppliesToScopes: ['prompt_exploder'],
      launchScopeBehavior: 'gate',
      launchOperator: 'contains',
      launchValue: null,
      launchFlags: null,
      promptExploderSegmentType: suggestion.suggestedSegmentType,
      promptExploderPriority: clampNumber(
        Math.floor(suggestion.suggestedPriority),
        -50,
        50
      ),
      promptExploderConfidenceBoost: clampNumber(
        suggestion.suggestedConfidenceBoost,
        0,
        0.5
      ),
      promptExploderTreatAsHeading: suggestion.suggestedTreatAsHeading,
    };
  };

  const handleAddBenchmarkSuggestionRules = async (
    suggestions: PromptExploderBenchmarkSuggestion[]
  ): Promise<void> => {
    const uniqueSuggestions = suggestions.filter(
      (suggestion, index, allSuggestions) =>
        allSuggestions.findIndex((candidate) => candidate.id === suggestion.id) === index
    );
    if (uniqueSuggestions.length === 0) {
      toast('No benchmark suggestions selected.', { variant: 'info' });
      return;
    }

    const invalidSuggestions: string[] = [];
    const validSuggestions = uniqueSuggestions.filter((suggestion) => {
      const pattern = suggestion.suggestedRulePattern.trim();
      if (!pattern) {
        invalidSuggestions.push(suggestion.segmentTitle);
        return false;
      }
      try {
        void new RegExp(pattern, 'mi');
        return true;
      } catch {
        invalidSuggestions.push(suggestion.segmentTitle);
        return false;
      }
    });

    if (validSuggestions.length === 0) {
      toast('No valid benchmark suggestions to add.', { variant: 'error' });
      return;
    }

    try {
      const basePromptSettings = promptSettings.promptValidation
        ? promptSettings
        : defaultPromptEngineSettings;
      const learnedById = new Map<string, PromptValidationRule>();
      [
        ...(basePromptSettings.promptValidation.learnedRules ?? []),
        ...sessionLearnedRules,
      ].forEach((rule) => {
        learnedById.set(rule.id, rule);
      });

      let addedCount = 0;
      let updatedCount = 0;
      const appliedRules: PromptValidationRule[] = [];
      const templateById = new Map<string, PromptExploderLearnedTemplate>(
        effectiveLearnedTemplates.map((template) => [template.id, template])
      );
      const touchedTemplateIds = new Set<string>();

      validSuggestions.forEach((suggestion, index) => {
        const ruleId = suggestionRuleId(suggestion);
        if (learnedById.has(ruleId)) {
          updatedCount += 1;
        } else {
          addedCount += 1;
        }
        const nextSequence = 1200 + learnedById.size + index;
        const suggestedRule = buildBenchmarkSuggestionRule(suggestion, nextSequence);
        learnedById.set(ruleId, suggestedRule);
        appliedRules.push(suggestedRule);

        const sourceText = `${suggestion.segmentTitle} ${suggestion.sampleText}`.trim();
        const normalizedTitle = normalizeLearningText(suggestion.segmentTitle);
        const templates = [...templateById.values()];
        const exactTemplate = templates.find(
          (template) =>
            template.segmentType === suggestion.suggestedSegmentType &&
            template.normalizedTitle === normalizedTitle
        );
        const similarTemplate = !exactTemplate
          ? findSimilarTemplateMatch({
            templates,
            segmentType: suggestion.suggestedSegmentType,
            sourceText,
            similarityThreshold: templateMergeThreshold,
          })
          : null;
        const existingTemplate = exactTemplate ?? similarTemplate?.template ?? null;
        const nextApprovals = (existingTemplate?.approvals ?? 0) + 1;
        const nextState = deriveTemplateStateAfterApproval({
          existingState: existingTemplate?.state ?? null,
          nextApprovals,
          minApprovalsForMatching: learningDraft.minApprovalsForMatching,
          autoActivateLearnedTemplates: learningDraft.autoActivateLearnedTemplates,
        });
        let nextTemplateId =
          existingTemplate?.id ??
          `template_benchmark_${suggestion.suggestedSegmentType}_${toSlug(
            suggestion.segmentTitle
          )}_${Date.now().toString(36)}_${index + 1}`;
        while (!existingTemplate && templateById.has(nextTemplateId)) {
          nextTemplateId = `${nextTemplateId}_x`;
        }
        const nextTemplate: PromptExploderLearnedTemplate = existingTemplate
          ? {
            ...existingTemplate,
            approvals: nextApprovals,
            state: nextState,
            updatedAt: new Date().toISOString(),
            anchorTokens: mergeTemplateAnchorTokens(
              existingTemplate.anchorTokens,
              learningTokens(sourceText)
            ),
            sampleText: mergeTemplateSampleText(
              existingTemplate.sampleText,
              suggestion.sampleText
            ),
          }
          : {
            id: nextTemplateId,
            segmentType: suggestion.suggestedSegmentType,
            state: nextState,
            title: suggestion.segmentTitle,
            normalizedTitle,
            anchorTokens: learningTokens(sourceText),
            sampleText: suggestion.sampleText,
            approvals: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        templateById.set(nextTemplate.id, nextTemplate);
        touchedTemplateIds.add(nextTemplate.id);
      });

      const nextLearnedRules = [...learnedById.values()];
      const nextTemplates = [...templateById.values()];
      const nextPromptSettings = {
        ...basePromptSettings,
        promptValidation: {
          ...basePromptSettings.promptValidation,
          learnedRules: nextLearnedRules,
        },
      };
      const nextExploderSettings = {
        ...promptExploderSettings,
        learning: {
          ...promptExploderSettings.learning,
          templates: nextTemplates,
        },
      };

      await updateSetting.mutateAsync({
        key: PROMPT_ENGINE_SETTINGS_KEY,
        value: serializeSetting(nextPromptSettings),
      });
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SETTINGS_KEY,
        value: serializeSetting(nextExploderSettings),
      });

      setSessionLearnedRules((previous) => {
        const byId = new Map(previous.map((rule) => [rule.id, rule]));
        appliedRules.forEach((rule) => {
          byId.set(rule.id, rule);
        });
        return [...byId.values()];
      });
      setSessionLearnedTemplates((previous) => {
        const byId = new Map(previous.map((template) => [template.id, template]));
        nextTemplates.forEach((template) => {
          if (!touchedTemplateIds.has(template.id) && !byId.has(template.id)) {
            return;
          }
          byId.set(template.id, template);
        });
        return [...byId.values()];
      });
      setDismissedBenchmarkSuggestionIds((previous) => [
        ...new Set([...previous, ...validSuggestions.map((suggestion) => suggestion.id)]),
      ]);

      const sourcePrompt = promptText.trim() || documentState?.sourcePrompt || '';
      if (sourcePrompt) {
        const appliedRuleIds = new Set(appliedRules.map((rule) => rule.id));
        const nextRuntimeRulesBase = runtimeValidationRules.filter(
          (rule) => !appliedRuleIds.has(rule.id)
        );
        const nextRuntimeRules =
          learningDraft.runtimeRuleProfile === 'pattern_pack'
            ? nextRuntimeRulesBase
            : [...nextRuntimeRulesBase, ...appliedRules];
        const nextRuntimeTemplates =
          nextExploderSettings.learning.enabled
            ? filterTemplatesForRuntime(nextTemplates, {
              minApprovalsForMatching:
                nextExploderSettings.learning.minApprovalsForMatching,
              maxTemplates: nextExploderSettings.learning.maxTemplates,
            })
            : [];
        const refreshed = explodePromptText({
          prompt: sourcePrompt,
          validationRules: nextRuntimeRules,
          learnedTemplates: nextRuntimeTemplates,
          similarityThreshold: nextExploderSettings.learning.similarityThreshold,
        });
        setManualBindings([]);
        setDocumentState(refreshed);
        setSelectedSegmentId((previous) => {
          if (!previous) return refreshed.segments[0]?.id ?? null;
          return refreshed.segments.some((segment) => segment.id === previous)
            ? previous
            : refreshed.segments[0]?.id ?? null;
        });
      }

      const summary = `Benchmark suggestions applied: added ${addedCount}, updated ${updatedCount}.`;
      const templateSummary = `learned templates touched ${touchedTemplateIds.size}.`;
      if (invalidSuggestions.length > 0) {
        toast(`${summary} ${templateSummary} Skipped invalid ${invalidSuggestions.length}.`, {
          variant: 'warning',
        });
      } else {
        toast(`${summary} ${templateSummary}`, { variant: 'success' });
      }
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to add benchmark suggestion rule(s).',
        { variant: 'error' }
      );
    }
  };

  const handleAddBenchmarkSuggestionRule = async (
    suggestion: PromptExploderBenchmarkSuggestion
  ): Promise<void> => {
    await handleAddBenchmarkSuggestionRules([suggestion]);
  };

  const handleDismissBenchmarkSuggestion = (suggestionId: string): void => {
    setDismissedBenchmarkSuggestionIds((previous) =>
      previous.includes(suggestionId) ? previous : [...previous, suggestionId]
    );
  };

  const handleDismissAllVisibleBenchmarkSuggestions = (): void => {
    if (visibleBenchmarkSuggestions.length === 0) return;
    setDismissedBenchmarkSuggestionIds((previous) => [
      ...new Set([
        ...previous,
        ...visibleBenchmarkSuggestions.map((suggestion) => suggestion.id),
      ]),
    ]);
  };

  const handleResetDismissedBenchmarkSuggestions = (): void => {
    setDismissedBenchmarkSuggestionIds([]);
  };

  const describeBindingEndpoint = (
    segmentId: string,
    subsectionId: string | null | undefined
  ): string => {
    const segment = segmentById.get(segmentId);
    if (!segment) return 'Unknown segment';
    if (!subsectionId) return segment.title;
    const subsection = segment.subsections.find((candidate) => candidate.id === subsectionId);
    if (!subsection) return segment.title;
    return `${segment.title} · ${formatSubsectionLabel(subsection)}`;
  };

  return (
    <div className='container mx-auto space-y-4 py-6'>
      <SectionHeader
        eyebrow='AI · Prompt Exploder'
        title='Prompt Exploder'
        description='Explode prompts into typed segments, edit structure, and reassemble with references intact.'
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <UnifiedButton
              variant='outline'
              size='sm'
              onClick={handleReloadFromStudio}
            >
              <RefreshCcw className='mr-2 size-4' />
              Reload Studio Draft
            </UnifiedButton>
            <UnifiedButton
              variant='outline'
              size='sm'
              onClick={() => {
                router.push(returnTo);
              }}
            >
              Back to Image Studio
            </UnifiedButton>
          </div>
        }
      />

      <FormSection
        title='Pattern Runtime'
        description='Prompt Exploder uses Prompt Validator rules scoped to prompt_exploder.'
        variant='subtle'
        className='p-4'
        actions={
          <div className='text-xs text-gray-400'>
            Active rules: <span className='text-gray-200'>{runtimeValidationRules.length}</span> ·
            learned templates:{' '}
            <span className='text-gray-200'>{effectiveLearnedTemplates.length}</span>
            {' '}· runtime templates:{' '}
            <span className='text-gray-200'>{runtimeLearnedTemplates.length}</span>
            {' '}· profile:{' '}
            <span className='text-gray-200'>{learningDraft.runtimeRuleProfile}</span>
            {' '}· benchmark:{' '}
            <span className='text-gray-200'>{benchmarkSuiteDraft}</span>
            {' '}· low conf:{' '}
            <span className='text-gray-200'>
              {clampNumber(benchmarkLowConfidenceThresholdDraft, 0.3, 0.9).toFixed(2)}
            </span>
            {' '}· suggestion cap:{' '}
            <span className='text-gray-200'>
              {clampNumber(Math.floor(benchmarkSuggestionLimitDraft), 1, 20)}
            </span>
          </div>
        }
      >
        <div className='mt-3 flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void handleInstallPatternPack();
            }}
            disabled={updateSetting.isPending}
          >
            Install Pattern Pack
          </Button>
          <div className='text-xs text-gray-500'>
            Advanced pack includes {PROMPT_EXPLODER_PATTERN_PACK.length} segmentation patterns.
          </div>
        </div>
        <div className='mt-3 grid gap-2 md:grid-cols-6'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Runtime Rule Profile</Label>
            <UnifiedSelect
              value={learningDraft.runtimeRuleProfile}
              onValueChange={(value: string) => {
                setLearningDraft((previous) => ({
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
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Learning</Label>
            <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
              <StatusToggle
                enabled={learningDraft.enabled}
                onToggle={() => {
                  setLearningDraft((previous) => ({
                    ...previous,
                    enabled: !previous.enabled,
                  }));
                }}
              />
            </div>
          </div>
          <div className='space-y-1'>
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
                setLearningDraft((previous) => ({
                  ...previous,
                  similarityThreshold: clampNumber(value, 0.3, 0.95),
                }));
              }}
            />
          </div>
          <div className='space-y-1'>
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
                setLearningDraft((previous) => ({
                  ...previous,
                  minApprovalsForMatching: clampNumber(Math.floor(value), 1, 20),
                }));
              }}
            />
          </div>
          <div className='space-y-1'>
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
                setLearningDraft((previous) => ({
                  ...previous,
                  maxTemplates: clampNumber(Math.floor(value), 50, 5000),
                }));
              }}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Auto Activate Learned</Label>
            <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
              <StatusToggle
                enabled={learningDraft.autoActivateLearnedTemplates}
                onToggle={() => {
                  setLearningDraft((previous) => ({
                    ...previous,
                    autoActivateLearnedTemplates: !previous.autoActivateLearnedTemplates,
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
            disabled={updateSetting.isPending}
          >
            Save Learning Settings
          </Button>
          <div className='text-xs text-gray-500'>
            Current runtime: threshold {learningDraft.similarityThreshold.toFixed(2)}, min approvals {learningDraft.minApprovalsForMatching}, cap {learningDraft.maxTemplates}, auto-activate {learningDraft.autoActivateLearnedTemplates ? 'on' : 'off'}.
            {' '}Benchmark suite {benchmarkSuiteDraft}
            {benchmarkSuiteDraft === 'custom' && parsedCustomBenchmarkCases.ok
              ? ` (${parsedCustomBenchmarkCases.cases.length} custom case(s))`
              : ''}
          </div>
        </div>
        <div className='mt-4 rounded border border-border/60 bg-card/20 p-3'>
          <div className='mb-2 text-[11px] uppercase tracking-wide text-gray-400'>
            Pattern Snapshot Governance
          </div>
          <div className='grid gap-2 md:grid-cols-4'>
            <Input
              className='md:col-span-2'
              value={snapshotDraftName}
              onChange={(event) => setSnapshotDraftName(event.target.value)}
              placeholder='Snapshot name (optional)'
            />
            <UnifiedSelect
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
                disabled={updateSetting.isPending}
              >
                Capture
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  void handleRestorePatternSnapshot();
                }}
                disabled={updateSetting.isPending || !selectedSnapshot}
              >
                Restore
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  void handleDeletePatternSnapshot();
                }}
                disabled={updateSetting.isPending || !selectedSnapshot}
              >
                Delete
              </Button>
            </div>
          </div>
          {selectedSnapshot ? (
            <div className='mt-2 text-xs text-gray-500'>
              Selected snapshot: {selectedSnapshot.name} · created {selectedSnapshot.createdAt} · rules {selectedSnapshot.ruleCount}
            </div>
          ) : (
            <div className='mt-2 text-xs text-gray-500'>
              No snapshot selected.
            </div>
          )}
        </div>
        <div className='mt-4 rounded border border-border/60 bg-card/20 p-3'>
          <div className='mb-2 text-[11px] uppercase tracking-wide text-gray-400'>
            Learned Template Lifecycle
          </div>
          {effectiveLearnedTemplates.length === 0 ? (
            <div className='text-xs text-gray-500'>No learned templates yet.</div>
          ) : (
            <div className='max-h-[220px] space-y-2 overflow-auto'>
              {effectiveLearnedTemplates.slice(0, 20).map((template) => (
                <div key={template.id} className='rounded border border-border/50 bg-card/30 p-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='truncate text-xs text-gray-200'>
                      {template.title}
                    </div>
                    <div className='text-[10px] text-gray-500'>
                      {template.segmentType} · approvals {template.approvals}
                    </div>
                  </div>
                  <div className='mt-1 flex items-center justify-between gap-2'>
                    <UnifiedSelect
                      value={template.state}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]'>
        <div className='space-y-4'>
          <FormSection
            title='Source Prompt'
            description='Paste a prompt and explode it into structured segments.'
            variant='subtle'
            className='p-4'
            actions={
              <div className='flex items-center gap-2'>
                <Button type='button' onClick={handleExplode}>
                  Explode Prompt
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleApplyToImageStudio}
                  disabled={!documentState}
                >
                  Apply to Image Studio
                </Button>
              </div>
            }
          >
            <div className='mt-3 space-y-2'>
              <Textarea
                className='min-h-[280px] font-mono text-[12px]'
                value={promptText}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setPromptText(event.target.value);
                }}
                placeholder='Paste prompt text...'
              />
            </div>
          </FormSection>

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
                  {(explosionMetrics.avgConfidence * 100).toFixed(1)}% · low confidence (
                  {'<'}{explosionMetrics.lowConfidenceThreshold.toFixed(2)}):{' '}
                  {explosionMetrics.lowConfidenceCount}
                </div>
                <div>
                  Typed coverage: {(explosionMetrics.typedCoverage * 100).toFixed(1)}%
                </div>
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

          <FormSection
            title='Benchmark Report'
            description='Per-case precision/recall benchmark using current runtime profile and learning settings.'
            variant='subtle'
            className='p-4'
            actions={
              <Button
                type='button'
                variant='outline'
                onClick={handleRunBenchmark}
              >
                Run Benchmark
              </Button>
            }
          >
            <div className='space-y-3'>
              <div className='grid gap-2 md:grid-cols-5'>
                <div className='space-y-1'>
                  <Label className='text-[11px] text-gray-400'>Benchmark Suite</Label>
                  <UnifiedSelect
                    value={benchmarkSuiteDraft}
                    onValueChange={(value: string) => {
                      setBenchmarkSuiteDraft(value as PromptExploderBenchmarkSuite);
                    }}
                    options={[
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
                    ]}
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-[11px] text-gray-400'>Low-Confidence Threshold</Label>
                  <Input
                    type='number'
                    min={0.3}
                    max={0.9}
                    step={0.01}
                    value={clampNumber(benchmarkLowConfidenceThresholdDraft, 0.3, 0.9).toFixed(2)}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (!Number.isFinite(value)) return;
                      setBenchmarkLowConfidenceThresholdDraft(clampNumber(value, 0.3, 0.9));
                    }}
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-[11px] text-gray-400'>Suggestion Limit / Case</Label>
                  <Input
                    type='number'
                    min={1}
                    max={20}
                    step={1}
                    value={String(
                      clampNumber(Math.floor(benchmarkSuggestionLimitDraft), 1, 20)
                    )}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (!Number.isFinite(value)) return;
                      setBenchmarkSuggestionLimitDraft(
                        clampNumber(Math.floor(value), 1, 20)
                      );
                    }}
                  />
                </div>
                <div className='md:col-span-2 rounded border border-border/50 bg-card/20 p-2 text-[11px] text-gray-500'>
                  Suite controls benchmark depth only. Runtime rules/templates still follow the
                  selected Prompt Exploder runtime profile.
                </div>
              </div>
              {benchmarkSuiteDraft === 'custom' ? (
                <div className='space-y-1'>
                  <Label className='text-[11px] text-gray-400'>Custom Benchmark Cases JSON</Label>
                  <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto]'>
                    <Input
                      value={customCaseDraftId}
                      onChange={(event) => setCustomCaseDraftId(event.target.value)}
                      placeholder='Custom case id (optional override)'
                    />
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
                    className='min-h-[180px] font-mono text-[11px]'
                    value={customBenchmarkCasesDraft}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                      setCustomBenchmarkCasesDraft(event.target.value);
                    }}
                    placeholder='[{"id":"case_1","prompt":"...","expectedTypes":["sequence"],"minSegments":1}]'
                  />
                  <div
                    className={`text-[10px] ${parsedCustomBenchmarkCases.ok ? 'text-gray-500' : 'text-red-300'}`}
                  >
                    {parsedCustomBenchmarkCases.ok
                      ? `Valid custom suite: ${parsedCustomBenchmarkCases.cases.length} case(s).`
                      : `Invalid custom suite: ${parsedCustomBenchmarkCases.error}`}
                  </div>
                </div>
              ) : null}
              {!benchmarkReport ? (
                <div className='text-xs text-gray-500'>Run benchmark to generate a report.</div>
              ) : (
                <div className='space-y-2 text-xs text-gray-300'>
                  <div>Generated: {benchmarkReport.generatedAt}</div>
                  <div>
                    Suite: {benchmarkReport.suite} · cases: {benchmarkReport.aggregate.caseCount} ·
                    expected-type recall{' '}
                    {(benchmarkReport.aggregate.expectedTypeRecall * 100).toFixed(1)}% · macro F1{' '}
                    {(benchmarkReport.aggregate.macroF1 * 100).toFixed(1)}% · min-segment pass{' '}
                    {(benchmarkReport.aggregate.minSegmentPassRate * 100).toFixed(1)}%
                  </div>
                  <div>
                    Low-confidence threshold: {benchmarkReport.config.lowConfidenceThreshold.toFixed(2)}{' '}
                    · suggestion cap/case: {benchmarkReport.config.suggestionLimit}
                  </div>
                  <div>
                    Low-confidence segments: {benchmarkReport.aggregate.totalLowConfidenceSegments} ·
                    suggestions: {benchmarkReport.aggregate.totalLowConfidenceSuggestions}
                  </div>
                  <div>
                    Gate (
                    {(PROMPT_EXPLODER_BENCHMARK_RECALL_TARGET * 100).toFixed(0)}% recall):{' '}
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
                    {benchmarkReport.cases.map((caseReport) => (
                      <div
                        key={caseReport.id}
                        className='rounded border border-border/50 bg-card/30 p-2'
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <span className='font-medium text-gray-200'>{caseReport.id}</span>
                          <span className='text-[10px] text-gray-500'>
                            segments {caseReport.segmentCount}/{caseReport.minSegments}
                          </span>
                        </div>
                        <div className='mt-1'>
                          precision {(caseReport.precision * 100).toFixed(1)}% · recall{' '}
                          {(caseReport.recall * 100).toFixed(1)}% · f1{' '}
                          {(caseReport.f1 * 100).toFixed(1)}%
                        </div>
                        <div className='mt-1 text-[10px] text-gray-500'>
                          missing: {caseReport.missingTypes.join(', ') || 'none'} · unexpected:{' '}
                          {caseReport.unexpectedTypes.join(', ') || 'none'} · low confidence:{' '}
                          {caseReport.lowConfidenceSegments}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className='rounded border border-border/50 bg-card/20 p-2'>
                    <div className='mb-2 flex items-center justify-between gap-2'>
                      <div className='text-[11px] uppercase tracking-wide text-gray-400'>
                        Suggested Patterns From Low-Confidence Segments
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            void handleAddBenchmarkSuggestionRules(
                              visibleBenchmarkSuggestions
                            );
                          }}
                          disabled={
                            updateSetting.isPending ||
                            visibleBenchmarkSuggestions.length === 0
                          }
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
                    </div>
                    <div className='mb-2 text-[10px] text-gray-500'>
                      visible {visibleBenchmarkSuggestions.length} / total{' '}
                      {benchmarkSuggestions.length} · dismissed{' '}
                      {dismissedBenchmarkSuggestionIds.length}
                    </div>
                    {visibleBenchmarkSuggestions.length === 0 ? (
                      <div className='text-[11px] text-gray-500'>
                        No visible suggestions in this run.
                      </div>
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
                                {(suggestion.confidence * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div className='mt-1 text-[10px] text-gray-500'>
                              type: {suggestion.segmentType} · matched:{' '}
                              {suggestion.matchedPatternIds.join(', ') || 'none'}
                            </div>
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
                                  disabled={updateSetting.isPending}
                                >
                                  Add Suggested Rule
                                </Button>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  onClick={() => {
                                    handleDismissBenchmarkSuggestion(suggestion.id);
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

          <FormSection
            title='Segments'
            description='Edit segment content and ordering before reassembly.'
            variant='subtle'
            className='p-4'
          >
            {!documentState || documentState.segments.length === 0 ? (
              <EmptyState
                title='No segments yet'
                description='Run Prompt Exploder to generate editable segments.'
              />
            ) : (
              <div className='mt-3 grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]'>
                <div className='max-h-[65vh] space-y-2 overflow-auto rounded border border-border/60 bg-card/20 p-2'>
                  {documentState.segments.map((segment, index) => (
                    <button
                      key={segment.id}
                      type='button'
                      className={`w-full rounded border px-2 py-2 text-left text-xs transition-colors ${selectedSegmentId === segment.id ? 'border-blue-400 bg-blue-500/10 text-gray-100' : 'border-border/50 bg-card/30 text-gray-300 hover:border-blue-300/50'}`}
                      onClick={() => setSelectedSegmentId(segment.id)}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <span className='truncate font-medium'>{segment.title}</span>
                        <span className='rounded border border-border/50 bg-card/50 px-1 py-0.5 text-[10px] uppercase'>
                          {segment.type.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <div className='mt-1 flex items-center justify-between text-[10px] text-gray-500'>
                        <span>Confidence {(segment.confidence * 100).toFixed(0)}%</span>
                        <span>{segment.includeInOutput ? 'Included' : 'Omitted'}</span>
                      </div>
                      <div className='mt-2 flex items-center gap-1'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          disabled={index === 0}
                          onClick={(event) => {
                            event.stopPropagation();
                            replaceSegments(moveByDelta(documentState.segments, index, -1));
                          }}
                        >
                          <ArrowUp className='size-3.5' />
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          disabled={index === documentState.segments.length - 1}
                          onClick={(event) => {
                            event.stopPropagation();
                            replaceSegments(moveByDelta(documentState.segments, index, 1));
                          }}
                        >
                          <ArrowDown className='size-3.5' />
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>

                <div className='max-h-[65vh] space-y-3 overflow-auto rounded border border-border/60 bg-card/20 p-3'>
                  {!selectedSegment ? (
                    <div className='text-sm text-gray-500'>Select a segment to edit.</div>
                  ) : (
                    <>
                      <div className='grid gap-3 md:grid-cols-2'>
                        <div className='space-y-1'>
                          <Label className='text-[11px] text-gray-400'>Type</Label>
                          <UnifiedSelect
                            value={selectedSegment.type}
                            onValueChange={(value: string) => {
                              updateSegment(selectedSegment.id, (current) => ({
                                ...current,
                                type: value as PromptExploderSegment['type'],
                              }));
                            }}
                            options={[
                              { value: 'metadata', label: 'Metadata' },
                              { value: 'assigned_text', label: 'Assigned Text' },
                              { value: 'list', label: 'List' },
                              { value: 'parameter_block', label: 'Parameter Block' },
                              { value: 'referential_list', label: 'Referential List' },
                              { value: 'sequence', label: 'Sequence' },
                              { value: 'hierarchical_list', label: 'Hierarchical List' },
                              { value: 'conditional_list', label: 'Conditional List' },
                              { value: 'qa_matrix', label: 'QA Matrix' },
                            ]}
                          />
                        </div>
                        <div className='space-y-1'>
                          <Label className='text-[11px] text-gray-400'>Include In Output</Label>
                          <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
                            <StatusToggle
                              enabled={selectedSegment.includeInOutput}
                              onToggle={() => {
                                updateSegment(selectedSegment.id, (current) => ({
                                  ...current,
                                  includeInOutput: !current.includeInOutput,
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className='space-y-1'>
                        <Label className='text-[11px] text-gray-400'>Title</Label>
                        <Input
                          value={selectedSegment.title}
                          onChange={(event) => {
                            updateSegment(selectedSegment.id, (current) => ({
                              ...current,
                              title: event.target.value,
                            }));
                          }}
                        />
                      </div>

                      {selectedSegment.type === 'metadata' ? (
                        <div className='space-y-1'>
                          <Label className='text-[11px] text-gray-400'>Metadata Mode</Label>
                          <UnifiedSelect
                            value={selectedSegment.includeInOutput ? 'include' : 'omit'}
                            onValueChange={(value: string) => {
                              updateSegment(selectedSegment.id, (current) => ({
                                ...current,
                                includeInOutput: value === 'include',
                              }));
                            }}
                            options={[
                              { value: 'omit', label: 'Omit from reassembly' },
                              { value: 'include', label: 'Include in reassembly' },
                            ]}
                          />
                        </div>
                      ) : null}

                      {selectedSegment.type === 'parameter_block' ? (
                        <div className='space-y-2'>
                          <Label className='text-[11px] text-gray-400'>Parameters Text</Label>
                          <Textarea
                            className='min-h-[220px] font-mono text-[12px]'
                            value={selectedSegment.paramsText || selectedSegment.text}
                            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                              const nextText = event.target.value;
                              updateSegment(selectedSegment.id, (current) => {
                                const extracted = extractParamsFromPrompt(nextText);
                                return {
                                  ...current,
                                  paramsText: nextText,
                                  text: nextText,
                                  paramsObject: extracted.ok ? extracted.params : null,
                                };
                              });
                            }}
                          />
                        </div>
                      ) : null}

                      {['list', 'referential_list', 'hierarchical_list', 'conditional_list', 'qa_matrix'].includes(
                        selectedSegment.type
                      ) ? (
                          <div className='space-y-2'>
                            <div className='flex items-center justify-between'>
                              <Label className='text-[11px] text-gray-400'>List Items</Label>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  updateSegment(selectedSegment.id, (current) => ({
                                    ...current,
                                    listItems: addBlankListItem(current.listItems),
                                  }));
                                }}
                              >
                                <Plus className='mr-2 size-3.5' />
                              Add Item
                              </Button>
                            </div>
                            {selectedSegment.listItems.length === 0 ? (
                              <div className='text-xs text-gray-500'>No list items detected.</div>
                            ) : null}
                            <div className='space-y-2'>
                              {selectedSegment.listItems.map((item, index) => (
                                <div key={item.id} className='rounded border border-border/50 bg-card/20 p-2'>
                                  <div className='flex items-center gap-1'>
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='icon'
                                      disabled={index === 0}
                                      onClick={() => {
                                        updateSegment(selectedSegment.id, (current) => ({
                                          ...current,
                                          listItems: moveByDelta(current.listItems, index, -1),
                                        }));
                                      }}
                                    >
                                      <ArrowUp className='size-3.5' />
                                    </Button>
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='icon'
                                      disabled={index === selectedSegment.listItems.length - 1}
                                      onClick={() => {
                                        updateSegment(selectedSegment.id, (current) => ({
                                          ...current,
                                          listItems: moveByDelta(current.listItems, index, 1),
                                        }));
                                      }}
                                    >
                                      <ArrowDown className='size-3.5' />
                                    </Button>
                                    <Input
                                      value={item.text}
                                      onChange={(event) => {
                                        updateSegment(selectedSegment.id, (current) => ({
                                          ...current,
                                          listItems: updateListItemText(current.listItems, index, event.target.value),
                                        }));
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                      {selectedSegment.type === 'sequence' ? (
                        <div className='space-y-3'>
                          <div className='flex items-center justify-between'>
                            <div className='text-[11px] uppercase tracking-wide text-gray-400'>
                              Sequence Subsections
                            </div>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                updateSegment(selectedSegment.id, (current) => ({
                                  ...current,
                                  subsections: [...current.subsections, createSubsection()],
                                }));
                              }}
                            >
                              <Plus className='mr-2 size-3.5' />
                              Add Subsection
                            </Button>
                          </div>
                          {selectedSegment.subsections.length === 0 ? (
                            <div className='text-xs text-gray-500'>No subsections detected.</div>
                          ) : null}
                          {selectedSegment.subsections.map((subsection, subsectionIndex) => (
                            <div key={subsection.id} className='space-y-2 rounded border border-border/50 bg-card/20 p-2'>
                              <div className='flex items-center justify-between'>
                                <div className='text-[11px] text-gray-400'>
                                  Subsection {subsectionIndex + 1}
                                </div>
                                <div className='flex items-center gap-1'>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    disabled={subsectionIndex === 0}
                                    onClick={() => {
                                      updateSegment(selectedSegment.id, (current) => ({
                                        ...current,
                                        subsections: moveByDelta(current.subsections, subsectionIndex, -1),
                                      }));
                                    }}
                                  >
                                    <ArrowUp className='size-3.5' />
                                  </Button>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    disabled={subsectionIndex === selectedSegment.subsections.length - 1}
                                    onClick={() => {
                                      updateSegment(selectedSegment.id, (current) => ({
                                        ...current,
                                        subsections: moveByDelta(current.subsections, subsectionIndex, 1),
                                      }));
                                    }}
                                  >
                                    <ArrowDown className='size-3.5' />
                                  </Button>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    onClick={() => {
                                      updateSegment(selectedSegment.id, (current) => ({
                                        ...current,
                                        subsections: current.subsections.filter(
                                          (_, index) => index !== subsectionIndex
                                        ),
                                      }));
                                    }}
                                  >
                                    <Trash2 className='size-3.5' />
                                  </Button>
                                </div>
                              </div>
                              <div className='grid gap-2 md:grid-cols-2'>
                                <Input
                                  value={subsection.title}
                                  onChange={(event) => {
                                    updateSegment(selectedSegment.id, (current) => {
                                      const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                        candidateIndex === subsectionIndex
                                          ? {
                                            ...candidate,
                                            title: event.target.value,
                                          }
                                          : candidate
                                      );
                                      return {
                                        ...current,
                                        subsections: nextSubsections,
                                      };
                                    });
                                  }}
                                  placeholder='Subsection title'
                                />
                                <Input
                                  value={subsection.code ?? ''}
                                  onChange={(event) => {
                                    updateSegment(selectedSegment.id, (current) => {
                                      const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                        candidateIndex === subsectionIndex
                                          ? {
                                            ...candidate,
                                            code: event.target.value.trim().toUpperCase() || null,
                                          }
                                          : candidate
                                      );
                                      return {
                                        ...current,
                                        subsections: nextSubsections,
                                      };
                                    });
                                  }}
                                  placeholder='Reference code (e.g. RL4)'
                                />
                              </div>
                              <Input
                                value={subsection.condition ?? ''}
                                onChange={(event) => {
                                  updateSegment(selectedSegment.id, (current) => {
                                    const nextSubsections = current.subsections.map((candidate, candidateIndex) =>
                                      candidateIndex === subsectionIndex
                                        ? {
                                          ...candidate,
                                          condition: event.target.value.trim() || null,
                                        }
                                        : candidate
                                    );
                                    return {
                                      ...current,
                                      subsections: nextSubsections,
                                    };
                                  });
                                }}
                                placeholder='Condition (optional)'
                              />
                              <div className='space-y-1'>
                                <div className='flex items-center justify-between'>
                                  <div className='text-[11px] text-gray-500'>Items</div>
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={() => {
                                      updateSegment(selectedSegment.id, (current) => {
                                        const nextSubsections = current.subsections.map((candidate, candidateIndex) => {
                                          if (candidateIndex !== subsectionIndex) return candidate;
                                          return {
                                            ...candidate,
                                            items: addBlankListItem(candidate.items),
                                          };
                                        });
                                        return {
                                          ...current,
                                          subsections: nextSubsections,
                                        };
                                      });
                                    }}
                                  >
                                    <Plus className='mr-2 size-3.5' />
                                    Add Item
                                  </Button>
                                </div>
                                {subsection.items.map((item, itemIndex) => (
                                  <div key={item.id} className='flex items-center gap-1'>
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='icon'
                                      disabled={itemIndex === 0}
                                      onClick={() => {
                                        updateSegment(selectedSegment.id, (current) => {
                                          const nextSubsections = current.subsections.map((candidate, candidateIndex) => {
                                            if (candidateIndex !== subsectionIndex) return candidate;
                                            return {
                                              ...candidate,
                                              items: moveByDelta(candidate.items, itemIndex, -1),
                                            };
                                          });
                                          return {
                                            ...current,
                                            subsections: nextSubsections,
                                          };
                                        });
                                      }}
                                    >
                                      <ArrowUp className='size-3.5' />
                                    </Button>
                                    <Button
                                      type='button'
                                      variant='ghost'
                                      size='icon'
                                      disabled={itemIndex === subsection.items.length - 1}
                                      onClick={() => {
                                        updateSegment(selectedSegment.id, (current) => {
                                          const nextSubsections = current.subsections.map((candidate, candidateIndex) => {
                                            if (candidateIndex !== subsectionIndex) return candidate;
                                            return {
                                              ...candidate,
                                              items: moveByDelta(candidate.items, itemIndex, 1),
                                            };
                                          });
                                          return {
                                            ...current,
                                            subsections: nextSubsections,
                                          };
                                        });
                                      }}
                                    >
                                      <ArrowDown className='size-3.5' />
                                    </Button>
                                    <Input
                                      value={item.text}
                                      onChange={(event) => {
                                        updateSegment(selectedSegment.id, (current) => {
                                          const nextSubsections = current.subsections.map((candidate, candidateIndex) => {
                                            if (candidateIndex !== subsectionIndex) return candidate;
                                            return {
                                              ...candidate,
                                              items: updateListItemText(candidate.items, itemIndex, event.target.value),
                                            } as PromptExploderSubsection;
                                          });
                                          return {
                                            ...current,
                                            subsections: nextSubsections,
                                          };
                                        });
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {selectedSegment.type === 'assigned_text' ? (
                        <div className='space-y-2'>
                          <Label className='text-[11px] text-gray-400'>Body</Label>
                          <Textarea
                            className='min-h-[180px] font-mono text-[12px]'
                            value={selectedSegment.text}
                            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                              updateSegment(selectedSegment.id, (current) => ({
                                ...current,
                                text: event.target.value,
                              }));
                            }}
                          />
                        </div>
                      ) : null}

                      <div className='space-y-3 rounded border border-border/60 bg-card/30 p-2 text-[11px] text-gray-400'>
                        <div className='text-[11px] uppercase tracking-wide text-gray-400'>
                          Matched Rule Insights
                        </div>
                        {matchedRuleDetails.length === 0 ? (
                          <div className='text-[11px] text-gray-500'>
                            No matched patterns for this segment.
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            {matchedRuleDetails.map((matchedRule) => (
                              <div
                                key={matchedRule.id}
                                className='rounded border border-border/50 bg-card/20 p-2'
                              >
                                <div className='flex items-center justify-between gap-2'>
                                  <span className='truncate text-[11px] font-medium text-gray-200'>
                                    {matchedRule.title}
                                  </span>
                                  <span className='rounded border border-border/50 bg-card/40 px-1 py-0.5 text-[10px] text-gray-300'>
                                    {matchedRule.segmentType ?? 'no type hint'}
                                  </span>
                                </div>
                                <div className='mt-1 text-[10px] text-gray-500'>
                                  id: <span className='font-mono'>{matchedRule.id}</span> · priority{' '}
                                  {matchedRule.priority} · boost{' '}
                                  {matchedRule.confidenceBoost.toFixed(2)} · heading{' '}
                                  {matchedRule.treatAsHeading ? 'yes' : 'no'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className='border-t border-border/60 pt-3'>
                          <div className='mb-1 text-[11px] uppercase tracking-wide text-gray-400'>
                            Similar Learned Templates
                          </div>
                          <div className='mb-2 text-[10px] text-gray-500'>
                            Merge eligibility: same segment type + score &gt;=
                            {' '}{templateMergeThreshold.toFixed(2)}
                          </div>
                          {similarTemplateCandidates.length === 0 ? (
                            <div className='text-[11px] text-gray-500'>
                              No nearby learned templates for this segment yet.
                            </div>
                          ) : (
                            <div className='space-y-2'>
                              {similarTemplateCandidates.map((candidate) => (
                                <div
                                  key={candidate.id}
                                  className='rounded border border-border/50 bg-card/20 p-2'
                                >
                                  <div className='flex items-center justify-between gap-2'>
                                    <span className='truncate text-[11px] font-medium text-gray-200'>
                                      {candidate.title}
                                    </span>
                                    <span
                                      className={`rounded border px-1 py-0.5 text-[10px] ${
                                        candidate.mergeEligible
                                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                          : 'border-border/50 bg-card/40 text-gray-300'
                                      }`}
                                    >
                                      {candidate.mergeEligible ? 'merge target' : 'candidate'}
                                    </span>
                                  </div>
                                  <div className='mt-1 text-[10px] text-gray-500'>
                                    score {(candidate.score * 100).toFixed(1)}% ·
                                    {' '}type {candidate.segmentType} ·
                                    {' '}state {candidate.state} · approvals {candidate.approvals}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className='border-t border-border/60 pt-3'>
                          <div className='mb-2 text-[11px] uppercase tracking-wide text-gray-400'>
                            Approval Rule Draft
                          </div>
                          <div className='grid gap-2 md:grid-cols-2'>
                            <div className='space-y-1 md:col-span-2'>
                              <Label className='text-[11px] text-gray-400'>Rule Title</Label>
                              <Input
                                value={approvalDraft.ruleTitle}
                                onChange={(event) => {
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    ruleTitle: event.target.value,
                                  }));
                                }}
                              />
                            </div>
                            <div className='space-y-1 md:col-span-2'>
                              <Label className='text-[11px] text-gray-400'>Rule Pattern</Label>
                              <Textarea
                                className='min-h-[70px] font-mono text-[12px]'
                                value={approvalDraft.rulePattern}
                                onChange={(event) => {
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    rulePattern: event.target.value,
                                  }));
                                }}
                              />
                            </div>
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-gray-400'>Segment Type Hint</Label>
                              <UnifiedSelect
                                value={approvalDraft.ruleSegmentType}
                                onValueChange={(value: string) => {
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    ruleSegmentType: value as PromptExploderSegment['type'],
                                  }));
                                }}
                                options={[
                                  { value: 'metadata', label: 'Metadata' },
                                  { value: 'assigned_text', label: 'Assigned Text' },
                                  { value: 'list', label: 'List' },
                                  { value: 'parameter_block', label: 'Parameter Block' },
                                  { value: 'referential_list', label: 'Referential List' },
                                  { value: 'sequence', label: 'Sequence' },
                                  { value: 'hierarchical_list', label: 'Hierarchical List' },
                                  { value: 'conditional_list', label: 'Conditional List' },
                                  { value: 'qa_matrix', label: 'QA Matrix' },
                                ]}
                              />
                            </div>
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-gray-400'>Priority</Label>
                              <Input
                                type='number'
                                min={-50}
                                max={50}
                                step={1}
                                value={String(approvalDraft.rulePriority)}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  if (!Number.isFinite(value)) return;
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    rulePriority: clampNumber(Math.floor(value), -50, 50),
                                  }));
                                }}
                              />
                            </div>
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-gray-400'>Confidence Boost</Label>
                              <Input
                                type='number'
                                min={0}
                                max={0.5}
                                step={0.05}
                                value={approvalDraft.ruleConfidenceBoost.toFixed(2)}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  if (!Number.isFinite(value)) return;
                                  setApprovalDraft((previous) => ({
                                    ...previous,
                                    ruleConfidenceBoost: clampNumber(value, 0, 0.5),
                                  }));
                                }}
                              />
                            </div>
                            <div className='space-y-1'>
                              <Label className='text-[11px] text-gray-400'>Treat As Heading</Label>
                              <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
                                <StatusToggle
                                  enabled={approvalDraft.ruleTreatAsHeading}
                                  onToggle={() => {
                                    setApprovalDraft((previous) => ({
                                      ...previous,
                                      ruleTreatAsHeading: !previous.ruleTreatAsHeading,
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className='mt-2 flex items-center justify-between gap-2 text-[10px] text-gray-500'>
                            <span>Approvals train fuzzy recognition and save this rule draft into validator patterns.</span>
                            <div className='flex items-center gap-2'>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setApprovalDraft(
                                    createApprovalDraftFromSegment(selectedSegment)
                                  );
                                }}
                              >
                                Reset Draft
                              </Button>
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  void handleApproveSelectedSegmentPattern();
                                }}
                                disabled={updateSetting.isPending}
                              >
                                Approve Pattern
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </FormSection>
        </div>

        <div className='space-y-4'>
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
                      <UnifiedSelect
                        value={bindingDraft.type}
                        onValueChange={(value: string) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            type: value as PromptExploderBindingType,
                          }));
                        }}
                        options={[
                          { value: 'depends_on', label: 'Depends On' },
                          { value: 'references', label: 'References' },
                          { value: 'uses_param', label: 'Uses Param' },
                        ]}
                      />
                      <UnifiedSelect
                        value={bindingDraft.fromSegmentId}
                        onValueChange={(value: string) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            fromSegmentId: value,
                            fromSubsectionId: '',
                          }));
                        }}
                        options={segmentOptions}
                      />
                      <UnifiedSelect
                        value={bindingDraft.fromSubsectionId}
                        onValueChange={(value: string) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            fromSubsectionId: value,
                          }));
                        }}
                        options={fromSubsectionOptions}
                      />
                    </div>
                    <div className='grid gap-2 md:grid-cols-2'>
                      <UnifiedSelect
                        value={bindingDraft.toSegmentId}
                        onValueChange={(value: string) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            toSegmentId: value,
                            toSubsectionId: '',
                          }));
                        }}
                        options={segmentOptions}
                      />
                      <UnifiedSelect
                        value={bindingDraft.toSubsectionId}
                        onValueChange={(value: string) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            toSubsectionId: value,
                          }));
                        }}
                        options={toSubsectionOptions}
                      />
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
                      />
                      <Input
                        value={bindingDraft.targetLabel}
                        onChange={(event) => {
                          setBindingDraft((previous) => ({
                            ...previous,
                            targetLabel: event.target.value,
                          }));
                        }}
                        placeholder='Target label (optional)'
                      />
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
                    {documentState.bindings.map((binding) => (
                      <div key={binding.id} className='rounded border border-border/50 bg-card/20 p-2 text-xs'>
                        <div className='flex items-center justify-between gap-2'>
                          <div className='flex items-center gap-2 text-gray-200'>
                            <Link2 className='size-3.5' />
                            <span className='uppercase text-[10px] tracking-wide text-gray-500'>
                              {binding.type.replaceAll('_', ' ')}
                            </span>
                            <span className='rounded border border-border/60 px-1 py-0.5 text-[9px] uppercase text-gray-400'>
                              {binding.origin}
                            </span>
                          </div>
                          {binding.origin === 'manual' ? (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => handleRemoveManualBinding(binding.id)}
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
                          {describeBindingEndpoint(binding.fromSegmentId, binding.fromSubsectionId)} →{' '}
                          {describeBindingEndpoint(binding.toSegmentId, binding.toSubsectionId)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </FormSection>

          <FormSection
            title='Warnings'
            description='Quality checks from the exploder runtime.'
            variant='subtle'
            className='p-4'
          >
            {!documentState || documentState.warnings.length === 0 ? (
              <div className='text-xs text-gray-500'>No warnings.</div>
            ) : (
              <ul className='list-disc pl-5 text-xs text-amber-200'>
                {documentState.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </FormSection>

          <FormSection
            title='Reassembled Prompt'
            description='Preview final output after include/omit and reorder edits.'
            variant='subtle'
            className='p-4'
            actions={
              <Button
                type='button'
                variant='outline'
                onClick={handleApplyToImageStudio}
                disabled={!documentState}
              >
                Apply to Image Studio
              </Button>
            }
          >
            <div className='mt-2'>
              <Textarea
                className='min-h-[420px] font-mono text-[11px]'
                value={documentState?.reassembledPrompt ?? ''}
                readOnly
              />
            </div>
          </FormSection>
        </div>
      </div>
    </div>
  );
}
