import type {
  PromptExploderLearnedTemplate,
  PromptExploderSegmentType,
} from './types';

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export type TemplateMergeMode = 'auto' | 'new' | 'target';
export type TemplateUpsertErrorCode =
  | 'TARGET_TEMPLATE_NOT_FOUND'
  | 'TARGET_TEMPLATE_TYPE_MISMATCH';

export type TemplateSimilarityMatch = {
  template: PromptExploderLearnedTemplate;
  score: number;
};

export type TemplateUpsertResult =
  | {
      ok: true;
      nextTemplates: PromptExploderLearnedTemplate[];
      nextTemplate: PromptExploderLearnedTemplate;
      existingTemplate: PromptExploderLearnedTemplate | null;
      exactTemplate: PromptExploderLearnedTemplate | null;
      targetedTemplate: PromptExploderLearnedTemplate | null;
      similarTemplateMatch: TemplateSimilarityMatch | null;
      mergeMessage: string;
      mergeOutcome: 'forced_new' | 'selected_target' | 'exact' | 'similar' | 'created';
    }
  | {
      ok: false;
      errorCode: TemplateUpsertErrorCode;
      errorMessage: string;
    };

type CreateTemplateIdArgs = {
  segmentType: PromptExploderSegmentType;
  title: string;
  existingTemplateIds: Set<string>;
};

export type UpsertLearnedTemplateArgs = {
  templates: PromptExploderLearnedTemplate[];
  segmentType: PromptExploderSegmentType;
  title: string;
  sourceText: string;
  sampleText: string;
  similarityThreshold: number;
  minApprovalsForMatching: number;
  autoActivateLearnedTemplates: boolean;
  mergeMode?: TemplateMergeMode;
  targetTemplateId?: string | null;
  now?: string;
  createTemplateId?: (args: CreateTemplateIdArgs) => string;
};

const ensureUniqueTemplateId = (baseId: string, knownIds: Set<string>): string => {
  let nextId = baseId.trim() || 'template';
  while (knownIds.has(nextId)) {
    nextId = `${nextId}_x`;
  }
  return nextId;
};

const defaultCreateTemplateId = (args: CreateTemplateIdArgs): string => {
  const baseId = `template_${args.segmentType}_${Date.now().toString(36)}`;
  return ensureUniqueTemplateId(baseId, args.existingTemplateIds);
};

export const normalizeLearningText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const learningTokens = (value: string): string[] => {
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

export const templateSimilarityScore = (
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

export const mergeTemplateAnchorTokens = (
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

export const mergeTemplateSampleText = (existing: string, incoming: string): string => {
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

export const findSimilarTemplateMatch = (args: {
  templates: PromptExploderLearnedTemplate[];
  segmentType: PromptExploderLearnedTemplate['segmentType'];
  sourceText: string;
  similarityThreshold: number;
}): TemplateSimilarityMatch | null => {
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

export const deriveTemplateStateAfterApproval = (args: {
  existingState: PromptExploderLearnedTemplate['state'] | null;
  nextApprovals: number;
  minApprovalsForMatching: number;
  autoActivateLearnedTemplates: boolean;
}): PromptExploderLearnedTemplate['state'] => {
  const approvalThreshold = clampNumber(args.minApprovalsForMatching, 1, 20);
  if (args.autoActivateLearnedTemplates && args.nextApprovals >= approvalThreshold) {
    return 'active';
  }
  if (args.existingState === 'active') return 'active';
  if (args.existingState === 'draft') return 'draft';
  return 'candidate';
};

export const upsertLearnedTemplate = (args: UpsertLearnedTemplateArgs): TemplateUpsertResult => {
  const mergeMode = args.mergeMode ?? 'auto';
  const now = args.now ?? new Date().toISOString();
  const normalizedTitle = normalizeLearningText(args.title);
  const sourceText = args.sourceText.trim();
  const sampleText = args.sampleText.trim();
  const existingTemplateIds = new Set(args.templates.map((template) => template.id));
  const createTemplateId = args.createTemplateId ?? defaultCreateTemplateId;

  const exactTemplate = args.templates.find((template) => {
    return (
      template.segmentType === args.segmentType &&
      template.normalizedTitle === normalizedTitle
    );
  }) ?? null;

  const similarTemplateMatch =
    mergeMode === 'auto' && !exactTemplate
      ? findSimilarTemplateMatch({
        templates: args.templates,
        segmentType: args.segmentType,
        sourceText,
        similarityThreshold: args.similarityThreshold,
      })
      : null;

  const targetedTemplate =
    mergeMode === 'target'
      ? args.templates.find((template) => template.id === args.targetTemplateId) ?? null
      : null;

  if (mergeMode === 'target') {
    if (!targetedTemplate) {
      return {
        ok: false,
        errorCode: 'TARGET_TEMPLATE_NOT_FOUND',
        errorMessage: 'Selected merge target template no longer exists.',
      };
    }
    if (targetedTemplate.segmentType !== args.segmentType) {
      return {
        ok: false,
        errorCode: 'TARGET_TEMPLATE_TYPE_MISMATCH',
        errorMessage: 'Selected merge target has a different segment type.',
      };
    }
  }

  const existingTemplate: PromptExploderLearnedTemplate | null =
    mergeMode === 'new'
      ? null
      : mergeMode === 'target'
        ? targetedTemplate
        : (exactTemplate ?? similarTemplateMatch?.template ?? null);

  const existingApprovals = existingTemplate?.approvals;
  const currentApprovalsCount = typeof existingApprovals === 'number' ? existingApprovals : 0;
  const nextApprovals = currentApprovalsCount + 1;
  const nextState = deriveTemplateStateAfterApproval({
    existingState: (typeof existingTemplate?.state === 'string' ? existingTemplate.state : null) as PromptExploderLearnedTemplate['state'] | null,
    nextApprovals,
    minApprovalsForMatching: args.minApprovalsForMatching,
    autoActivateLearnedTemplates: args.autoActivateLearnedTemplates,
  });

  const nextTemplateId =
    existingTemplate?.id ??
    ensureUniqueTemplateId(
      createTemplateId({
        segmentType: args.segmentType,
        title: args.title,
        existingTemplateIds,
      }),
      existingTemplateIds
    );

  const nextTemplate: PromptExploderLearnedTemplate = existingTemplate
    ? {
      ...existingTemplate,
      approvals: nextApprovals,
      state: nextState,
      updatedAt: now,
      anchorTokens: mergeTemplateAnchorTokens(
        existingTemplate.anchorTokens,
        learningTokens(sourceText)
      ),
      sampleText: mergeTemplateSampleText(existingTemplate.sampleText, sampleText),
    }
    : {
      id: nextTemplateId,
      segmentType: args.segmentType,
      state: nextState,
      title: args.title,
      normalizedTitle,
      anchorTokens: learningTokens(sourceText),
      sampleText,
      approvals: 1,
      createdAt: now,
      updatedAt: now,
    };

  const nextTemplates = existingTemplate
    ? args.templates.map((template) =>
      template.id === existingTemplate.id ? nextTemplate : template
    )
    : [...args.templates, nextTemplate];

  const mergeOutcome =
    mergeMode === 'new'
      ? 'forced_new'
      : mergeMode === 'target' && targetedTemplate
        ? 'selected_target'
        : exactTemplate
          ? 'exact'
          : similarTemplateMatch
            ? 'similar'
            : 'created';

  const mergeMessage =
    mergeOutcome === 'forced_new'
      ? 'forced new template'
      : mergeOutcome === 'selected_target'
        ? `merged into selected template (${targetedTemplate?.title ?? args.title})`
        : mergeOutcome === 'exact'
          ? 'updated existing template'
          : mergeOutcome === 'similar'
            ? `merged into similar template (${((similarTemplateMatch?.score ?? 0) * 100).toFixed(1)}% match)`
            : 'created new template';

  return {
    ok: true,
    nextTemplates,
    nextTemplate,
    existingTemplate,
    exactTemplate,
    targetedTemplate,
    similarTemplateMatch,
    mergeMessage,
    mergeOutcome,
  };
};
