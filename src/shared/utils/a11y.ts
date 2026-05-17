/**
 * Accessibility Utilities
 * 
 * Helper functions for improving application accessibility.
 * Provides:
 * - Text content extraction from React nodes
 * - Accessible label resolution with fallbacks
 * - ARIA attribute management
 * - Screen reader optimization utilities
 */

import * as React from 'react';

/**
 * Recursively extracts text content from React nodes.
 * Handles strings, numbers, arrays, and React elements.
 */
export const getTextContent = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join(' ');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getTextContent(node.props.children);
  }
  return '';
};

/**
 * Resolves accessible labels with intelligent fallback logic.
 * Prioritizes explicit ARIA labels, then title attributes, then fallbacks.
 */
const resolveFallbackAccessibleLabel = ({
  ariaLabel,
  title,
  fallbackLabel,
  hasText,
}: {
  ariaLabel?: string;
  title?: string;
  fallbackLabel?: string;
  hasText: boolean;
}): string | undefined => {
  if (ariaLabel !== undefined) return ariaLabel;
  if (hasText) return undefined;
  if (typeof title === 'string') return title;
  if (typeof fallbackLabel === 'string') return fallbackLabel;
  return undefined;
};

const resolveAccessibleTextState = (
  children: React.ReactNode
): { textContent: string; hasText: boolean } => {
  const textContent = getTextContent(children).trim();
  return {
    textContent,
    hasText: textContent.length > 0,
  };
};

const hasAccessibleReference = (ariaLabelledBy: string | undefined): boolean =>
  Boolean(ariaLabelledBy?.trim());

const warnedMissingAccessibleLabelComponentsKey = '__geminitestappA11yMissingLabelWarnings';

const getWarnedMissingAccessibleLabelComponents = (): Set<string> => {
  const globalForA11y = globalThis as typeof globalThis & {
    __geminitestappA11yMissingLabelWarnings?: Set<string>;
  };

  globalForA11y[warnedMissingAccessibleLabelComponentsKey] ??= new Set<string>();

  return globalForA11y[warnedMissingAccessibleLabelComponentsKey];
};

export const resolveAccessibleLabel = ({
  children,
  ariaLabel,
  ariaLabelledBy,
  title,
  fallbackLabel,
}: {
  children: React.ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  title?: string;
  fallbackLabel?: string;
}): {
  textContent: string;
  hasText: boolean;
  ariaLabel?: string;
  hasAccessibleLabel: boolean;
} => {
  const { textContent, hasText } = resolveAccessibleTextState(children);
  const resolvedAriaLabel = resolveFallbackAccessibleLabel({
    ariaLabel,
    title,
    fallbackLabel,
    hasText,
  });
  const hasAccessibleLabel =
    hasText || Boolean(resolvedAriaLabel) || hasAccessibleReference(ariaLabelledBy);
  return {
    textContent,
    hasText,
    ariaLabel: resolvedAriaLabel,
    hasAccessibleLabel,
  };
};

export const warnMissingAccessibleLabel = ({
  componentName,
  hasAccessibleLabel,
}: {
  componentName: string;
  hasAccessibleLabel: boolean;
}): void => {
  if (process.env['NODE_ENV'] === 'production') return;
  if (hasAccessibleLabel) return;

  const trimmedComponentName = componentName.trim();
  const warningKey = trimmedComponentName.length > 0 ? trimmedComponentName : 'unknown';
  const warnedMissingAccessibleLabelComponents = getWarnedMissingAccessibleLabelComponents();
  if (warnedMissingAccessibleLabelComponents.has(warningKey)) return;
  warnedMissingAccessibleLabelComponents.add(warningKey);
   
  void import('@/shared/lib/observability/system-logger-client')
    .then(({ logSystemEvent }) =>
      logSystemEvent({
        level: 'warn',
        source: 'a11y',
        message: `[${componentName}] Missing accessible label. Provide visible text, aria-label, or aria-labelledby.`,
        context: { componentName },
      })
    )
    .catch(() => {});
};
