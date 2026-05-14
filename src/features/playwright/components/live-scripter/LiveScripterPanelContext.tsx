'use client';

import { createContext, useContext } from 'react';
import type { useLiveScripterPanelModel } from './useLiveScripterPanelModel';

export type LiveScripterPanelModel = ReturnType<typeof useLiveScripterPanelModel>;

const LiveScripterPanelContext = createContext<LiveScripterPanelModel | undefined>(undefined);

export function LiveScripterPanelProvider({
  model,
  children,
}: {
  model: LiveScripterPanelModel;
  children: React.ReactNode;
}) {
  return (
    <LiveScripterPanelContext.Provider value={model}>
      {children}
    </LiveScripterPanelContext.Provider>
  );
}

export function useLiveScripterPanelContext(): LiveScripterPanelModel {
  const context = useContext(LiveScripterPanelContext);
  if (!context) {
    throw new Error(
      'useLiveScripterPanelContext must be used within a LiveScripterPanelProvider'
    );
  }
  return context;
}
