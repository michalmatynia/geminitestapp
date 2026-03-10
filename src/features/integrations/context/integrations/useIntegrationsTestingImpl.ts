'use client';

import { useState } from 'react';

import { TestLogEntry } from '@/shared/contracts/integrations';

import { StepWithResult } from '../integrations-context-types';

export function useIntegrationsTestingImpl() {
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
