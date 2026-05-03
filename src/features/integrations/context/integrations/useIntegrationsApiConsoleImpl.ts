'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

import type { IntegrationAllegroApiMethod, IntegrationAllegroApiResponse, IntegrationBaseApiResponse } from '@/shared/contracts/integrations/api';

type IntegrationsApiConsoleState = {
  baseApiMethod: string;
  setBaseApiMethod: Dispatch<SetStateAction<string>>;
  baseApiParams: string;
  setBaseApiParams: Dispatch<SetStateAction<string>>;
  baseApiResponse: IntegrationBaseApiResponse | null;
  setBaseApiResponse: Dispatch<SetStateAction<IntegrationBaseApiResponse | null>>;
  baseApiError: string | null;
  setBaseApiError: Dispatch<SetStateAction<string | null>>;
  baseApiLoading: boolean;
  setBaseApiLoading: Dispatch<SetStateAction<boolean>>;
  allegroApiMethod: IntegrationAllegroApiMethod;
  setAllegroApiMethod: Dispatch<SetStateAction<IntegrationAllegroApiMethod>>;
  allegroApiPath: string;
  setAllegroApiPath: Dispatch<SetStateAction<string>>;
  allegroApiBody: string;
  setAllegroApiBody: Dispatch<SetStateAction<string>>;
  allegroApiResponse: IntegrationAllegroApiResponse | null;
  setAllegroApiResponse: Dispatch<SetStateAction<IntegrationAllegroApiResponse | null>>;
  allegroApiError: string | null;
  setAllegroApiError: Dispatch<SetStateAction<string | null>>;
  allegroApiLoading: boolean;
  setAllegroApiLoading: Dispatch<SetStateAction<boolean>>;
};

export function useIntegrationsApiConsoleImpl(): IntegrationsApiConsoleState {
  // API Console State (Base)
  const [baseApiMethod, setBaseApiMethod] = useState('getInventories');
  const [baseApiParams, setBaseApiParams] = useState('{}');
  const [baseApiResponse, setBaseApiResponse] = useState<IntegrationBaseApiResponse | null>(null);
  const [baseApiError, setBaseApiError] = useState<string | null>(null);
  const [baseApiLoading, setBaseApiLoading] = useState(false);

  // API Console State (Allegro)
  const [allegroApiMethod, setAllegroApiMethod] = useState<IntegrationAllegroApiMethod>('GET');
  const [allegroApiPath, setAllegroApiPath] = useState('/sale/categories');
  const [allegroApiBody, setAllegroApiBody] = useState('{}');
  const [allegroApiResponse, setAllegroApiResponse] =
    useState<IntegrationAllegroApiResponse | null>(null);
  const [allegroApiError, setAllegroApiError] = useState<string | null>(null);
  const [allegroApiLoading, setAllegroApiLoading] = useState(false);

  return {
    baseApiMethod,
    setBaseApiMethod,
    baseApiParams,
    setBaseApiParams,
    baseApiResponse,
    setBaseApiResponse,
    baseApiError,
    setBaseApiError,
    baseApiLoading,
    setBaseApiLoading,
    allegroApiMethod,
    setAllegroApiMethod,
    allegroApiPath,
    setAllegroApiPath,
    allegroApiBody,
    setAllegroApiBody,
    allegroApiResponse,
    setAllegroApiResponse,
    allegroApiError,
    setAllegroApiError,
    allegroApiLoading,
    setAllegroApiLoading,
  };
}
