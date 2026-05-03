import * as React from 'react';

export const getTextContent = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join(' ');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getTextContent(node.props.children);
  }
  return '';
};

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
