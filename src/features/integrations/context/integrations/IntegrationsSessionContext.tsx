'use client';

import { createContext, useContext } from 'react';

import type { SessionCookie, SessionOrigin } from '@/shared/contracts/integrations';
import { internalError } from '@/shared/errors/app-error';

export interface IntegrationsSession {
  showSessionModal: boolean;
  setShowSessionModal: (open: boolean) => void;
  sessionLoading: boolean;
  sessionError: string | null;
  sessionCookies: SessionCookie[];
  sessionOrigins: SessionOrigin[];
  sessionUpdatedAt: string | null;
}

export const IntegrationsSessionContext = createContext<IntegrationsSession | null>(null);

export const useIntegrationsSession = () => {
  const context = useContext(IntegrationsSessionContext);
  if (!context) throw internalError('useIntegrationsSession must be used within IntegrationsProvider');
  return context;
};
