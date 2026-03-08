'use client';

import { createContext, useContext } from 'react';
import type { IntegrationsData } from '@/shared/contracts/integrations';
import { internalError } from '@/shared/errors/app-error';

export const IntegrationsDataContext = createContext<IntegrationsData | null>(null);

export const useIntegrationsData = () => {
  const context = useContext(IntegrationsDataContext);
  if (!context) throw internalError('useIntegrationsData must be used within IntegrationsProvider');
  return context;
};
