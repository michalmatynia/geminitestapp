'use client';

import { useState } from 'react';

import { useConnectionSession } from '@/features/integrations/hooks/useIntegrationQueries';
import { type IntegrationConnection } from '@/shared/contracts/integrations/connections';

import { type SessionPayload } from '../integrations-context-types';

export function useIntegrationsSessionImpl(activeConnection: IntegrationConnection | null) {
  const [showSessionModal, setShowSessionModal] = useState(false);

  const sessionQuery = useConnectionSession(activeConnection?.id, {
    enabled: showSessionModal,
  });
  const sessionPayload: SessionPayload | undefined = sessionQuery.data;
  const sessionCookies = sessionPayload?.cookies ?? [];
  const sessionOrigins = sessionPayload?.origins ?? [];
  const sessionUpdatedAt = sessionPayload?.updatedAt ?? null;
  const sessionError = sessionQuery.isError
    ? (sessionQuery.error?.message ?? 'Failed to load session cookies.')
    : (sessionPayload?.error ?? null);

  return {
    showSessionModal,
    setShowSessionModal,
    sessionCookies,
    sessionOrigins,
    sessionUpdatedAt,
    sessionError,
    sessionQuery,
  };
}
