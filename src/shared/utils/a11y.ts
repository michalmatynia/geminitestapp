import * as React from 'react';

export const getTextContent = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join(' ');
  if (React.isValidElement(node)) {
    return getTextContent(node.props.children);
  }
  return '';
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
  const textContent = getTextContent(children).trim();
  const hasText = textContent.length > 0;
  const resolvedAriaLabel =
    ariaLabel ??
    (!hasText && typeof title === 'string' ? title : undefined) ??
    (!hasText && typeof fallbackLabel === 'string' ? fallbackLabel : undefined);
  const hasAccessibleLabel = hasText || Boolean(resolvedAriaLabel) || Boolean(ariaLabelledBy);
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
  // eslint-disable-next-line no-console
  console.warn(
    `[${componentName}] Missing accessible label. Provide visible text, aria-label, or aria-labelledby.`
  );
};
