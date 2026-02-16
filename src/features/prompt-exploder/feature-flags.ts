const normalizeEnvFlag = (value: string | undefined): boolean | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'off') {
    return false;
  }
  return null;
};

const normalizePercent = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(0, Math.floor(parsed)));
};

const hashSeed = (seed: string): number => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
};

export type PromptExploderOrchestratorRollout = {
  enabled: boolean;
  reason: 'settings' | 'env_override' | 'canary';
  bucket: number;
  canaryPercent: number;
};

export const resolvePromptExploderOrchestratorRollout = (args: {
  settingsEnabled: boolean;
  cohortSeed?: string | null | undefined;
}): PromptExploderOrchestratorRollout => {
  const envOverride = normalizeEnvFlag(
    process.env['NEXT_PUBLIC_PROMPT_VALIDATION_ORCHESTRATOR_V2']
  );
  if (envOverride !== null) {
    return {
      enabled: envOverride,
      reason: 'env_override',
      bucket: 0,
      canaryPercent: envOverride ? 100 : 0,
    };
  }
  if (!args.settingsEnabled) {
    return {
      enabled: false,
      reason: 'settings',
      bucket: 0,
      canaryPercent: 0,
    };
  }

  const canaryPercent = normalizePercent(
    process.env['NEXT_PUBLIC_PROMPT_VALIDATION_ORCHESTRATOR_CANARY_PERCENT']
  );
  if (canaryPercent === null || canaryPercent >= 100) {
    return {
      enabled: true,
      reason: 'settings',
      bucket: 0,
      canaryPercent: 100,
    };
  }
  if (canaryPercent <= 0) {
    return {
      enabled: false,
      reason: 'canary',
      bucket: 0,
      canaryPercent: 0,
    };
  }
  const seed = (args.cohortSeed ?? 'default').trim() || 'default';
  const bucket = hashSeed(seed) % 100;
  return {
    enabled: bucket < canaryPercent,
    reason: 'canary',
    bucket,
    canaryPercent,
  };
};

export const isPromptValidationStrictStackMode = (): boolean => {
  const envOverride = normalizeEnvFlag(
    process.env['NEXT_PUBLIC_PROMPT_VALIDATION_STRICT_STACK_MODE']
  );
  if (envOverride !== null) return envOverride;
  return process.env['NODE_ENV'] !== 'production';
};

export const isPromptExploderOrchestratorEnabled = (
  settingsEnabled: boolean,
  cohortSeed?: string | null
): boolean => {
  return resolvePromptExploderOrchestratorRollout({
    settingsEnabled,
    cohortSeed,
  }).enabled;
};
