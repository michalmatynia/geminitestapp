import type {
  AiPathsValidationCondition,
  AiPathsValidationRule,
} from '@/shared/contracts/ai-paths';

import {
  createAiPathsValidationConditionId,
  createAiPathsValidationRuleId,
  normalizeAiPathsValidationRules,
} from './defaults';

import type { AiPathsDocAssertion, AiPathsDocsSnapshot } from './docs-registry-adapter';

export const DOCS_INFERENCE_COMPILER_VERSION = '2026-02-19.v1';

export type CompileAiPathsRulesFromDocsOptions = {
  status?: 'candidate' | 'approved' | 'rejected' | 'deprecated';
  existingRuleIds?: Iterable<string> | undefined;
  nowIso?: string | undefined;
};

const sanitizeAssertionIdToRuleId = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

const uniqueStringList = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((entry: string): string => entry.trim())
        .filter((entry: string): boolean => entry.length > 0)
    )
  );

const compileConditions = (
  ruleId: string,
  assertion: AiPathsDocAssertion
): AiPathsValidationCondition[] => {
  const usedConditionIds = new Set<string>();
  return assertion.conditions.map((condition, index): AiPathsValidationCondition => {
    const explicitConditionId =
      typeof condition.id === 'string' && condition.id.trim().length > 0 ? condition.id.trim() : '';
    const conditionId = explicitConditionId
      ? explicitConditionId
      : createAiPathsValidationConditionId(
          `${ruleId}_${condition.operator}_${index + 1}`,
          usedConditionIds
        );
    usedConditionIds.add(conditionId);
    return {
      ...condition,
      id: conditionId,
    };
  });
};

const compileRuleFromAssertion = (
  assertion: AiPathsDocAssertion,
  snapshot: AiPathsDocsSnapshot,
  existingRuleIds: Set<string>,
  status: NonNullable<AiPathsValidationRule['inference']>['status'],
  nowIso: string
): AiPathsValidationRule => {
  const desiredBaseId = sanitizeAssertionIdToRuleId(assertion.id);
  const candidateId = desiredBaseId.length > 0 ? desiredBaseId : assertion.id.trim();
  const ruleId = existingRuleIds.has(candidateId)
    ? createAiPathsValidationRuleId(assertion.id, existingRuleIds)
    : candidateId;
  existingRuleIds.add(ruleId);

  const docsBindings = uniqueStringList([...(assertion.docsBindings ?? []), assertion.sourcePath]);
  const tags = uniqueStringList(assertion.tags ?? []);
  const deprecates = uniqueStringList(assertion.deprecates ?? []);

  const forceProbabilityIfFailed =
    typeof assertion.forceProbabilityIfFailed === 'number' &&
    Number.isFinite(assertion.forceProbabilityIfFailed)
      ? Math.max(0, Math.min(100, Math.trunc(assertion.forceProbabilityIfFailed)))
      : undefined;

  return {
    id: ruleId,
    title: assertion.title,
    enabled: status === 'approved',
    severity: assertion.severity,
    module: assertion.module,
    ...(assertion.appliesToNodeTypes?.length
      ? { appliesToNodeTypes: uniqueStringList(assertion.appliesToNodeTypes) }
      : {}),
    sequence:
      typeof assertion.sequenceHint === 'number' && Number.isFinite(assertion.sequenceHint)
        ? Math.max(1, Math.trunc(assertion.sequenceHint))
        : undefined,
    conditionMode: assertion.conditionMode === 'any' ? 'any' : 'all',
    conditions: compileConditions(ruleId, assertion),
    ...(typeof assertion.weight === 'number' && Number.isFinite(assertion.weight)
      ? { weight: Math.max(0, Math.trunc(assertion.weight)) }
      : {}),
    ...(forceProbabilityIfFailed !== undefined ? { forceProbabilityIfFailed } : {}),
    ...(assertion.description?.trim() ? { description: assertion.description.trim() } : {}),
    ...(assertion.recommendation?.trim()
      ? { recommendation: assertion.recommendation.trim() }
      : {}),
    ...(docsBindings.length > 0 ? { docsBindings } : {}),
    inference: {
      sourceType: 'central_docs',
      status,
      assertionId: assertion.id,
      sourcePath: assertion.sourcePath,
      sourceHash: assertion.sourceHash,
      docsSnapshotHash: snapshot.snapshotHash,
      ...(typeof assertion.confidence === 'number' ? { confidence: assertion.confidence } : {}),
      compilerVersion: DOCS_INFERENCE_COMPILER_VERSION,
      inferredAt: nowIso,
      ...(tags.length > 0 ? { tags } : {}),
      ...(deprecates.length > 0 ? { deprecates } : {}),
    },
  };
};

export const compileAiPathsValidationRulesFromDocsSnapshot = (
  snapshot: AiPathsDocsSnapshot,
  options?: CompileAiPathsRulesFromDocsOptions
): AiPathsValidationRule[] => {
  const status = options?.status ?? 'candidate';
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const existingRuleIds = new Set<string>();
  for (const ruleId of options?.existingRuleIds ?? []) {
    if (typeof ruleId === 'string' && ruleId.trim().length > 0) {
      existingRuleIds.add(ruleId.trim());
    }
  }

  const compiled = snapshot.assertions
    .slice()
    .sort((left, right) => {
      const leftSequence =
        typeof left.sequenceHint === 'number' && Number.isFinite(left.sequenceHint)
          ? left.sequenceHint
          : Number.MAX_SAFE_INTEGER;
      const rightSequence =
        typeof right.sequenceHint === 'number' && Number.isFinite(right.sequenceHint)
          ? right.sequenceHint
          : Number.MAX_SAFE_INTEGER;
      if (leftSequence !== rightSequence) return leftSequence - rightSequence;
      return left.id.localeCompare(right.id);
    })
    .map(
      (assertion: AiPathsDocAssertion): AiPathsValidationRule =>
        compileRuleFromAssertion(assertion, snapshot, existingRuleIds, status, nowIso)
    );
  return normalizeAiPathsValidationRules(compiled);
};

export const approveInferredAiPathsValidationRule = (
  rule: AiPathsValidationRule,
  options?: { approvedBy?: string | undefined; approvedAt?: string | undefined }
): AiPathsValidationRule => {
  const approvedAt = options?.approvedAt ?? new Date().toISOString();
  const approvedBy = options?.approvedBy?.trim() || 'ui';
  return {
    ...rule,
    enabled: true,
    inference: {
      ...(rule.inference ?? {}),
      sourceType: rule.inference?.sourceType ?? 'central_docs',
      status: 'approved',
      approvedAt,
      approvedBy,
    },
  };
};

export const rejectInferredAiPathsValidationRule = (
  rule: AiPathsValidationRule,
  reviewNote?: string | undefined
): AiPathsValidationRule => {
  const normalizedNote = reviewNote?.trim();
  return {
    ...rule,
    enabled: false,
    inference: {
      ...(rule.inference ?? {}),
      sourceType: rule.inference?.sourceType ?? 'central_docs',
      status: 'rejected',
      ...(normalizedNote ? { reviewNote: normalizedNote } : {}),
    },
  };
};
