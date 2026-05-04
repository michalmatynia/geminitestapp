/**
 * Control Accessibility Utilities
 * 
 * Accessibility label resolution and validation for UI controls.
 * Provides:
 * - Accessible label resolution with fallback strategies
 * - Missing label detection and warnings
 * - ARIA attribute coordination
 * - Component accessibility compliance checking
 * - WCAG-compliant labeling patterns
 */

import { resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/shared/utils/a11y';

type ControlAccessibleLabelInput = {
  ariaLabel: string | undefined;
  ariaLabelledBy: string | undefined;
  componentName: string;
  fallbackLabels: Array<string | undefined>;
  id: string | undefined;
  title: string | undefined;
};

type ControlAccessibleLabel = {
  ariaLabel: string | undefined;
  hasLabel: boolean;
};

const firstNonEmptyString = (...values: Array<string | undefined>): string | undefined =>
  values.find((value): value is string => typeof value === 'string' && value.trim().length > 0);

export const resolveControlAccessibleLabel = ({
  ariaLabel,
  ariaLabelledBy,
  componentName,
  fallbackLabels,
  id,
  title,
}: ControlAccessibleLabelInput): ControlAccessibleLabel => {
  const hasId = typeof id === 'string' && id.length > 0;
  const hasLabelledBy = typeof ariaLabelledBy === 'string' && ariaLabelledBy.length > 0;
  const allowFallbackLabel = hasLabelledBy === false && hasId === false;
  const resolved = resolveAccessibleLabel({
    children: null,
    ariaLabel,
    ariaLabelledBy,
    title: allowFallbackLabel === true ? title : undefined,
    fallbackLabel: allowFallbackLabel === true ? firstNonEmptyString(...fallbackLabels) : undefined,
  });
  const hasLabel = resolved.hasAccessibleLabel === true || hasId === true;
  if (hasLabel === false) {
    warnMissingAccessibleLabel({ componentName, hasAccessibleLabel: hasLabel });
  }
  return { ariaLabel: resolved.ariaLabel, hasLabel };
};
