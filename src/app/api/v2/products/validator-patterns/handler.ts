import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getValidationPatternRepository } from '@/features/products/server';
import { validateAndNormalizeRuntimeConfig } from '@/features/products/server';
import { createProductValidationPatternSchema as createPatternSchema } from '@/shared/contracts/products/validation';
export { createPatternSchema };
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
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
import { normalizeProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-state';
import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { validateRegexSafety } from '@/shared/utils/regex-safety';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


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
    void ErrorSystem.captureException(error);
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

export async function getValidatorPatternsHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  return NextResponse.json(await listValidationPatternsCached());
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
    body.replacementAppliesToScopes
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
    body.launchAppliesToScopes
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
  const semanticState = normalizeProductValidationSemanticState(body.semanticState);
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
    semanticState,
  }, {
    semanticAuditSource: 'manual_save',
  });

  invalidateValidationPatternRuntimeCache();

  return NextResponse.json(pattern, { status: 201 });
}
