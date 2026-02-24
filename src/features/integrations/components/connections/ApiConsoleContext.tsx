'use client';

import React, { createContext, useContext, useMemo } from 'react';

export interface ApiPreset {
  label: string;
  method: string;
  path?: string;
  params?: Record<string, unknown> | string;
  body?: string;
}

export interface ApiConsoleContextValue {
  method: string;
  setMethod: (value: string) => void;
  path?: string;
  setPath?: (value: string) => void;
  bodyOrParams: string;
  setBodyOrParams: (value: string) => void;
  loading: boolean;
  error: string | null;
  response: {
    status?: number;
    statusText?: string;
    data: unknown;
    refreshed?: boolean;
  } | null;
  onRequest: () => void;
  isConnected: boolean;
}

const ApiConsoleContext = createContext<ApiConsoleContextValue | null>(null);

export function ApiConsoleProvider({
  value,
  children,
}: {
  value: ApiConsoleContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ApiConsoleContext.Provider value={value}>
      {children}
    </ApiConsoleContext.Provider>
  );
}

export function useApiConsoleContext(): ApiConsoleContextValue {
  const context = useContext(ApiConsoleContext);
  if (!context) {
    throw new Error('useApiConsoleContext must be used within an ApiConsoleProvider');
  }
  return context;
}
