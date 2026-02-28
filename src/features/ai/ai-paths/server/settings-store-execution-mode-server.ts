import type { PathExecutionMode } from '@/shared/contracts/ai-paths-runtime';

type PathConfigLike = Record<string, unknown> & {
  executionMode?: PathExecutionMode | string | null;
  updatedAt?: string | null;
};

const parsePathConfig = (raw: string | null | undefined): PathConfigLike | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as PathConfigLike;
  } catch {
    return null;
  }
};

export const needsServerExecutionModeConfigUpgrade = (raw: string | null | undefined): boolean => {
  const parsed = parsePathConfig(raw);
  if (!parsed) return false;
  return parsed.executionMode !== 'server';
};

export const upgradeServerExecutionModeConfig = (
  raw: string,
  options?: { updatedAt?: string }
): string | null => {
  const parsed = parsePathConfig(raw);
  if (!parsed) return null;
  if (parsed.executionMode === 'server' && !options?.updatedAt) return null;

  const next: PathConfigLike = {
    ...parsed,
    executionMode: 'server',
  };
  if (options?.updatedAt) {
    next.updatedAt = options.updatedAt;
  }
  const serialized = JSON.stringify(next);
  return serialized === raw ? null : serialized;
};
