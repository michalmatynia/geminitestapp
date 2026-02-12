'use client';

import React, { createContext, useContext } from 'react';

export type PromptEnginePageChromeContextValue = {
  embedded?: boolean;
  eyebrow?: string;
  backLinkHref?: string;
  backLinkLabel?: string;
};

const PromptEnginePageChromeContext = createContext<PromptEnginePageChromeContextValue | null>(null);

type PromptEnginePageChromeProviderProps = {
  value: PromptEnginePageChromeContextValue;
  children: React.ReactNode;
};

export function PromptEnginePageChromeProvider({
  value,
  children,
}: PromptEnginePageChromeProviderProps): React.JSX.Element {
  return (
    <PromptEnginePageChromeContext.Provider value={value}>
      {children}
    </PromptEnginePageChromeContext.Provider>
  );
}

export function useOptionalPromptEnginePageChrome(): PromptEnginePageChromeContextValue | null {
  return useContext(PromptEnginePageChromeContext);
}
