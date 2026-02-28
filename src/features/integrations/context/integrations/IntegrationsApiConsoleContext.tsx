'use client';

import { createContext, useContext } from 'react';

export interface IntegrationsApiConsole {
  baseApiMethod: string;
  setBaseApiMethod: (method: string) => void;
  baseApiParams: string;
  setBaseApiParams: (params: string) => void;
  baseApiLoading: boolean;
  baseApiError: string | null;
  baseApiResponse: { data: unknown } | null;
  allegroApiMethod: string;
  setAllegroApiMethod: (method: string) => void;
  allegroApiPath: string;
  setAllegroApiPath: (path: string) => void;
  allegroApiBody: string;
  setAllegroApiBody: (body: string) => void;
  allegroApiLoading: boolean;
  allegroApiError: string | null;
  allegroApiResponse: {
    status: number;
    statusText: string;
    data?: unknown;
    refreshed?: boolean;
  } | null;
}

export const IntegrationsApiConsoleContext = createContext<IntegrationsApiConsole | null>(null);

export const useIntegrationsApiConsole = () => {
  const context = useContext(IntegrationsApiConsoleContext);
  if (!context)
    throw new Error('useIntegrationsApiConsole must be used within IntegrationsProvider');
  return context;
};
