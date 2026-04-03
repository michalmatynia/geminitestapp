'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useAdminFilemakerCampaignEditState } from './AdminFilemakerCampaignEditPage.hooks';

type CampaignEditState = ReturnType<typeof useAdminFilemakerCampaignEditState>;

const CampaignEditContext = createContext<CampaignEditState | null>(null);

export function CampaignEditProvider({ children }: { children: React.ReactNode }) {
  const state = useAdminFilemakerCampaignEditState();
  
  const value = useMemo(() => state, [state]);

  return (
    <CampaignEditContext.Provider value={value}>
      {children}
    </CampaignEditContext.Provider>
  );
}

export function useCampaignEditContext() {
  const context = useContext(CampaignEditContext);
  if (!context) {
    throw new Error('useCampaignEditContext must be used within a CampaignEditProvider');
  }
  return context;
}
