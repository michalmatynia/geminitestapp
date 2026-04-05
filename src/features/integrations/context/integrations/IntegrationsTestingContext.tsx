'use client';

import type { TestLogEntry } from '@/shared/contracts/integrations/session-testing';

import type { StepWithResult } from '../integrations-context-types';
import { createStrictContext } from '../createStrictContext';

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

export const { Context: IntegrationsTestingContext, useValue: useIntegrationsTesting } =
  createStrictContext<IntegrationsTesting>({
    displayName: 'IntegrationsTestingContext',
    errorMessage: 'useIntegrationsTesting must be used within IntegrationsProvider',
  });
