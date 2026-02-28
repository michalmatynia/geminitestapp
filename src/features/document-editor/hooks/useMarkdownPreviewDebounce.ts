'use client';

import React from 'react';

export type UseMarkdownPreviewDebounceProps = {
  value: string;
  showPreview: boolean;
  renderPreviewHtml: (value: string) => string;
  sanitizePreviewHtml?: ((value: string) => string) | undefined;
  debounceMs?: number;
};

export function useMarkdownPreviewDebounce({
  value,
  showPreview,
  renderPreviewHtml,
  sanitizePreviewHtml,
  debounceMs = 150,
}: UseMarkdownPreviewDebounceProps): string {
  const [debouncedContentHtml, setDebouncedContentHtml] = React.useState<string>('');

  React.useEffect((): void | (() => void) => {
    if (!showPreview) return;
    const timer = window.setTimeout((): void => {
      const nextHtml = renderPreviewHtml(value);
      setDebouncedContentHtml(sanitizePreviewHtml ? sanitizePreviewHtml(nextHtml) : nextHtml);
    }, debounceMs);
    return (): void => window.clearTimeout(timer);
  }, [debounceMs, renderPreviewHtml, sanitizePreviewHtml, showPreview, value]);

  return debouncedContentHtml;
}
