import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

import { getValidationPatternRepository } from '@/features/products/server';
import {
  invalidateValidationPatternRuntimeCache,
  listValidationPatternsCached,
} from '@/shared/lib/products/services/validation-pattern-runtime-cache';
import {
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationSkipNoopReplacementProposal,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { validateRegexSafety } from '@/shared/utils/regex-safety';
import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { validateAndNormalizeRuntimeConfig } from '@/features/products/validations/validator-runtime-config';
import { createProductValidationPatternSchema as createPatternSchema } from '@/shared/contracts/products';
export { createPatternSchema };
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const assertValidRegex = (regexSource: string, flags: string | null | undefined): void => {
  const safety = validateRegexSafety(regexSource, flags);
  if (!safety.ok) {
    throw badRequestError(safety.message, {
      code: safety.code,
      detail: safety.detail ?? null,
      regex: regexSource,
      flags: flags ?? null,
    });
  }
  try {
    const normalizedFlags = flags?.trim() || undefined;
    // Compile once on write to avoid persisting invalid rules.
    void new RegExp(regexSource, normalizedFlags);
  } catch (error) {
    throw badRequestError('Invalid regex or flags', {
      regex: regexSource,
      flags: flags ?? null,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
};

const assertValidReplacementRecipe = (
  replacementEnabled: boolean,
  replacementValue: string | null
): void => {
  if (!replacementEnabled || !replacementValue) return;
  const recipe = parseDynamicReplacementRecipe(replacementValue);
  if (!recipe) return;

  if (recipe.sourceRegex) {
    assertValidRegex(recipe.sourceRegex, recipe.sourceFlags ?? null);
  }
  if (recipe.logicOperator === 'regex') {
    if (!recipe.logicOperand) {
      throw badRequestError('Dynamic replacement regex condition requires an operand.');
    }
    assertValidRegex(recipe.logicOperand, recipe.logicFlags ?? null);
  }
};

const assertValidLaunchConfig = ({
  launchEnabled,
  launchOperator,
  launchValue,
  launchFlags,
}: {
  launchEnabled: boolean;
  launchOperator: z.infer<typeof createPatternSchema>['launchOperator'] | undefined;
  launchValue: string | null;
  launchFlags: string | null;
}): void => {
  if (!launchEnabled || launchOperator !== 'regex') return;
  if (!launchValue) {
    throw badRequestError('launchValue is required when launchOperator is regex.');
  }
  assertValidRegex(launchValue, launchFlags);
};

const canResolveReplacementAtRuntime = ({
  replacementEnabled,
  replacementValue,
  runtimeEnabled,
  runtimeType,
}: {
  replacementEnabled: boolean;
  replacementValue: string | null;
  runtimeEnabled: boolean;
  runtimeType: 'none' | 'database_query' | 'ai_prompt';
}): boolean => replacementEnabled && !replacementValue && runtimeEnabled && runtimeType !== 'none';

const normalizeReplacementFields = (fields: string[] | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  return [...new Set(fields)];
};

const isNameSecondSegmentDimensionPattern = (pattern: {
  target: string;
  replacementEnabled: boolean;
  replacementValue: string | null;
}): boolean => {
  if (pattern.target !== 'size_length' && pattern.target !== 'length') return false;
  if (!pattern.replacementEnabled || !pattern.replacementValue) return false;
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
  if (!recipe) return false;
  return (
    recipe.sourceMode === 'form_field' &&
    recipe.sourceField === 'name_en' &&
    recipe.targetApply === 'replace_whole_field'
  );
};

const getPatternSequence = (
  pattern: { sequence?: number | null | undefined },
  fallbackIndex: number
): number => {
  if (typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)) {
    return Math.max(0, Math.floor(pattern.sequence));
  }
  return (fallbackIndex + 1) * 10;
};

export async function getValidatorPatternsHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const patterns = await listValidationPatternsCached();
  const indexedPatterns = patterns.map((pattern, index) => ({ pattern, index }));
  const dimensionEntries = indexedPatterns.filter(({ pattern }) =>
    isNameSecondSegmentDimensionPattern(pattern)
  );
  const staleDimensionEntries = dimensionEntries.filter(
    ({ pattern }) =>
      Boolean(pattern.sequenceGroupId?.trim()) ||
      Boolean(pattern.sequenceGroupLabel?.trim()) ||
      (pattern.sequenceGroupDebounceMs ?? 0) !== 0
  );

  const mirrorEntries = indexedPatterns.filter(({ pattern }) => {
    const label = pattern.sequenceGroupLabel?.trim().toLowerCase() ?? '';
    return label === 'name en -> pl mirror';
  });

  const mirrorWindow =
    mirrorEntries.length > 1
      ? {
          min: Math.min(
            ...mirrorEntries.map(({ pattern, index }) => getPatternSequence(pattern, index))
          ),
          max: Math.max(
            ...mirrorEntries.map(({ pattern, index }) => getPatternSequence(pattern, index))
          ),
        }
      : null;

  const interleavedDimensionEntries = mirrorWindow
    ? dimensionEntries.filter(({ pattern, index }) => {
        const sequence = getPatternSequence(pattern, index);
        return sequence > mirrorWindow.min && sequence < mirrorWindow.max;
      })
    : [];

  if (staleDimensionEntries.length === 0 && interleavedDimensionEntries.length === 0) {
    return NextResponse.json(patterns);
  }

  const repository = await getValidationPatternRepository();
  const updates = new Map<
    string,
    {
      sequenceGroupId?: null;
      sequenceGroupLabel?: null;
      sequenceGroupDebounceMs?: number;
      sequence?: number;
    }
  >();

  for (const { pattern } of staleDimensionEntries) {
    const existing = updates.get(pattern.id) ?? {};
    updates.set(pattern.id, {
      ...existing,
      sequenceGroupId: null,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
    });
  }

  if (interleavedDimensionEntries.length > 0) {
    const maxSequence = indexedPatterns.reduce(
      (max, { pattern, index }) => Math.max(max, getPatternSequence(pattern, index)),
      0
    );
    let nextSequence = maxSequence + 10;
    const sortedInterleaved = [...interleavedDimensionEntries].sort(
      (left, right) =>
        getPatternSequence(left.pattern, left.index) -
        getPatternSequence(right.pattern, right.index)
    );
    for (const { pattern } of sortedInterleaved) {
      const existing = updates.get(pattern.id) ?? {};
      updates.set(pattern.id, {
        ...existing,
        sequenceGroupId: null,
        sequenceGroupLabel: null,
        sequenceGroupDebounceMs: 0,
        sequence: nextSequence,
      });
      nextSequence += 10;
    }
  }

  for (const [patternId, data] of updates) {
    await repository.updatePattern(patternId, data);
  }
  invalidateValidationPatternRuntimeCache();
  const refreshedPatterns = await repository.listPatterns();
  return NextResponse.json(refreshedPatterns);
}

export async function postValidatorPatternsHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof createPatternSchema>;
  const label = body.label.trim();
  const locale = body.locale?.trim().toLowerCase() || null;
  const regex = body.regex.trim();
  const flags = body.flags?.trim() || null;
  const message = body.message.trim();
  const replacementEnabled = body.replacementEnabled ?? false;
  const replacementAutoApply = body.replacementAutoApply ?? false;
  const skipNoopReplacementProposal = normalizeProductValidationSkipNoopReplacementProposal(
    body.skipNoopReplacementProposal
  );
  const replacementValue = body.replacementValue?.trim() || null;
  const replacementFields = normalizeReplacementFields(body.replacementFields);
  const replacementAppliesToScopes = normalizeProductValidationPatternReplacementScopes(
    body.replacementAppliesToScopes,
    body.appliesToScopes
  );
  const runtimeEnabled = body.runtimeEnabled ?? false;
  const runtimeType = body.runtimeType ?? 'none';
  const runtimeConfig = validateAndNormalizeRuntimeConfig({
    runtimeEnabled,
    runtimeType,
    runtimeConfig: body.runtimeConfig?.trim() || null,
  });
  const postAcceptBehavior = body.postAcceptBehavior ?? 'revalidate';
  const denyBehaviorOverride = normalizeProductValidationPatternDenyBehaviorOverride(
    body.denyBehaviorOverride
  ) as 'ask_again' | 'mute_session' | null;
  const validationDebounceMs = body.validationDebounceMs ?? 0;
  const sequenceGroupId = body.sequenceGroupId?.trim() || null;
  const sequenceGroupLabel = body.sequenceGroupLabel?.trim() || null;
  const sequenceGroupDebounceMs = body.sequenceGroupDebounceMs ?? 0;
  const launchEnabled = body.launchEnabled ?? false;
  const launchAppliesToScopes = normalizeProductValidationPatternLaunchScopes(
    body.launchAppliesToScopes,
    body.appliesToScopes
  );
  const launchSourceMode = body.launchSourceMode ?? 'current_field';
  const launchScopeBehavior = normalizeProductValidationLaunchScopeBehavior(
    body.launchScopeBehavior
  );
  const launchSourceField = body.launchSourceField?.trim() || null;
  const launchOperator = body.launchOperator ?? 'equals';
  const launchValue = typeof body.launchValue === 'string' ? body.launchValue : null;
  const launchFlags = body.launchFlags?.trim() || null;
  const appliesToScopes = normalizeProductValidationPatternScopes(body.appliesToScopes);
  if (
    replacementEnabled &&
    !replacementValue &&
    !canResolveReplacementAtRuntime({
      replacementEnabled,
      replacementValue,
      runtimeEnabled,
      runtimeType,
    })
  ) {
    throw badRequestError(
      'replacementValue is required when replacementEnabled is true unless runtime replacement is enabled'
    );
  }
  if (launchEnabled && launchSourceMode !== 'current_field' && !launchSourceField) {
    throw badRequestError(
      'launchSourceField is required when launchSourceMode is not current_field'
    );
  }

  assertValidRegex(regex, flags);
  assertValidReplacementRecipe(replacementEnabled, replacementValue);
  assertValidLaunchConfig({
    launchEnabled,
    launchOperator,
    launchValue,
    launchFlags,
  });
  const repository = await getValidationPatternRepository();
  const pattern = await repository.createPattern({
    label,
    target: body.target,
    locale,
    regex,
    flags,
    message,
    severity: body.severity ?? 'error',
    enabled: body.enabled ?? true,
    replacementEnabled,
    replacementAutoApply,
    skipNoopReplacementProposal,
    replacementValue,
    replacementFields,
    replacementAppliesToScopes,
    runtimeEnabled,
    runtimeType,
    runtimeConfig,
    postAcceptBehavior,
    denyBehaviorOverride,
    validationDebounceMs,
    sequenceGroupId,
    sequenceGroupLabel,
    sequenceGroupDebounceMs,
    sequence: body.sequence ?? null,
    chainMode: body.chainMode ?? 'continue',
    maxExecutions: body.maxExecutions ?? 1,
    passOutputToNext: body.passOutputToNext ?? true,
    launchEnabled,
    launchAppliesToScopes,
    launchScopeBehavior,
    launchSourceMode,
    launchSourceField,
    launchOperator,
    launchValue,
    launchFlags,
    appliesToScopes,
  });

  invalidateValidationPatternRuntimeCache();

  return NextResponse.json(pattern, { status: 201 });
}
