'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurLearnerSessionHistory } from '@kangur/platform';
import {
  useKangurParentDashboardRuntimeActions,
  useKangurParentDashboardRuntimeOverviewState,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  getLearnerManagementCopy,
  SESSION_PAGE_LIMIT,
} from './KangurParentDashboardLearnerManagementWidget.utils';
import type { ProfileModalTabId } from './KangurParentDashboardLearnerManagementWidget.types';

const kangurPlatform = getKangurPlatform();

export function useLearnerManagementState() {
  const locale = useLocale();
  const siteLocale = normalizeSiteLocale(locale);
  const copy = useMemo(() => getLearnerManagementCopy(siteLocale), [siteLocale]);
  const isCoarsePointer = useKangurCoarsePointer();
  const overview = useKangurParentDashboardRuntimeOverviewState();
  const actions = useKangurParentDashboardRuntimeActions();

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileModalTabId>('settings');
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'indigo' | 'rose' } | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [sessions, setSessions] = useState<KangurLearnerSessionHistory | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const activeProfile = useMemo(
    () => (activeProfileId ? overview.learners.find((l) => l.id === activeProfileId) ?? null : null),
    [activeProfileId, overview.learners]
  );

  const fetchSessions = useCallback(
    async (learnerId: string, cursor?: string): Promise<void> => {
      if (!cursor) {
        setIsLoadingSessions(true);
        setSessionsError(null);
      }
      try {
        const result = await kangurPlatform.getLearnerSessionHistory({
          learnerId,
          limit: SESSION_PAGE_LIMIT,
          cursor,
        });
        setSessions((prev) => {
          if (!cursor || !prev) return result;
          return {
            ...result,
            sessions: [...prev.sessions, ...result.sessions],
          };
        });
      } catch (err) {
        void ErrorSystem.captureException(err);
        if (!cursor) setSessionsError(copy.noSessionsError);
        else setFeedback({ message: copy.olderSessionsError, tone: 'rose' });
      } finally {
        setIsLoadingSessions(false);
      }
    },
    [copy.noSessionsError, copy.olderSessionsError]
  );

  useEffect(() => {
    if (activeProfileId && activeTab === 'metrics') {
      void fetchSessions(activeProfileId);
    } else {
      setSessions(null);
      setSessionsError(null);
    }
  }, [activeProfileId, activeTab, fetchSessions]);

  const handleOpenSettings = (learnerId: string): void => {
    setActiveProfileId(learnerId);
    setActiveTab('settings');
    setFeedback(null);
  };

  const handleCloseModal = (): void => {
    setActiveProfileId(null);
    setIsCreating(false);
    setFeedback(null);
  };

  return {
    copy,
    isCoarsePointer,
    overview,
    actions,
    activeProfileId,
    setActiveProfileId,
    activeTab,
    setActiveTab,
    isCreating,
    setIsCreating,
    feedback,
    setFeedback,
    isPending,
    setIsPending,
    sessions,
    isLoadingSessions,
    sessionsError,
    activeProfile,
    fetchSessions,
    handleOpenSettings,
    handleCloseModal,
  };
}
