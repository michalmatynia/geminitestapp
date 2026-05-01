'use client';

import React from 'react';

import {
  isLoadedCampaignRunPageState,
  useAdminFilemakerCampaignRunPageState,
} from './AdminFilemakerCampaignRunPage.state';
import {
  CampaignRunLoadedView,
  CampaignRunMissingState,
} from './AdminFilemakerCampaignRunPage.sections';

export function AdminFilemakerCampaignRunPage(): React.JSX.Element {
  const state = useAdminFilemakerCampaignRunPageState();

  if (!isLoadedCampaignRunPageState(state)) {
    return <CampaignRunMissingState onBackToCampaigns={state.handleBackToCampaigns} />;
  }

  return <CampaignRunLoadedView state={state} />;
}
