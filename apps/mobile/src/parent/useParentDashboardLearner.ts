import { useState } from 'react';
import type { KangurLearnerProfile } from '@kangur/contracts/kangur';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';

export type UseParentDashboardLearnerResult = {
    activeLearner: KangurLearnerProfile | null;
    selectedLearnerId: string | null;
    learners: KangurLearnerProfile[];
    parentDisplayName: string;
    selectionError: string | null;
    switchingLearnerId: string | null;
    setSelectionError: (error: string | null) => void;
    setSwitchingLearnerId: (id: string | null) => void;
};

const getParentDisplayName = (fullName: string | undefined | null, copy: ReturnType<typeof useKangurMobileI18n>['copy']): string => {
    if (typeof fullName === 'string' && fullName.trim() !== '') return fullName.trim();
    return copy({
        de: 'Elternkonto',
        en: 'Parent account',
        pl: 'Konto rodzica',
    });
};

export function useParentDashboardLearner(): UseParentDashboardLearnerResult {
  const { copy } = useKangurMobileI18n();
  const { session } = useKangurMobileAuth();
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [switchingLearnerId, setSwitchingLearnerId] = useState<string | null>(null);

  const activeLearner = session.user?.activeLearner ?? null;
  const selectedLearnerId = activeLearner?.id ?? null;
  const learners = session.user?.learners ?? [];

  const parentDisplayName = getParentDisplayName(session.user?.full_name, copy);

  return {
    activeLearner,
    selectedLearnerId,
    learners,
    parentDisplayName,
    selectionError,
    switchingLearnerId,
    setSelectionError,
    setSwitchingLearnerId
  };
}
