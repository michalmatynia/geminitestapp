'use client';

import React from 'react';

import {
  CampaignEditProvider,
  useCampaignEditContext,
} from './AdminFilemakerCampaignEditPage.context';
import {
  CampaignEditLayout,
  CampaignEditMissingState,
} from './AdminFilemakerCampaignEditPage.layout';

function AdminFilemakerCampaignEditPageContent(): React.JSX.Element {
  const context = useCampaignEditContext();

  if (!context.isCreateMode && context.existingCampaign === null && !context.isLoading) {
    return <CampaignEditMissingState router={context.router} />;
  }

  return <CampaignEditLayout context={context} />;
}

export function AdminFilemakerCampaignEditPage(): React.JSX.Element {
  return (
    <CampaignEditProvider>
      <AdminFilemakerCampaignEditPageContent />
    </CampaignEditProvider>
  );
}
