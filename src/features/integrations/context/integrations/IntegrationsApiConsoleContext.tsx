'use client';

import { createContext, useContext } from 'react';

import type {
  IntegrationAllegroApiMethod,
  IntegrationAllegroApiResponse,
  IntegrationBaseApiResponse,
} from '@/shared/contracts/integrations';
import { internalError } from '@/shared/errors/app-error';

export interface IntegrationsApiConsole {
  baseApiMethod: string;
  setBaseApiMethod: (method: string) => void;
  baseApiParams: string;
  setBaseApiParams: (params: string) => void;
  baseApiLoading: boolean;
  baseApiError: string | null;
  baseApiResponse: IntegrationBaseApiResponse | null;
  allegroApiMethod: IntegrationAllegroApiMethod;
  setAllegroApiMethod: (method: IntegrationAllegroApiMethod) => void;
  allegroApiPath: string;
  setAllegroApiPath: (path: string) => void;
  allegroApiBody: string;
  setAllegroApiBody: (body: string) => void;
  allegroApiLoading: boolean;
  allegroApiError: string | null;
  allegroApiResponse: IntegrationAllegroApiResponse | null;
}

export const IntegrationsApiConsoleContext = createContext<IntegrationsApiConsole | null>(null);

export const useIntegrationsApiConsole = () => {
  const context = useContext(IntegrationsApiConsoleContext);
  if (!context)
    throw internalError('useIntegrationsApiConsole must be used within IntegrationsProvider');
  return context;
};
