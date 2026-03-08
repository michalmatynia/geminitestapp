'use client';

import { createContext, useContext } from 'react';
import type { TestLogEntry } from '@/shared/contracts/integrations';
import type { StepWithResult } from '../integrations-context-types';
import { internalError } from '@/shared/errors/app-error';

export interface IntegrationsTesting {
  isTesting: boolean;
  testLog: TestLogEntry[];
  showTestLogModal: boolean;
  setShowTestLogModal: (open: boolean) => void;
  selectedStep: StepWithResult | null;
  setSelectedStep: (step: StepWithResult | null) => void;
  showTestErrorModal: boolean;
  setShowTestErrorModal: (open: boolean) => void;
  testError: string | null;
  testErrorMeta: {
    errorId?: string;
    integrationId?: string | null;
    connectionId?: string | null;
  } | null;
  showTestSuccessModal: boolean;
  setShowTestSuccessModal: (open: boolean) => void;
  testSuccessMessage: string | null;
}

export const IntegrationsTestingContext = createContext<IntegrationsTesting | null>(null);

export const useIntegrationsTesting = () => {
  const context = useContext(IntegrationsTestingContext);
  if (!context) throw internalError('useIntegrationsTesting must be used within IntegrationsProvider');
  return context;
};
