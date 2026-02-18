'use client';

import { useEffect, useState } from 'react';

export const PROMPT_EXPLODER_DOCS_TOOLTIP_KEY =
  'prompt_exploder:docs_tooltips_enabled';

export const readPromptExploderDocsTooltipsEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PROMPT_EXPLODER_DOCS_TOOLTIP_KEY) === '1';
};

export function usePromptExploderDocsTooltips(): {
  docsTooltipsEnabled: boolean;
  setDocsTooltipsEnabled: (enabled: boolean) => void;
  } {
  const [docsTooltipsEnabled, setDocsTooltipsEnabledState] = useState(false);

  useEffect(() => {
    setDocsTooltipsEnabledState(readPromptExploderDocsTooltipsEnabled());
  }, []);

  const setDocsTooltipsEnabled = (enabled: boolean): void => {
    setDocsTooltipsEnabledState(enabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        PROMPT_EXPLODER_DOCS_TOOLTIP_KEY,
        enabled ? '1' : '0'
      );
    }
  };

  return { docsTooltipsEnabled, setDocsTooltipsEnabled };
}
