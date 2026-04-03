'use client';

import type { SessionCookie, SessionOrigin } from '@/shared/contracts/integrations';
import { createStrictContext } from '../createStrictContext';

export interface IntegrationsSession {
  showSessionModal: boolean;
  setShowSessionModal: (open: boolean) => void;
  sessionLoading: boolean;
  sessionError: string | null;
  sessionCookies: SessionCookie[];
  sessionOrigins: SessionOrigin[];
  sessionUpdatedAt: string | null;
}

export const { Context: IntegrationsSessionContext, useValue: useIntegrationsSession } =
  createStrictContext<IntegrationsSession>({
    displayName: 'IntegrationsSessionContext',
    errorMessage: 'useIntegrationsSession must be used within IntegrationsProvider',
  });
