'use client';

import { KANGUR_TOP_BAR_HEIGHT_VAR_NAME } from '@/features/kangur/ui/design/tokens';

let latchedKangurTopBarHeightCssValue: string | null = null;

const normalizeTopBarHeightCssValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getLatchedKangurTopBarHeightCssValue = (): string | null =>
  latchedKangurTopBarHeightCssValue;

export const rememberKangurTopBarHeightCssValue = (
  value: string | null | undefined
): string | null => {
  const normalizedValue = normalizeTopBarHeightCssValue(value);
  if (!normalizedValue) {
    return latchedKangurTopBarHeightCssValue;
  }

  latchedKangurTopBarHeightCssValue = normalizedValue;
  return latchedKangurTopBarHeightCssValue;
};

export const clearLatchedKangurTopBarHeightCssValue = (): void => {
  latchedKangurTopBarHeightCssValue = null;
};

export const readKangurTopBarHeightCssValue = (): string | null => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return latchedKangurTopBarHeightCssValue;
  }

  const topBarNode = document.querySelector<HTMLElement>('[data-testid="kangur-page-top-bar"]');
  if (topBarNode) {
    const measuredHeight = Math.round(topBarNode.getBoundingClientRect().height);
    if (measuredHeight > 0) {
      return rememberKangurTopBarHeightCssValue(`${measuredHeight}px`);
    }
  }

  const computedHeight = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(KANGUR_TOP_BAR_HEIGHT_VAR_NAME)
    .trim();
  if (computedHeight.length > 0) {
    return rememberKangurTopBarHeightCssValue(computedHeight);
  }

  const inlineHeight = document.documentElement.style
    .getPropertyValue(KANGUR_TOP_BAR_HEIGHT_VAR_NAME)
    .trim();
  if (inlineHeight.length > 0) {
    return rememberKangurTopBarHeightCssValue(inlineHeight);
  }

  return latchedKangurTopBarHeightCssValue;
};
