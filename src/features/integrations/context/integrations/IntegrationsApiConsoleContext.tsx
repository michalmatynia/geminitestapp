'use client';

import type { IntegrationAllegroApiMethod, IntegrationAllegroApiResponse, IntegrationBaseApiResponse } from '@/shared/contracts/integrations/api';
import { createStrictContext } from '../createStrictContext';

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

export const { Context: IntegrationsApiConsoleContext, useValue: useIntegrationsApiConsole } =
  createStrictContext<IntegrationsApiConsole>({
    displayName: 'IntegrationsApiConsoleContext',
    errorMessage: 'useIntegrationsApiConsole must be used within IntegrationsProvider',
  });
