import {
  type ModelProfileDto as ModelProfile,
  type ModelTaskRuleDto as ModelTaskRule,
  type ExtendedModelProfile,
} from '@/shared/contracts/chatbot';

export const parseModelSize = (normalized: string): number | null => {
  const mixMatch: RegExpMatchArray | null = normalized.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)b/);
  if (mixMatch) {
    return Number(mixMatch[1]) * Number(mixMatch[2]);
  }
  const sizeMatch: RegExpMatchArray | null = normalized.match(/(\d+(?:\.\d+)?)b/);
  if (sizeMatch) return Number(sizeMatch[1]);
  if (normalized.includes('xxl')) return 34;
  if (normalized.includes('xlarge') || normalized.includes('xl')) return 13;
  if (normalized.includes('large')) return 13;
  if (normalized.includes('medium')) return 7;
  if (normalized.includes('small') || normalized.includes('mini')) return 3;
  if (normalized.includes('tiny')) return 1.5;
  return null;
};

export const buildModelProfile = (name: string): ExtendedModelProfile => {
  const normalized: string = name.toLowerCase();
  const isEmbedding: boolean = [
    'embed',
    'embedding',
    'text-embedding',
    'nomic-embed',
    'bge',
    'e5',
    'gte',
  ].some((tag: string): boolean => normalized.includes(tag));
  const isRerank: boolean = ['rerank', 'reranker', 'cross-encoder'].some((tag: string): boolean =>
    normalized.includes(tag)
  );
  const isVision: boolean = [
    'vision',
    'llava',
    'bakllava',
    'minicpm',
    'moondream',
    'qwen-vl',
    'cogvlm',
  ].some((tag: string): boolean => normalized.includes(tag));
  const isCode: boolean = ['code', 'coder', 'codestral', 'codeqwen', 'starcoder', 'codegen'].some(
    (tag: string): boolean => normalized.includes(tag)
  );
  const isInstruct: boolean = ['instruct', 'assistant'].some((tag: string): boolean =>
    normalized.includes(tag)
  );
  const isChat: boolean = normalized.includes('chat');
  const isReasoning: boolean =
    normalized.includes('reasoner') || /(^|[^a-z0-9])r1($|[^a-z0-9])/.test(normalized);

  return {
    id: name,
    name,
    provider: 'ollama',
    capabilities: [],
    contextWindow: 4096,
    maxOutputTokens: 2048,
    normalized,
    size: parseModelSize(normalized),
    isEmbedding,
    isRerank,
    isVision,
    isCode,
    isInstruct,
    isChat,
    isReasoning,
  };
};

export const buildModelProfileFromObject = (profile: ModelProfile): ExtendedModelProfile => {
  const base = buildModelProfile(profile.name);
  return {
    ...base,
    ...profile,
    isEmbedding: profile.isEmbedding || base.isEmbedding,
  };
};

export const scoreModelForTask = (profile: ExtendedModelProfile, rule: ModelTaskRule): number => {
  if (profile.isEmbedding || profile.isRerank) return Number.NEGATIVE_INFINITY;
  const size: number = profile.size ?? 7;
  let score: number = 0;
  if (profile.isInstruct || profile.isChat) score += 1;
  if (profile.isReasoning) score += rule.preferReasoning ? 1.2 : 0.3;
  if (profile.isVision) score -= 1.5;
  if (profile.isCode) score -= 0.4;
  if (rule.preferLarge) score += size * 0.35;
  if (rule.preferSmall) score += (10 - size) * 0.25;
  if (rule.targetSize) score -= Math.abs(size - rule.targetSize) * 0.7;
  if (rule.minSize && size < rule.minSize) {
    score -= (rule.minSize - size) * 0.9;
  }
  if (rule.maxSize && size > rule.maxSize) {
    score -= (size - rule.maxSize) * 0.4;
  }
  return score;
};

export const pickBestModel = (
  profiles: readonly ModelProfile[],
  rule: ModelTaskRule
): string | null => {
  let bestName: string | null = null;
  let bestScore: number = Number.NEGATIVE_INFINITY;
  let bestSize: number = -1;

  for (const rawProfile of profiles) {
    const profile = buildModelProfileFromObject(rawProfile);
    const score: number = scoreModelForTask(profile, rule);
    if (!Number.isFinite(score)) continue;

    const size: number = profile.size ?? 0;

    if (bestName === null || score > bestScore || (score === bestScore && size > bestSize)) {
      bestName = profile.name;
      bestScore = score;
      bestSize = size;
    }
  }

  return bestName;
};
