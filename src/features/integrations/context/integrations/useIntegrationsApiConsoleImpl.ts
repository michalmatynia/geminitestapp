'use client';

import { useState } from 'react';

import type {
  IntegrationAllegroApiMethod,
  IntegrationAllegroApiResponse,
  IntegrationBaseApiResponse,
} from '@/shared/contracts/integrations';

export function useIntegrationsApiConsoleImpl() {
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
