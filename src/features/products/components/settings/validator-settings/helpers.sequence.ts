import type { SequenceGroupView } from '@/shared/contracts/products/drafts';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';

export const DEFAULT_SEQUENCE_STEP = 10;

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.buildduplicatelabel
 */
export const buildDuplicateLabel = (label: string, existingLabels: Set<string>): string => {
  const trimmed = label.trim().length > 0 ? label.trim() : 'Pattern';
  const base = `${trimmed} (copy)`;
  let candidate = base;
  let counter = 2;
  while (existingLabels.has(candidate.toLowerCase())) {
    candidate = `${base} ${counter}`;
    counter += 1;
  }
  return candidate;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.builduniquelabel
 */
export const buildUniqueLabel = (label: string, existingLabels: Set<string>): string => {
  const trimmed = label.trim().length > 0 ? label.trim() : 'Pattern';
  let candidate = trimmed;
  let counter = 2;
  while (existingLabels.has(candidate.toLowerCase())) {
    candidate = `${trimmed} ${counter}`;
    counter += 1;
  }
  return candidate;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.getpatternsequence
 */
export const getPatternSequence = (
  pattern: ProductValidationPattern,
  fallbackIndex: number
): number => {
  if (typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)) {
    return Math.max(0, Math.floor(pattern.sequence));
  }
  return (fallbackIndex + 1) * DEFAULT_SEQUENCE_STEP;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.getsequencegroupid
 */
export const getSequenceGroupId = (pattern: ProductValidationPattern): string | null => {
  const value = pattern.sequenceGroupId?.trim();
  return value !== undefined && value.length > 0 ? value : null;
};

const getSequenceScopeKey = (pattern: ProductValidationPattern): string | null => {
  const groupId = getSequenceGroupId(pattern);
  if (groupId === null) return null;
  const normalizedLocale = pattern.locale?.trim().toLowerCase() ?? '*';
  return `${groupId}::${pattern.target}::${normalizedLocale}`;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.sortpatternsbysequence
 */
export const sortPatternsBySequence = (
  patterns: ProductValidationPattern[]
): ProductValidationPattern[] =>
  patterns
    .map((pattern, index) => ({ pattern, index }))
    .sort((a, b) => {
      const sequenceDelta =
        getPatternSequence(a.pattern, a.index) - getPatternSequence(b.pattern, b.index);
      if (sequenceDelta !== 0) return sequenceDelta;
      if (a.pattern.target !== b.pattern.target) {
        return a.pattern.target.localeCompare(b.pattern.target);
      }
      return a.pattern.label.localeCompare(b.pattern.label);
    })
    .map((entry) => entry.pattern);

export const sortRuleDraftsBySequence = sortPatternsBySequence;

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.reorderpatterns
 */
export const reorderPatterns = (
  patterns: ProductValidationPattern[],
  draggedId: string,
  targetId: string
): ProductValidationPattern[] | null => {
  if (draggedId === targetId) return null;
  const fromIndex = patterns.findIndex((pattern) => pattern.id === draggedId);
  const targetIndex = patterns.findIndex((pattern) => pattern.id === targetId);
  if (fromIndex < 0 || targetIndex < 0) return null;

  let insertIndex = targetIndex + 1;
  if (fromIndex < insertIndex) insertIndex -= 1;
  if (insertIndex === fromIndex) return null;

  const next = [...patterns];
  const [dragged] = next.splice(fromIndex, 1);
  if (dragged === undefined) return null;
  next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, dragged);
  return next;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.createsequencegroupid
 */
export const createSequenceGroupId = (): string => {
  const random = Math.random().toString(36).slice(2, 8);
  return `seq_${Date.now().toString(36)}_${random}`;
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.normalizesequencegroupdebouncems
 */
export const normalizeSequenceGroupDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

const countEnabledSequenceScope = (
  counts: Map<string, number>,
  pattern: ProductValidationPattern
): void => {
  if (!pattern.enabled) return;
  const scopeKey = getSequenceScopeKey(pattern);
  if (scopeKey === null) return;
  counts.set(scopeKey, (counts.get(scopeKey) ?? 0) + 1);
};

const hasSharedSequenceScope = (
  counts: Map<string, number>,
  pattern: ProductValidationPattern
): boolean => {
  const scopeKey = getSequenceScopeKey(pattern);
  return scopeKey !== null && (counts.get(scopeKey) ?? 0) > 1;
};

const updateExistingSequenceGroup = (
  current: SequenceGroupView,
  pattern: ProductValidationPattern
): SequenceGroupView => {
  const label = pattern.sequenceGroupLabel?.trim();
  const nextLabel =
    current.label.length === 0 && label !== undefined && label.length > 0 ? label : current.label;
  return {
    ...current,
    label: nextLabel,
    patternIds: [...current.patternIds, pattern.id],
  };
};

const buildSequenceGroupView = (
  groupId: string,
  pattern: ProductValidationPattern
): SequenceGroupView => {
  const label = pattern.sequenceGroupLabel?.trim();
  return {
    id: groupId,
    label: label !== undefined && label.length > 0 ? label : 'Sequence / Group',
    debounceMs: normalizeSequenceGroupDebounceMs(pattern.sequenceGroupDebounceMs),
    patternIds: [pattern.id],
  };
};

/**
 * Validator docs: see docs/validator/function-reference.md#helpers.buildsequencegroups
 */
export const buildSequenceGroups = (
  patterns: ProductValidationPattern[]
): Map<string, SequenceGroupView> => {
  const sequenceScopeCounts = new Map<string, number>();
  patterns.forEach((pattern) => countEnabledSequenceScope(sequenceScopeCounts, pattern));

  const groups = new Map<string, SequenceGroupView>();
  for (const pattern of patterns) {
    const groupId = getSequenceGroupId(pattern);
    if (groupId === null || !hasSharedSequenceScope(sequenceScopeCounts, pattern)) continue;
    const current = groups.get(groupId);
    if (current !== undefined) {
      groups.set(groupId, updateExistingSequenceGroup(current, pattern));
      continue;
    }
    groups.set(groupId, buildSequenceGroupView(groupId, pattern));
  }
  return groups;
};
