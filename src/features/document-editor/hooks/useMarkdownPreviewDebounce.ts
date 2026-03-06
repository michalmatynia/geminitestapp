'use client';

import React from 'react';

export type UseMarkdownPreviewDebounceProps = {
  value: string;
  renderPreviewHtml: (value: string) => string;
  sanitizePreviewHtml?: ((value: string) => string) | undefined;
  debounceMs?: number;
  enabled?: boolean;
};

export function useMarkdownPreviewDebounce({
  value,
  renderPreviewHtml,
  sanitizePreviewHtml,
  debounceMs = 150,
  enabled = true,
}: UseMarkdownPreviewDebounceProps): { isDebouncing: boolean; debouncedHtml: string } {
  const [debouncedHtml, setDebouncedHtml] = React.useState<string>('');
  const [isDebouncing, setIsDebouncing] = React.useState(false);

  React.useEffect((): void | (() => void) => {
    if (!enabled) return;
    
    setIsDebouncing(true);
    const timer = window.setTimeout((): void => {
      const nextHtml = renderPreviewHtml(value);
      setDebouncedHtml(sanitizePreviewHtml ? sanitizePreviewHtml(nextHtml) : nextHtml);
      setIsDebouncing(false);
    }, debounceMs);
    
    return (): void => window.clearTimeout(timer);
  }, [debounceMs, renderPreviewHtml, sanitizePreviewHtml, enabled, value]);

  return { isDebouncing, debouncedHtml };
}
