'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAiPathsSettingsQuery } from '@/features/ai/ai-paths/hooks/useAiPathQueries';
import type {
  AiPathsValidationConfig,
  AiPathsValidationRule,
  PathConfig,
  PathMeta,
} from '@/features/ai/ai-paths/lib';
import {
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
} from '@/features/ai/ai-paths/lib/core/constants';
import {
  AI_PATHS_NODE_DOCS as NODE_DOCS_LIST,
  type AiPathsNodeDoc,
} from '@/features/ai/ai-paths/lib/core/docs/node-docs';
import {
  approveInferredAiPathsValidationRule,
  buildAiPathsValidationRulesFromDocs,
  evaluateAiPathsValidationPreflight,
  normalizeAiPathsValidationConfig,
  rejectInferredAiPathsValidationRule,
} from '@/features/ai/ai-paths/lib/core/validation-engine';
import { updateAiPathsSettingsBulk } from '@/features/ai/ai-paths/lib/settings-store-client';
import { useToast } from '@/shared/ui';

import {
  parseAiPathsSettings,
  serializeDocsSources,
  serializeCollectionMap,
  parseRulesDraft,
  getAssertionIdFromRule,
  getSourceHashFromRule,
  getCandidateTags,
  uniqueStringList,
  parseDocsSourcesText,
  parseCollectionMapText,
  type CentralDocsSnapshotPayload,
  type CentralDocsSnapshotResponse,
  type CandidateChangeKind,
} from '../pages/AdminAiPathsValidationUtils';

export function useAdminAiPathsValidationState() {
  const searchParams = useSearchParams();
  const requestedPathId = searchParams?.get('pathId')?.trim() ?? '';
  const focusNodeId = searchParams?.get('focusNodeId')?.trim() ?? '';
  const focusNodeType = searchParams?.get('focusNodeType')?.trim() ?? '';
  const { toast } = useToast();
  const settingsQuery = useAiPathsSettingsQuery();

  const parsedSettings = useMemo(
    () => parseAiPathsSettings(settingsQuery.data ?? []),
    [settingsQuery.data],
  );

  const [selectedPathId, setSelectedPathId] = useState<string>('');
  const [validationDraft, setValidationDraft] =
    useState<AiPathsValidationConfig>(
      normalizeAiPathsValidationConfig(undefined),
    );
  const [docsSourcesDraft, setDocsSourcesDraft] = useState<string>('');
  const [collectionMapDraft, setCollectionMapDraft] = useState<string>('');
  const [rulesDraft, setRulesDraft] = useState<string>('[]');
  const [rulesDraftError, setRulesDraftError] = useState<string | null>(null);
  const [docsSearch, setDocsSearch] = useState<string>('');
  const [candidateTagFilter, setCandidateTagFilter] = useState<string>('all');
  const [candidateModuleFilter, setCandidateModuleFilter] =
    useState<string>('all');
  const [saving, setSaving] = useState<boolean>(false);
  const [syncingCentralDocs, setSyncingCentralDocs] = useState<boolean>(false);
  const [centralSnapshot, setCentralSnapshot] =
    useState<CentralDocsSnapshotPayload | null>(null);

  useEffect(() => {
    if (parsedSettings.pathMetas.length === 0) {
      setSelectedPathId('');
      return;
    }
    setSelectedPathId((previous: string) => {
      if (previous && parsedSettings.pathConfigs[previous]) return previous;
      if (requestedPathId && parsedSettings.pathConfigs[requestedPathId]) {
        return requestedPathId;
      }
      return parsedSettings.pathMetas[0]?.id ?? '';
    });
  }, [parsedSettings.pathConfigs, parsedSettings.pathMetas, requestedPathId]);

  const selectedPathConfig = useMemo(
    () =>
      selectedPathId
        ? (parsedSettings.pathConfigs[selectedPathId] ?? null)
        : null,
    [parsedSettings.pathConfigs, selectedPathId],
  );
  const persistedValidation = useMemo(
    () =>
      normalizeAiPathsValidationConfig(selectedPathConfig?.aiPathsValidation),
    [selectedPathConfig],
  );
  const persistedSignature = useMemo(
    () => JSON.stringify(persistedValidation),
    [persistedValidation],
  );

  useEffect(() => {
    if (!selectedPathConfig) return;
    setValidationDraft(persistedValidation);
    setDocsSourcesDraft(
      serializeDocsSources(persistedValidation.docsSources ?? []),
    );
    setCollectionMapDraft(
      serializeCollectionMap(persistedValidation.collectionMap ?? {}),
    );
    setRulesDraft(JSON.stringify(persistedValidation.rules ?? [], null, 2));
    setRulesDraftError(null);
    setCentralSnapshot(null);
  }, [persistedSignature, selectedPathConfig, persistedValidation]);

  const pathOptions = useMemo(
    () =>
      parsedSettings.pathMetas.map((meta: PathMeta) => ({
        value: meta.id,
        label: `${meta.name} (${meta.id.slice(0, 8)})`,
      })),
    [parsedSettings.pathMetas],
  );

  const validationPolicyValue = useMemo(() => {
    const policy = validationDraft.policy;
    if (
      policy === 'report_only' ||
      policy === 'warn_below_threshold' ||
      policy === 'block_below_threshold'
    ) {
      return policy;
    }
    return 'block_below_threshold';
  }, [validationDraft.policy]);

  const filteredNodeDocs = useMemo(() => {
    const query = docsSearch.trim().toLowerCase();
    if (!query) return NODE_DOCS_LIST;
    return NODE_DOCS_LIST.filter((doc: AiPathsNodeDoc) => {
      const haystack = [
        doc.type,
        doc.title,
        doc.purpose,
        doc.inputs.join(' '),
        doc.outputs.join(' '),
        doc.config
          .map(
            (entry: { path: string; description: string }) =>
              `${entry.path} ${entry.description}`,
          )
          .join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [docsSearch]);

  const sortedRules = useMemo(() => {
    const rules = [...(validationDraft.rules ?? [])];
    rules.sort((left, right) => {
      const leftSequence =
        typeof left.sequence === 'number' ? left.sequence : 0;
      const rightSequence =
        typeof right.sequence === 'number' ? right.sequence : 0;
      if (leftSequence !== rightSequence) return leftSequence - rightSequence;
      return left.id.localeCompare(right.id);
    });
    return rules;
  }, [validationDraft.rules]);

  const filteredRules = useMemo(() => {
    if (!focusNodeType) return sortedRules;
    return sortedRules.filter((rule: AiPathsValidationRule) => {
      if (!rule.appliesToNodeTypes || rule.appliesToNodeTypes.length === 0)
        return true;
      return rule.appliesToNodeTypes.includes(focusNodeType);
    });
  }, [focusNodeType, sortedRules]);

  const inferredCandidates = useMemo(
    () => [...(validationDraft.inferredCandidates ?? [])],
    [validationDraft.inferredCandidates],
  );
  const centralRuleByAssertionId = useMemo(() => {
    const map = new Map<string, AiPathsValidationRule>();
    (validationDraft.rules ?? []).forEach((rule: AiPathsValidationRule) => {
      const assertionId = getAssertionIdFromRule(rule);
      if (!assertionId) return;
      map.set(assertionId, rule);
    });
    return map;
  }, [validationDraft.rules]);

  const candidateChangeKindById = useMemo(() => {
    const map = new Map<string, CandidateChangeKind>();
    inferredCandidates.forEach((rule: AiPathsValidationRule) => {
      const assertionId = getAssertionIdFromRule(rule);
      if (!assertionId) {
        map.set(rule.id, 'new');
        return;
      }
      const existing = centralRuleByAssertionId.get(assertionId);
      if (!existing) {
        map.set(rule.id, 'new');
        return;
      }
      const nextSourceHash = getSourceHashFromRule(rule);
      const previousSourceHash = getSourceHashFromRule(existing);
      if (
        nextSourceHash &&
        previousSourceHash &&
        nextSourceHash !== previousSourceHash
      ) {
        map.set(rule.id, 'changed');
        return;
      }
      map.set(rule.id, 'existing');
    });
    return map;
  }, [centralRuleByAssertionId, inferredCandidates]);

  const candidateModuleOptions = useMemo(
    () => [
      { value: 'all', label: 'All Modules' },
      ...Array.from(
        new Set(
          inferredCandidates.map(
            (rule: AiPathsValidationRule): string => rule.module,
          ),
        ),
      )
        .sort((left: string, right: string) => left.localeCompare(right))
        .map((module: string) => ({
          value: module,
          label: module,
        })),
    ],
    [inferredCandidates],
  );

  const candidateTagOptions = useMemo(
    () => [
      { value: 'all', label: 'All Tags' },
      ...Array.from(
        new Set(
          inferredCandidates.flatMap((rule: AiPathsValidationRule): string[] =>
            getCandidateTags(rule),
          ),
        ),
      )
        .sort((left: string, right: string) => left.localeCompare(right))
        .map((tag: string) => ({
          value: tag,
          label: tag,
        })),
    ],
    [inferredCandidates],
  );

  const candidateRules = useMemo(
    () =>
      inferredCandidates
        .filter(
          (rule: AiPathsValidationRule): boolean =>
            (rule.inference?.status ?? 'candidate') === 'candidate',
        )
        .filter((rule: AiPathsValidationRule): boolean => {
          if (candidateModuleFilter === 'all') return true;
          return rule.module === candidateModuleFilter;
        })
        .filter((rule: AiPathsValidationRule): boolean => {
          if (candidateTagFilter === 'all') return true;
          return getCandidateTags(rule).includes(candidateTagFilter);
        })
        .sort((left, right) => left.id.localeCompare(right.id)),
    [candidateModuleFilter, candidateTagFilter, inferredCandidates],
  );
  const rejectedCandidates = useMemo(
    () =>
      inferredCandidates
        .filter(
          (rule: AiPathsValidationRule): boolean =>
            (rule.inference?.status ?? 'candidate') === 'rejected',
        )
        .sort((left, right) => left.id.localeCompare(right.id)),
    [inferredCandidates],
  );

  const candidateChangeStats = useMemo(() => {
    const stats: Record<string, number> = { new: 0, changed: 0, existing: 0 };
    candidateRules.forEach((rule: AiPathsValidationRule) => {
      const kind = candidateChangeKindById.get(rule.id) ?? 'new';
      stats[kind] = (stats[kind] ?? 0) + 1;
    });
    return stats;
  }, [candidateChangeKindById, candidateRules]);

  const validatorCoverage = useMemo(() => {
    const coveredNodeTypes = new Set<string>();
    (validationDraft.rules ?? [])
      .filter((rule: AiPathsValidationRule): boolean => rule.enabled !== false)
      .forEach((rule: AiPathsValidationRule) => {
        (rule.appliesToNodeTypes ?? []).forEach((nodeType: string) =>
          coveredNodeTypes.add(nodeType),
        );
      });
    const docsNodeTypes = NODE_DOCS_LIST.map((doc: AiPathsNodeDoc) => doc.type);
    const uncoveredNodeTypes = docsNodeTypes.filter(
      (nodeType: string): boolean => !coveredNodeTypes.has(nodeType),
    );
    return {
      coveredCount: coveredNodeTypes.size,
      totalCount: docsNodeTypes.length,
      uncoveredNodeTypes,
    };
  }, [validationDraft.rules]);
  const syncWarnings = validationDraft.docsSyncState?.lastSyncWarnings ?? [];

  const validationReport = useMemo(() => {
    if (!selectedPathConfig) return null;
    return evaluateAiPathsValidationPreflight({
      nodes: selectedPathConfig.nodes ?? [],
      edges: selectedPathConfig.edges ?? [],
      config: validationDraft,
    });
  }, [selectedPathConfig, validationDraft]);

  const draftSignature = useMemo(
    () => JSON.stringify(validationDraft),
    [validationDraft],
  );
  const isDirty = draftSignature !== persistedSignature;

  const updateDraft = useCallback(
    (patch: Partial<AiPathsValidationConfig>): void => {
      setValidationDraft((previous: AiPathsValidationConfig) =>
        normalizeAiPathsValidationConfig({
          ...previous,
          ...patch,
        }),
      );
    },
    [],
  );

  const setDraftRules = useCallback(
    (nextRules: AiPathsValidationRule[]): void => {
      updateDraft({ rules: nextRules });
      setRulesDraft(JSON.stringify(nextRules, null, 2));
      setRulesDraftError(null);
    },
    [updateDraft],
  );

  const applyDocsSources = useCallback(
    (nextSources: string[]): void => {
      const normalized = parseDocsSourcesText(nextSources.join('\n'));
      setDocsSourcesDraft(serializeDocsSources(normalized));
      updateDraft({ docsSources: normalized });
    },
    [updateDraft],
  );

  const handleApplyDocsSources = useCallback((): void => {
    applyDocsSources(parseDocsSourcesText(docsSourcesDraft));
    toast('Docs sources applied to AI-Paths validator.', {
      variant: 'success',
    });
  }, [applyDocsSources, docsSourcesDraft, toast]);

  const handleApplyCollectionMap = useCallback((): void => {
    const parsedMap = parseCollectionMapText(collectionMapDraft);
    setCollectionMapDraft(serializeCollectionMap(parsedMap));
    updateDraft({ collectionMap: parsedMap });
    toast('Entity-to-collection map applied.', { variant: 'success' });
  }, [collectionMapDraft, updateDraft, toast]);

  const handleApplyRulesDraft = useCallback((): boolean => {
    const parsed = parseRulesDraft(rulesDraft);
    if (!parsed.ok) {
      setRulesDraftError(parsed.error);
      toast(parsed.error, { variant: 'error' });
      return false;
    }
    setDraftRules(parsed.value);
    toast(`Applied ${parsed.value.length} validation rules.`, {
      variant: 'success',
    });
    return true;
  }, [rulesDraft, setDraftRules, toast]);

  const handleRebuildRulesFromDocs = useCallback((): void => {
    const scopedSources = parseDocsSourcesText(docsSourcesDraft);
    const rebuiltRules = buildAiPathsValidationRulesFromDocs(scopedSources);
    updateDraft({
      docsSources: scopedSources,
      rules: rebuiltRules,
    });
    setDocsSourcesDraft(serializeDocsSources(scopedSources));
    setRulesDraft(JSON.stringify(rebuiltRules, null, 2));
    setRulesDraftError(null);
    toast(`Rebuilt ${rebuiltRules.length} rules from docs sources.`, {
      variant: 'success',
    });
  }, [docsSourcesDraft, updateDraft, toast]);

  const handleResetToDefaults = useCallback((): void => {
    const defaultConfig = normalizeAiPathsValidationConfig(undefined);
    setValidationDraft(defaultConfig);
    setDocsSourcesDraft(serializeDocsSources(defaultConfig.docsSources ?? []));
    setCollectionMapDraft(
      serializeCollectionMap(defaultConfig.collectionMap ?? {}),
    );
    setRulesDraft(JSON.stringify(defaultConfig.rules ?? [], null, 2));
    setRulesDraftError(null);
    toast('Reset draft to default AI-Paths validator profile.', {
      variant: 'info',
    });
  }, [toast]);

  const handleToggleRuleEnabled = useCallback(
    (ruleId: string): void => {
      const nextRules = (validationDraft.rules ?? []).map(
        (rule: AiPathsValidationRule) =>
          rule.id === ruleId
            ? { ...rule, enabled: rule.enabled === false }
            : rule,
      );
      setDraftRules(nextRules);
    },
    [setDraftRules, validationDraft.rules],
  );

  const handleRuleSequenceBlur = useCallback(
    (ruleId: string, rawValue: string): void => {
      const parsed = Number.parseInt(rawValue, 10);
      if (!Number.isFinite(parsed)) return;
      const nextRules = (validationDraft.rules ?? []).map(
        (rule: AiPathsValidationRule) =>
          rule.id === ruleId ? { ...rule, sequence: parsed } : rule,
      );
      setDraftRules(nextRules);
    },
    [setDraftRules, validationDraft.rules],
  );

  const handleSyncFromCentralDocs = useCallback(async (): Promise<void> => {
    setSyncingCentralDocs(true);
    try {
      const response = await fetch('/api/ai-paths/validation/docs-snapshot', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Central docs sync failed (${response.status}).`);
      }
      const payload = (await response.json()) as CentralDocsSnapshotResponse;
      if (!payload?.snapshot || !Array.isArray(payload?.inferredCandidates)) {
        throw new Error('Central docs sync returned invalid payload.');
      }

      const rejectedAssertionIds = new Set<string>(
        (validationDraft.inferredCandidates ?? [])
          .filter(
            (rule: AiPathsValidationRule): boolean =>
              rule.inference?.status === 'rejected',
          )
          .map((rule: AiPathsValidationRule): string | null => {
            const assertionId = rule.inference?.assertionId;
            return typeof assertionId === 'string' &&
              assertionId.trim().length > 0
              ? assertionId.trim()
              : null;
          })
          .filter((value: string | null): value is string => Boolean(value)),
      );

      const mergedCandidates = payload.inferredCandidates.map(
        (candidate: AiPathsValidationRule): AiPathsValidationRule => {
          const assertionId = candidate.inference?.assertionId ?? null;
          if (!assertionId || !rejectedAssertionIds.has(assertionId)) {
            return candidate;
          }
          return rejectInferredAiPathsValidationRule(
            candidate,
            'Previously rejected during docs sync review.',
          );
        },
      );

      const incomingByAssertionId = new Map<string, AiPathsValidationRule>();
      mergedCandidates.forEach((candidate: AiPathsValidationRule) => {
        const assertionId = getAssertionIdFromRule(candidate);
        if (!assertionId) return;
        incomingByAssertionId.set(assertionId, candidate);
      });

      const previousRules = [...(validationDraft.rules ?? [])];
      const nextRules = [...previousRules];
      const autoDeprecatedRuleIds = new Set<string>();
      const staleWarnings: string[] = [];

      mergedCandidates.forEach((candidate: AiPathsValidationRule) => {
        const deprecates = uniqueStringList(
          candidate.inference?.deprecates ?? [],
        );
        if (deprecates.length === 0) return;
        const assertionId = getAssertionIdFromRule(candidate) ?? candidate.id;
        deprecates.forEach((deprecatedAssertionId: string) => {
          const index = nextRules.findIndex(
            (rule: AiPathsValidationRule): boolean =>
              getAssertionIdFromRule(rule) === deprecatedAssertionId,
          );
          if (index < 0) return;
          const targetRule = nextRules[index];
          if (!targetRule) return;
          autoDeprecatedRuleIds.add(targetRule.id);
          nextRules[index] = {
            ...targetRule,
            enabled: false,
            inference: {
              ...(targetRule.inference ?? {}),
              sourceType: targetRule.inference?.sourceType ?? 'central_docs',
              status: 'deprecated',
              reviewNote: `Deprecated by assertion ${assertionId}.`,
            },
          };
          staleWarnings.push(
            `Rule "${targetRule.title}" is deprecated by central assertion "${assertionId}".`,
          );
        });
      });

      previousRules.forEach((rule: AiPathsValidationRule) => {
        if (rule.inference?.sourceType !== 'central_docs') return;
        const assertionId = getAssertionIdFromRule(rule);
        if (!assertionId) return;
        const incoming = incomingByAssertionId.get(assertionId);
        if (!incoming) {
          if (!autoDeprecatedRuleIds.has(rule.id)) {
            staleWarnings.push(
              `Rule "${rule.title}" is no longer present in central docs snapshot.`,
            );
          }
          return;
        }
        const previousHash = getSourceHashFromRule(rule);
        const incomingHash = getSourceHashFromRule(incoming);
        if (previousHash && incomingHash && previousHash !== incomingHash) {
          staleWarnings.push(
            `Rule "${rule.title}" changed in central docs and should be reviewed.`,
          );
        }
      });

      const combinedWarnings = uniqueStringList([
        ...payload.snapshot.warnings,
        ...staleWarnings,
      ]);

      if (JSON.stringify(nextRules) !== JSON.stringify(previousRules)) {
        setDraftRules(nextRules);
      }

      setCentralSnapshot(payload.snapshot);
      updateDraft({
        inferredCandidates: mergedCandidates,
        docsSyncState: {
          lastSnapshotHash: payload.snapshot.snapshotHash,
          lastSyncedAt: payload.snapshot.generatedAt,
          lastSyncStatus: combinedWarnings.length > 0 ? 'warning' : 'success',
          lastSyncWarnings: combinedWarnings,
          sourceCount: payload.snapshot.sources.length,
          candidateCount: mergedCandidates.filter(
            (rule: AiPathsValidationRule): boolean =>
              (rule.inference?.status ?? 'candidate') === 'candidate',
          ).length,
        },
      });
      toast(
        `Synced ${mergedCandidates.length} inferred validation candidates from central docs.`,
        { variant: combinedWarnings.length > 0 ? 'warning' : 'success' },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to sync central docs.';
      updateDraft({
        docsSyncState: {
          ...(validationDraft.docsSyncState ?? {}),
          lastSyncStatus: 'error',
          lastSyncWarnings: [message],
        },
      });
      toast(message, { variant: 'error' });
    } finally {
      setSyncingCentralDocs(false);
    }
  }, [
    setDraftRules,
    toast,
    updateDraft,
    validationDraft.docsSyncState,
    validationDraft.inferredCandidates,
    validationDraft.rules,
  ]);

  const handleApproveCandidate = useCallback(
    (candidateRuleId: string): void => {
      const candidates = validationDraft.inferredCandidates ?? [];
      const candidate = candidates.find(
        (rule: AiPathsValidationRule): boolean => rule.id === candidateRuleId,
      );
      if (!candidate) return;
      const approved = approveInferredAiPathsValidationRule(candidate);
      const nextRules = [...(validationDraft.rules ?? [])];
      const existingRuleIndex = nextRules.findIndex(
        (rule: AiPathsValidationRule): boolean => rule.id === approved.id,
      );
      if (existingRuleIndex >= 0) {
        nextRules[existingRuleIndex] = approved;
      } else {
        nextRules.push(approved);
      }
      const nextCandidates = candidates.filter(
        (rule: AiPathsValidationRule): boolean => rule.id !== candidateRuleId,
      );
      setDraftRules(nextRules);
      updateDraft({
        inferredCandidates: nextCandidates,
        docsSyncState: {
          ...(validationDraft.docsSyncState ?? {}),
          candidateCount: nextCandidates.filter(
            (rule: AiPathsValidationRule): boolean =>
              (rule.inference?.status ?? 'candidate') === 'candidate',
          ).length,
        },
      });
      toast(`Approved inferred rule "${approved.title}".`, {
        variant: 'success',
      });
    },
    [
      setDraftRules,
      toast,
      updateDraft,
      validationDraft.docsSyncState,
      validationDraft.inferredCandidates,
      validationDraft.rules,
    ],
  );

  const handleRejectCandidate = useCallback(
    (candidateRuleId: string): void => {
      const nextCandidates = (validationDraft.inferredCandidates ?? []).map(
        (rule: AiPathsValidationRule): AiPathsValidationRule =>
          rule.id === candidateRuleId
            ? rejectInferredAiPathsValidationRule(rule)
            : rule,
      );
      updateDraft({
        inferredCandidates: nextCandidates,
        docsSyncState: {
          ...(validationDraft.docsSyncState ?? {}),
          candidateCount: nextCandidates.filter(
            (rule: AiPathsValidationRule): boolean =>
              (rule.inference?.status ?? 'candidate') === 'candidate',
          ).length,
        },
      });
      toast('Candidate marked as rejected.', { variant: 'info' });
    },
    [
      updateDraft,
      validationDraft.docsSyncState,
      validationDraft.inferredCandidates,
      toast,
    ],
  );

  const handleApproveAllCandidates = useCallback((): void => {
    if (candidateRules.length === 0) return;
    const approvedRules = candidateRules.map((rule: AiPathsValidationRule) =>
      approveInferredAiPathsValidationRule(rule),
    );
    const approvedRuleIds = new Set<string>(
      approvedRules.map((rule: AiPathsValidationRule): string => rule.id),
    );
    const nextRules = [...(validationDraft.rules ?? [])];
    approvedRules.forEach((approvedRule: AiPathsValidationRule) => {
      const index = nextRules.findIndex(
        (existingRule: AiPathsValidationRule): boolean =>
          existingRule.id === approvedRule.id,
      );
      if (index >= 0) {
        nextRules[index] = approvedRule;
      } else {
        nextRules.push(approvedRule);
      }
    });
    const nextCandidates = (validationDraft.inferredCandidates ?? []).filter(
      (rule: AiPathsValidationRule): boolean => !approvedRuleIds.has(rule.id),
    );
    setDraftRules(nextRules);
    updateDraft({
      inferredCandidates: nextCandidates,
      docsSyncState: {
        ...(validationDraft.docsSyncState ?? {}),
        candidateCount: 0,
      },
    });
    toast(`Approved ${approvedRules.length} visible inferred rules.`, {
      variant: 'success',
    });
  }, [
    candidateRules,
    setDraftRules,
    toast,
    updateDraft,
    validationDraft.docsSyncState,
    validationDraft.inferredCandidates,
    validationDraft.rules,
  ]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!selectedPathConfig || !selectedPathId) return;
    const normalizedRulesText = JSON.stringify(
      validationDraft.rules ?? [],
      null,
      2,
    ).trim();
    const rulesDraftText = rulesDraft.trim();
    const rulesFromDraft =
      rulesDraftText.length > 0 && rulesDraftText !== normalizedRulesText
        ? parseRulesDraft(rulesDraft)
        : null;
    if (rulesFromDraft && !rulesFromDraft.ok) {
      setRulesDraftError(rulesFromDraft.error);
      toast(rulesFromDraft.error, { variant: 'error' });
      return;
    }
    const effectiveRules = rulesFromDraft?.ok
      ? rulesFromDraft.value
      : (validationDraft.rules ?? []);

    const now = new Date().toISOString();
    const nextValidation = normalizeAiPathsValidationConfig({
      ...validationDraft,
      docsSources: parseDocsSourcesText(docsSourcesDraft),
      collectionMap: parseCollectionMapText(collectionMapDraft),
      rules: effectiveRules,
      lastEvaluatedAt: now,
    });
    const nextPathConfig: PathConfig = {
      ...selectedPathConfig,
      updatedAt: now,
      aiPathsValidation: nextValidation,
    };
    const nextPathMetas = parsedSettings.pathMetas.map(
      (meta: PathMeta): PathMeta => {
        if (meta.id !== selectedPathId) return meta;
        return {
          ...meta,
          name: nextPathConfig.name,
          updatedAt: now,
        };
      },
    );

    setSaving(true);
    try {
      await updateAiPathsSettingsBulk([
        {
          key: `${PATH_CONFIG_PREFIX}${selectedPathId}`,
          value: JSON.stringify(nextPathConfig),
        },
        {
          key: PATH_INDEX_KEY,
          value: JSON.stringify(nextPathMetas),
        },
      ]);
      await settingsQuery.refetch();
      toast('AI-Paths Node Validator settings saved.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save AI-Paths validator settings.',
        {
          variant: 'error',
        },
      );
    } finally {
      setSaving(false);
    }
  }, [
    selectedPathConfig,
    selectedPathId,
    validationDraft,
    rulesDraft,
    docsSourcesDraft,
    collectionMapDraft,
    parsedSettings.pathMetas,
    toast,
    settingsQuery,
  ]);

  return {
    requestedPathId,
    focusNodeId,
    focusNodeType,
    settingsQuery,
    parsedSettings,
    selectedPathId,
    setSelectedPathId,
    validationDraft,
    updateDraft,
    docsSourcesDraft,
    setDocsSourcesDraft,
    collectionMapDraft,
    setCollectionMapDraft,
    rulesDraft,
    setRulesDraft,
    rulesDraftError,
    docsSearch,
    setDocsSearch,
    candidateTagFilter,
    setCandidateTagFilter,
    candidateModuleFilter,
    setCandidateModuleFilter,
    saving,
    syncingCentralDocs,
    centralSnapshot,
    selectedPathConfig,
    pathOptions,
    validationPolicyValue,
    filteredNodeDocs,
    sortedRules,
    filteredRules,
    inferredCandidates,
    candidateModuleOptions,
    candidateTagOptions,
    candidateRules,
    candidateChangeKindById,
    rejectedCandidates,
    candidateChangeStats,
    validatorCoverage,
    syncWarnings,
    validationReport,
    isDirty,
    handleApplyDocsSources,
    handleApplyCollectionMap,
    handleApplyRulesDraft,
    handleRebuildRulesFromDocs,
    handleResetToDefaults,
    handleToggleRuleEnabled,
    handleRuleSequenceBlur,
    handleSyncFromCentralDocs,
    handleApproveCandidate,
    handleRejectCandidate,
    handleApproveAllCandidates,
    handleSave,
  };
}
