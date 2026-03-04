import { NextRequest, NextResponse } from 'next/server';

import { getValidationPatternRepository } from '@/features/products/server';
import { invalidateValidationPatternRuntimeCache } from '@/shared/lib/products/services/validation-pattern-runtime-cache';
import {
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
  normalizeProductValidationSkipNoopReplacementProposal,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { validateRegexSafety } from '@/shared/utils/regex-safety';
import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { validateAndNormalizeRuntimeConfig } from '@/features/products/validations/validator-runtime-config';
import type {
  CreateProductValidationPatternInput,
  ProductValidationPattern,
  ProductValidationRuntimeType,
  UpdateProductValidationPatternInput,
} from '@/shared/contracts/products';
import {
  productValidatorImportRequestSchema,
  type ProductValidatorImportError,
  type ProductValidatorImportPattern,
  type ProductValidatorImportRequest,
  type ProductValidatorImportResult,
  type ProductValidatorImportOperation,
} from '@/shared/contracts/validator-import';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

type PlannedAction = 'create' | 'update' | 'delete' | 'skip';

type PlannedOperation = {
  action: PlannedAction;
  code?: string;
  label: string;
  patternId: string | null;
  reason?: string | null;
  createData?: CreateProductValidationPatternInput;
  updateData?: UpdateProductValidationPatternInput;
};

type SequenceAssignment = {
  sequenceGroupId: string | null;
  sequenceGroupLabel: string | null;
  sequenceGroupDebounceMs: number;
  sequence: number | null;
};

const MAX_IMPORT_OPERATIONS = 2_000;

const normalizeNullableTrimmed = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeLocale = (value: string | null | undefined): string | null => {
  const normalized = normalizeNullableTrimmed(value);
  return normalized ? normalized.toLowerCase() : null;
};

const buildPatternSignature = (args: {
  label: string;
  target: string;
  locale: string | null;
}): string => {
  const normalizedLabel = args.label.trim().toLowerCase();
  const normalizedTarget = args.target.trim().toLowerCase();
  const normalizedLocale = args.locale?.trim().toLowerCase() ?? '*';
  return `${normalizedTarget}::${normalizedLocale}::${normalizedLabel}`;
};

const sanitizeSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

const buildSequenceGroupId = (
  code: string,
  usedIds: Set<string>,
  idByCode: Map<string, string>
): string => {
  const existing = idByCode.get(code);
  if (existing) return existing;

  const base = sanitizeSegment(code) || 'sequence';
  let candidate = `impseq_${base}`;
  let index = 2;
  while (usedIds.has(candidate)) {
    candidate = `impseq_${base}_${index}`;
    index += 1;
  }
  usedIds.add(candidate);
  idByCode.set(code, candidate);
  return candidate;
};

const isStringArrayEqual = (
  left: readonly string[] | undefined,
  right: readonly string[] | undefined
): boolean => {
  const leftSorted = [...(left ?? [])].sort();
  const rightSorted = [...(right ?? [])].sort();
  if (leftSorted.length !== rightSorted.length) return false;
  return leftSorted.every((value, index) => value === rightSorted[index]);
};

const hasPatternChanges = (
  current: ProductValidationPattern,
  next: CreateProductValidationPatternInput
): boolean => {
  if (current.label !== next.label) return true;
  if (current.target !== next.target) return true;
  if (normalizeLocale(current.locale) !== normalizeLocale(next.locale)) return true;
  if (current.regex !== next.regex) return true;
  if ((current.flags ?? null) !== (next.flags ?? null)) return true;
  if (current.message !== next.message) return true;
  if (current.severity !== (next.severity ?? 'error')) return true;
  if (current.enabled !== (next.enabled ?? true)) return true;
  if (current.replacementEnabled !== (next.replacementEnabled ?? false)) return true;
  if ((current.replacementAutoApply ?? false) !== (next.replacementAutoApply ?? false)) {
    return true;
  }
  if (
    (current.skipNoopReplacementProposal ?? true) !==
    normalizeProductValidationSkipNoopReplacementProposal(next.skipNoopReplacementProposal)
  ) {
    return true;
  }
  if ((current.replacementValue ?? null) !== (next.replacementValue ?? null)) return true;
  if (!isStringArrayEqual(current.replacementFields, next.replacementFields)) return true;
  if (
    !isStringArrayEqual(
      normalizeProductValidationPatternReplacementScopes(
        current.replacementAppliesToScopes,
        current.appliesToScopes
      ),
      normalizeProductValidationPatternReplacementScopes(
        next.replacementAppliesToScopes,
        next.appliesToScopes
      )
    )
  ) {
    return true;
  }
  if (current.runtimeEnabled !== (next.runtimeEnabled ?? false)) return true;
  if ((current.runtimeType ?? 'none') !== (next.runtimeType ?? 'none')) return true;
  if ((current.runtimeConfig ?? null) !== (next.runtimeConfig ?? null)) return true;
  if ((current.postAcceptBehavior ?? 'revalidate') !== (next.postAcceptBehavior ?? 'revalidate')) {
    return true;
  }
  if (
    (current.denyBehaviorOverride ?? null) !==
    normalizeProductValidationPatternDenyBehaviorOverride(next.denyBehaviorOverride)
  ) {
    return true;
  }
  if ((current.validationDebounceMs ?? 0) !== (next.validationDebounceMs ?? 0)) return true;
  if ((current.sequenceGroupId ?? null) !== (next.sequenceGroupId ?? null)) return true;
  if ((current.sequenceGroupLabel ?? null) !== (next.sequenceGroupLabel ?? null)) return true;
  if ((current.sequenceGroupDebounceMs ?? 0) !== (next.sequenceGroupDebounceMs ?? 0)) {
    return true;
  }
  if ((current.sequence ?? null) !== (next.sequence ?? null)) return true;
  if ((current.chainMode ?? 'continue') !== (next.chainMode ?? 'continue')) return true;
  if ((current.maxExecutions ?? 1) !== (next.maxExecutions ?? 1)) return true;
  if ((current.passOutputToNext ?? true) !== (next.passOutputToNext ?? true)) return true;
  if ((current.launchEnabled ?? false) !== (next.launchEnabled ?? false)) return true;
  if (
    !isStringArrayEqual(
      normalizeProductValidationPatternLaunchScopes(
        current.launchAppliesToScopes,
        current.appliesToScopes
      ),
      normalizeProductValidationPatternLaunchScopes(
        next.launchAppliesToScopes,
        next.appliesToScopes
      )
    )
  ) {
    return true;
  }
  if (
    (current.launchScopeBehavior ?? 'gate') !==
    normalizeProductValidationLaunchScopeBehavior(next.launchScopeBehavior)
  ) {
    return true;
  }
  if (
    (current.launchSourceMode ?? 'current_field') !== (next.launchSourceMode ?? 'current_field')
  ) {
    return true;
  }
  if ((current.launchSourceField ?? null) !== (next.launchSourceField ?? null)) return true;
  if ((current.launchOperator ?? 'equals') !== (next.launchOperator ?? 'equals')) return true;
  if ((current.launchValue ?? null) !== (next.launchValue ?? null)) return true;
  if ((current.launchFlags ?? null) !== (next.launchFlags ?? null)) return true;
  if (
    !isStringArrayEqual(
      normalizeProductValidationPatternScopes(current.appliesToScopes),
      normalizeProductValidationPatternScopes(next.appliesToScopes)
    )
  ) {
    return true;
  }
  return false;
};

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
  launchOperator: string;
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
  runtimeType: ProductValidationRuntimeType;
}): boolean => replacementEnabled && !replacementValue && runtimeEnabled && runtimeType !== 'none';

const toCreateInput = (
  pattern: ProductValidatorImportPattern,
  sequenceAssignment: SequenceAssignment | null
): CreateProductValidationPatternInput => {
  const label = pattern.label.trim();
  const locale = normalizeLocale(pattern.locale);
  const regex = pattern.regex.trim();
  const flags = normalizeNullableTrimmed(pattern.flags);
  const message = pattern.message.trim();
  const replacementEnabled = pattern.replacementEnabled ?? false;
  const replacementAutoApply = pattern.replacementAutoApply ?? false;
  const skipNoopReplacementProposal = normalizeProductValidationSkipNoopReplacementProposal(
    pattern.skipNoopReplacementProposal
  );
  const replacementValue = normalizeNullableTrimmed(pattern.replacementValue);
  const runtimeEnabled = pattern.runtimeEnabled ?? false;
  const runtimeType = (pattern.runtimeType ?? 'none') as ProductValidationRuntimeType;
  const runtimeConfig = validateAndNormalizeRuntimeConfig({
    runtimeEnabled,
    runtimeType,
    runtimeConfig: normalizeNullableTrimmed(pattern.runtimeConfig),
  });
  const launchEnabled = pattern.launchEnabled ?? false;
  const launchSourceMode = pattern.launchSourceMode ?? 'current_field';
  const launchSourceField = normalizeNullableTrimmed(pattern.launchSourceField);
  const launchOperator = pattern.launchOperator ?? 'equals';
  const launchValue = typeof pattern.launchValue === 'string' ? pattern.launchValue : null;
  const launchFlags = normalizeNullableTrimmed(pattern.launchFlags);

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

  const denyBehaviorOverride = normalizeProductValidationPatternDenyBehaviorOverride(
    pattern.denyBehaviorOverride
  );

  const assignedSequenceGroupId =
    sequenceAssignment?.sequenceGroupId ?? normalizeNullableTrimmed(pattern.sequenceGroupId);
  const assignedSequenceGroupLabel =
    sequenceAssignment?.sequenceGroupLabel ?? normalizeNullableTrimmed(pattern.sequenceGroupLabel);
  const assignedSequenceGroupDebounceMs =
    sequenceAssignment?.sequenceGroupDebounceMs ?? pattern.sequenceGroupDebounceMs ?? 0;
  const assignedSequence = sequenceAssignment?.sequence ?? pattern.sequence ?? null;

  return {
    label,
    target: pattern.target,
    locale,
    regex,
    flags,
    message,
    severity: pattern.severity ?? 'error',
    enabled: pattern.enabled ?? true,
    replacementEnabled,
    replacementAutoApply,
    skipNoopReplacementProposal,
    replacementValue,
    replacementFields: pattern.replacementFields ?? [],
    replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
      pattern.replacementAppliesToScopes,
      pattern.appliesToScopes
    ),
    runtimeEnabled,
    runtimeType,
    runtimeConfig,
    postAcceptBehavior: pattern.postAcceptBehavior ?? 'revalidate',
    denyBehaviorOverride,
    validationDebounceMs: pattern.validationDebounceMs ?? 0,
    sequenceGroupId: assignedSequenceGroupId,
    sequenceGroupLabel: assignedSequenceGroupLabel,
    sequenceGroupDebounceMs: assignedSequenceGroupDebounceMs,
    sequence: assignedSequence,
    chainMode: pattern.chainMode ?? 'continue',
    maxExecutions: pattern.maxExecutions ?? 1,
    passOutputToNext: pattern.passOutputToNext ?? true,
    launchEnabled,
    launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
      pattern.launchAppliesToScopes,
      pattern.appliesToScopes
    ),
    launchScopeBehavior: normalizeProductValidationLaunchScopeBehavior(pattern.launchScopeBehavior),
    launchSourceMode,
    launchSourceField,
    launchOperator,
    launchValue,
    launchFlags,
    appliesToScopes: normalizeProductValidationPatternScopes(pattern.appliesToScopes),
  };
};

const buildSequenceAssignments = (
  body: ProductValidatorImportRequest,
  errors: ProductValidatorImportError[]
): Map<string, SequenceAssignment> => {
  const assignments = new Map<string, SequenceAssignment>();
  const usedGroupIds = new Set<string>();
  const groupIdByCode = new Map<string, string>();
  const sequenceDefByCode = new Map<
    string,
    {
      label: string;
      debounceMs: number;
      groupId: string;
      steps: Map<string, number>;
    }
  >();

  for (const sequence of body.sequences ?? []) {
    const groupId = buildSequenceGroupId(sequence.code, usedGroupIds, groupIdByCode);
    const steps = new Map<string, number>();
    for (const step of sequence.steps) {
      if (steps.has(step.patternCode)) {
        errors.push({
          code: step.patternCode,
          message: `Pattern code "${step.patternCode}" appears multiple times in sequence "${sequence.code}".`,
        });
        continue;
      }
      if (assignments.has(step.patternCode)) {
        errors.push({
          code: step.patternCode,
          message: `Pattern code "${step.patternCode}" is assigned to multiple sequences.`,
        });
        continue;
      }
      steps.set(step.patternCode, step.order);
      assignments.set(step.patternCode, {
        sequenceGroupId: groupId,
        sequenceGroupLabel: sequence.label,
        sequenceGroupDebounceMs: sequence.debounceMs,
        sequence: step.order,
      });
    }

    sequenceDefByCode.set(sequence.code, {
      label: sequence.label,
      debounceMs: sequence.debounceMs,
      groupId,
      steps,
    });
  }

  for (const pattern of body.patterns) {
    if (assignments.has(pattern.code)) continue;
    const inlineSequenceCode = normalizeNullableTrimmed(pattern.sequenceCode);
    if (!inlineSequenceCode) continue;

    const definedSequence = sequenceDefByCode.get(inlineSequenceCode);
    const groupId =
      definedSequence?.groupId ??
      buildSequenceGroupId(inlineSequenceCode, usedGroupIds, groupIdByCode);

    assignments.set(pattern.code, {
      sequenceGroupId: groupId,
      sequenceGroupLabel:
        normalizeNullableTrimmed(pattern.sequenceLabel) ??
        definedSequence?.label ??
        inlineSequenceCode,
      sequenceGroupDebounceMs: pattern.sequenceDebounceMs ?? definedSequence?.debounceMs ?? 0,
      sequence: pattern.sequenceOrder ?? pattern.sequence ?? null,
    });
  }

  return assignments;
};

const buildImportPlan = (
  body: ProductValidatorImportRequest,
  existingPatterns: ProductValidationPattern[]
): { operations: PlannedOperation[]; errors: ProductValidatorImportError[] } => {
  const errors: ProductValidatorImportError[] = [];
  const sequenceAssignments = buildSequenceAssignments(body, errors);

  const existingById = new Map(existingPatterns.map((pattern) => [pattern.id, pattern]));
  const existingBySignature = new Map<string, ProductValidationPattern[]>();
  for (const pattern of existingPatterns) {
    const signature = buildPatternSignature({
      label: pattern.label,
      target: pattern.target,
      locale: normalizeLocale(pattern.locale),
    });
    const bucket = existingBySignature.get(signature);
    if (bucket) {
      bucket.push(pattern);
    } else {
      existingBySignature.set(signature, [pattern]);
    }
  }

  const operations: PlannedOperation[] = [];
  const retainedIds = new Set<string>();

  for (const importPattern of body.patterns) {
    if (body.mode === 'append' && importPattern.id) {
      errors.push({
        code: importPattern.code,
        message:
          `Pattern code "${importPattern.code}" provides "id" while mode is append. ` +
          'Remove id or switch mode to upsert.',
      });
      continue;
    }

    try {
      const createInput = toCreateInput(
        importPattern,
        sequenceAssignments.get(importPattern.code) ?? null
      );

      let matched: ProductValidationPattern | null = null;
      if (importPattern.id) {
        matched = existingById.get(importPattern.id) ?? null;
        if (!matched) {
          errors.push({
            code: importPattern.code,
            message: `Pattern id "${importPattern.id}" was not found in current validator patterns.`,
          });
          continue;
        }
      } else if (body.mode !== 'append') {
        const signature = buildPatternSignature({
          label: createInput.label,
          target: createInput.target,
          locale: createInput.locale ?? null,
        });
        const candidates = existingBySignature.get(signature) ?? [];
        if (candidates.length > 1) {
          errors.push({
            code: importPattern.code,
            message:
              `Pattern code "${importPattern.code}" matches multiple existing patterns. ` +
              'Set the pattern id in import JSON to disambiguate.',
          });
          continue;
        }
        matched = candidates[0] ?? null;
      }

      if (matched) {
        retainedIds.add(matched.id);

        if (!hasPatternChanges(matched, createInput)) {
          operations.push({
            action: 'skip',
            code: importPattern.code,
            label: createInput.label,
            patternId: matched.id,
            reason: 'No changes detected.',
          });
          continue;
        }

        operations.push({
          action: 'update',
          code: importPattern.code,
          label: createInput.label,
          patternId: matched.id,
          updateData: createInput,
        });
      } else {
        operations.push({
          action: 'create',
          code: importPattern.code,
          label: createInput.label,
          patternId: null,
          createData: createInput,
        });
      }
    } catch (error) {
      errors.push({
        code: importPattern.code,
        message:
          error instanceof Error ? error.message : 'Pattern validation failed during import.',
      });
    }
  }

  if (body.mode === 'replace_scope') {
    for (const currentPattern of existingPatterns) {
      if (retainedIds.has(currentPattern.id)) continue;
      operations.push({
        action: 'delete',
        code: undefined,
        label: currentPattern.label,
        patternId: currentPattern.id,
      });
    }
  }

  if (operations.length > MAX_IMPORT_OPERATIONS) {
    errors.push({
      code: null,
      message: `Import resolves to ${operations.length} operations. Maximum allowed is ${MAX_IMPORT_OPERATIONS}.`,
    });
  }

  return { operations, errors };
};

const summarizeOperations = (
  operations: PlannedOperation[]
): ProductValidatorImportResult['summary'] => ({
  createCount: operations.filter((entry) => entry.action === 'create').length,
  updateCount: operations.filter((entry) => entry.action === 'update').length,
  deleteCount: operations.filter((entry) => entry.action === 'delete').length,
  skipCount: operations.filter((entry) => entry.action === 'skip').length,
});

const toPublicOperations = (operations: PlannedOperation[]): ProductValidatorImportOperation[] =>
  operations.map((operation) => ({
    code: operation.code,
    label: operation.label,
    action: operation.action,
    patternId: operation.patternId,
    reason: operation.reason ?? null,
  }));

export const postValidatorPatternsImportSchema = productValidatorImportRequestSchema;

export async function postValidatorPatternsImportHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as ProductValidatorImportRequest;
  if (body.scope !== 'products') {
    throw badRequestError(
      `Unsupported import scope "${body.scope}" for this endpoint. Use scope "products".`
    );
  }

  const repository = await getValidationPatternRepository();
  const existingPatterns = await repository.listPatterns();

  const { operations, errors } = buildImportPlan(body, existingPatterns);
  const summary = summarizeOperations(operations);

  if (errors.length > 0) {
    return NextResponse.json({
      ok: false,
      dryRun: true,
      scope: body.scope,
      mode: body.mode,
      summary,
      operations: toPublicOperations(operations),
      errors,
    } satisfies ProductValidatorImportResult);
  }

  const dryRun = body.dryRun ?? true;
  if (!dryRun) {
    for (const operation of operations) {
      if (operation.action === 'create') {
        if (!operation.createData) {
          throw badRequestError('Import operation is missing create data.');
        }
        const created = await repository.createPattern(operation.createData);
        operation.patternId = created.id;
      } else if (operation.action === 'update') {
        if (!operation.patternId || !operation.updateData) {
          throw badRequestError('Import operation is missing update target or payload.');
        }
        const updated = await repository.updatePattern(operation.patternId, operation.updateData);
        operation.patternId = updated.id;
      } else if (operation.action === 'delete') {
        if (!operation.patternId) {
          throw badRequestError('Import operation is missing delete target.');
        }
        await repository.deletePattern(operation.patternId);
      }
    }

    invalidateValidationPatternRuntimeCache();
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    scope: body.scope,
    mode: body.mode,
    summary,
    operations: toPublicOperations(operations),
    errors: [],
  } satisfies ProductValidatorImportResult);
}
