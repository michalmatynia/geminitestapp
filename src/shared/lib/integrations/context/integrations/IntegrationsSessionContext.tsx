'use client';

import { createContext, useContext } from 'react';
import type { SessionCookie } from '@/shared/contracts/integrations';

export interface IntegrationsSession {
  showSessionModal: boolean;
  setShowSessionModal: (open: boolean) => void;
  sessionLoading: boolean;
  sessionError: string | null;
  sessionCookies: SessionCookie[];
  sessionOrigins: unknown[];
  sessionUpdatedAt: string | null;
}

export const IntegrationsSessionContext = createContext<IntegrationsSession | null>(null);

export const useIntegrationsSession = () => {
  const context = useContext(IntegrationsSessionContext);
  if (!context) throw new Error('useIntegrationsSession must be used within IntegrationsProvider');
  return context;
};
