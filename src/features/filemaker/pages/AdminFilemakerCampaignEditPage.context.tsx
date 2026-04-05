'use client';

import React, { useMemo } from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useAdminFilemakerCampaignEditState } from './AdminFilemakerCampaignEditPage.hooks';

type CampaignEditState = ReturnType<typeof useAdminFilemakerCampaignEditState>;

const {
  Context: CampaignEditContext,
  useStrictContext: useCampaignEditContext,
} = createStrictContext<CampaignEditState>({
  hookName: 'useCampaignEditContext',
  providerName: 'a CampaignEditProvider',
  displayName: 'CampaignEditContext',
});

export { useCampaignEditContext };

export function CampaignEditProvider({ children }: { children: React.ReactNode }) {
  const state = useAdminFilemakerCampaignEditState();
  
  const value = useMemo(() => state, [state]);

  return (
    <CampaignEditContext.Provider value={value}>
      {children}
    </CampaignEditContext.Provider>
  );
}
