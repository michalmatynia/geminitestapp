import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useState } from 'react';

export function useParentDashboardLearner() {
  const { copy } = useKangurMobileI18n();
  const { session } = useKangurMobileAuth();
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [switchingLearnerId, setSwitchingLearnerId] = useState<string | null>(null);

  const activeLearner = session.user?.activeLearner ?? null;
  const selectedLearnerId = activeLearner?.id.trim() ?? null;
  const learners = session.user?.learners ?? [];

  const trimmedFullName = session.user?.full_name?.trim();
  const parentDisplayName =
    typeof trimmedFullName === 'string' && trimmedFullName !== ''
      ? trimmedFullName
      : copy({
          de: 'Elternkonto',
          en: 'Parent account',
          pl: 'Konto rodzica',
        });

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
