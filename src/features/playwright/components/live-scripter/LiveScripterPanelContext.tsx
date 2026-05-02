'use client';

import { createContext, useContext } from 'react';
import type { useLiveScripterPanelModel } from './useLiveScripterPanelModel';

type Model = ReturnType<typeof useLiveScripterPanelModel>;

const LiveScripterPanelContext = createContext<Model | undefined>(undefined);

export function LiveScripterPanelProvider({
  model,
  children,
}: {
  model: Model;
  children: React.ReactNode;
}) {
  return (
    <LiveScripterPanelContext.Provider value={model}>
      {children}
    </LiveScripterPanelContext.Provider>
  );
}

export function useLiveScripterPanelContext(): Model {
  const context = useContext(LiveScripterPanelContext);
  if (!context) {
    throw new Error(
      'useLiveScripterPanelContext must be used within a LiveScripterPanelProvider'
    );
  }
  return context;
}
