import type { CreateProductValidationPatternInput, ProductValidationPattern } from '@/shared/contracts/products/validation';
import {
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
  normalizeProductValidationSkipNoopReplacementProposal,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { serializeProductValidationSemanticState } from '@/shared/lib/products/utils/validator-semantic-state';

const normalizeLocale = (value: string | null | undefined): string | null => {
  const trimmed = typeof value === 'string' ? value.trim() : null;
  return trimmed && trimmed.length > 0 ? trimmed.toLowerCase() : null;
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

export const hasPatternChanges = (
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
  if ((current.replacementAutoApply ?? false) !== (next.replacementAutoApply ?? false)) return true;
  if (
    (current.skipNoopReplacementProposal ?? true) !==
    normalizeProductValidationSkipNoopReplacementProposal(next.skipNoopReplacementProposal)
  ) return true;
  if ((current.replacementValue ?? null) !== (next.replacementValue ?? null)) return true;
  if (!isStringArrayEqual(current.replacementFields, next.replacementFields)) return true;
  if (
    !isStringArrayEqual(
      normalizeProductValidationPatternReplacementScopes(current.replacementAppliesToScopes),
      normalizeProductValidationPatternReplacementScopes(next.replacementAppliesToScopes)
    )
  ) return true;
  if (current.runtimeEnabled !== (next.runtimeEnabled ?? false)) return true;
  if ((current.runtimeType ?? 'none') !== (next.runtimeType ?? 'none')) return true;
  if ((current.runtimeConfig ?? null) !== (next.runtimeConfig ?? null)) return true;
  if ((current.postAcceptBehavior ?? 'revalidate') !== (next.postAcceptBehavior ?? 'revalidate')) return true;
  if (
    (current.denyBehaviorOverride ?? null) !==
    normalizeProductValidationPatternDenyBehaviorOverride(next.denyBehaviorOverride)
  ) return true;
  if ((current.validationDebounceMs ?? 0) !== (next.validationDebounceMs ?? 0)) return true;
  if ((current.sequenceGroupId ?? null) !== (next.sequenceGroupId ?? null)) return true;
  if ((current.sequenceGroupLabel ?? null) !== (next.sequenceGroupLabel ?? null)) return true;
  if ((current.sequenceGroupDebounceMs ?? 0) !== (next.sequenceGroupDebounceMs ?? 0)) return true;
  if ((current.sequence ?? null) !== (next.sequence ?? null)) return true;
  if ((current.chainMode ?? 'continue') !== (next.chainMode ?? 'continue')) return true;
  if ((current.maxExecutions ?? 1) !== (next.maxExecutions ?? 1)) return true;
  if ((current.passOutputToNext ?? true) !== (next.passOutputToNext ?? true)) return true;
  if ((current.launchEnabled ?? false) !== (next.launchEnabled ?? false)) return true;
  if (
    !isStringArrayEqual(
      normalizeProductValidationPatternLaunchScopes(current.launchAppliesToScopes),
      normalizeProductValidationPatternLaunchScopes(next.launchAppliesToScopes)
    )
  ) return true;
  if (
    (current.launchScopeBehavior ?? 'gate') !==
    normalizeProductValidationLaunchScopeBehavior(next.launchScopeBehavior)
  ) return true;
  if ((current.launchSourceMode ?? 'current_field') !== (next.launchSourceMode ?? 'current_field')) return true;
  if ((current.launchSourceField ?? null) !== (next.launchSourceField ?? null)) return true;
  if ((current.launchOperator ?? 'equals') !== (next.launchOperator ?? 'equals')) return true;
  if ((current.launchValue ?? null) !== (next.launchValue ?? null)) return true;
  if ((current.launchFlags ?? null) !== (next.launchFlags ?? null)) return true;
  if (
    !isStringArrayEqual(
      normalizeProductValidationPatternScopes(current.appliesToScopes),
      normalizeProductValidationPatternScopes(next.appliesToScopes)
    )
  ) return true;
  if (
    serializeProductValidationSemanticState(current.semanticState) !==
    serializeProductValidationSemanticState(next.semanticState)
  ) return true;
  return false;
};
