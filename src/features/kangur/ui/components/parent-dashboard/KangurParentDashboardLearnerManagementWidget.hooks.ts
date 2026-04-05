'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
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
import type { ProfileModalTabId, LearnerManagementCopy } from './KangurParentDashboardLearnerManagementWidget.types';

const kangurPlatform = getKangurPlatform();

export type LearnerManagementState = {
  copy: LearnerManagementCopy;
  isCoarsePointer: boolean;
  overview: ReturnType<typeof useKangurParentDashboardRuntimeOverviewState>;
  actions: ReturnType<typeof useKangurParentDashboardRuntimeActions>;
  activeProfileId: string | null;
  setActiveProfileId: React.Dispatch<React.SetStateAction<string | null>>;
  activeTab: ProfileModalTabId;
  setActiveTab: React.Dispatch<React.SetStateAction<ProfileModalTabId>>;
  isCreating: boolean;
  setIsCreating: React.Dispatch<React.SetStateAction<boolean>>;
  sessions: KangurLearnerSessionHistory | null;
  isLoadingSessions: boolean;
  isLoadingMoreSessions: boolean;
  sessionsError: string | null;
  sessionsLoadMoreError: string | null;
  activeProfile: ReturnType<typeof useKangurParentDashboardRuntimeOverviewState>['learners'][number] | null;
  fetchSessions: (learnerId: string, offset?: number) => Promise<void>;
  handleOpenSettings: (learnerId: string) => void;
  handleCloseModal: () => void;
};

export function useLearnerManagementState(): LearnerManagementState {
  const locale = useLocale();
  const siteLocale = normalizeSiteLocale(locale);
  const copy = useMemo(() => getLearnerManagementCopy(siteLocale), [siteLocale]);
  const isCoarsePointer = useKangurCoarsePointer();
  const overview = useKangurParentDashboardRuntimeOverviewState();
  const actions = useKangurParentDashboardRuntimeActions();

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileModalTabId>('settings');
  const [isCreating, setIsCreating] = useState(false);
  const [sessions, setSessions] = useState<KangurLearnerSessionHistory | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMoreSessions, setIsLoadingMoreSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsLoadMoreError, setSessionsLoadMoreError] = useState<string | null>(null);

  const activeProfile = useMemo(
    () => (activeProfileId ? overview.learners.find((l) => l.id === activeProfileId) ?? null : null),
    [activeProfileId, overview.learners]
  );

  const fetchSessions = useCallback(
    async (learnerId: string, offset = 0): Promise<void> => {
      if (offset === 0) {
        setIsLoadingSessions(true);
        setSessionsError(null);
      } else {
        setIsLoadingMoreSessions(true);
        setSessionsLoadMoreError(null);
      }
      try {
        const result = await kangurPlatform.learnerSessions.list(learnerId, {
          limit: SESSION_PAGE_LIMIT,
          offset,
        });
        setSessions((prev) => {
          if (offset === 0 || !prev) return result;
          return {
            ...result,
            sessions: [...prev.sessions, ...result.sessions],
          };
        });
      } catch (err) {
        void ErrorSystem.captureException(err);
        if (offset === 0) setSessionsError(copy.noSessionsError);
        else setSessionsLoadMoreError(copy.olderSessionsError);
      } finally {
        if (offset === 0) setIsLoadingSessions(false);
        else setIsLoadingMoreSessions(false);
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
      setSessionsLoadMoreError(null);
    }
  }, [activeProfileId, activeTab, fetchSessions]);

  const handleOpenSettings = (learnerId: string): void => {
    setActiveProfileId(learnerId);
    setActiveTab('settings');
  };

  const handleCloseModal = (): void => {
    setActiveProfileId(null);
    setIsCreating(false);
    setSessionsLoadMoreError(null);
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
    sessions,
    isLoadingSessions,
    isLoadingMoreSessions,
    sessionsError,
    sessionsLoadMoreError,
    activeProfile,
    fetchSessions,
    handleOpenSettings,
    handleCloseModal,
  };
}
