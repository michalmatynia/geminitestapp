'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

import { type TestLogEntry } from '@/shared/contracts/integrations/session-testing';

import { type StepWithResult } from '../integrations-context-types';

type IntegrationsTestingState = {
  testLog: TestLogEntry[];
  setTestLog: Dispatch<SetStateAction<TestLogEntry[]>>;
  isTesting: boolean;
  setIsTesting: Dispatch<SetStateAction<boolean>>;
  showTestLogModal: boolean;
  setShowTestLogModal: Dispatch<SetStateAction<boolean>>;
  showTestErrorModal: boolean;
  setShowTestErrorModal: Dispatch<SetStateAction<boolean>>;
  testError: string | null;
  setTestError: Dispatch<SetStateAction<string | null>>;
  testErrorMeta: {
    errorId?: string;
    integrationId?: string | null;
    connectionId?: string | null;
  } | null;
  setTestErrorMeta: Dispatch<
    SetStateAction<{
      errorId?: string;
      integrationId?: string | null;
      connectionId?: string | null;
    } | null>
  >;
  showTestSuccessModal: boolean;
  setShowTestSuccessModal: Dispatch<SetStateAction<boolean>>;
  testSuccessMessage: string | null;
  setTestSuccessMessage: Dispatch<SetStateAction<string | null>>;
  selectedStep: StepWithResult | null;
  setSelectedStep: Dispatch<SetStateAction<StepWithResult | null>>;
};

export function useIntegrationsTestingImpl(): IntegrationsTestingState {
  const [testLog, setTestLog] = useState<TestLogEntry[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [showTestLogModal, setShowTestLogModal] = useState(false);
  const [showTestErrorModal, setShowTestErrorModal] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testErrorMeta, setTestErrorMeta] = useState<{
    errorId?: string;
    integrationId?: string | null;
    connectionId?: string | null;
  } | null>(null);
  const [showTestSuccessModal, setShowTestSuccessModal] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<StepWithResult | null>(null);

  return {
    testLog,
    setTestLog,
    isTesting,
    setIsTesting,
    showTestLogModal,
    setShowTestLogModal,
    showTestErrorModal,
    setShowTestErrorModal,
    testError,
    setTestError,
    testErrorMeta,
    setTestErrorMeta,
    showTestSuccessModal,
    setShowTestSuccessModal,
    testSuccessMessage,
    setTestSuccessMessage,
    selectedStep,
    setSelectedStep,
  };
}
