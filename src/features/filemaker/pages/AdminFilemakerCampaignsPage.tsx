'use client';

import React from 'react';

import { useAdminFilemakerCampaignsPageModel } from './AdminFilemakerCampaignsPage.model';
import { AdminFilemakerCampaignsPageView } from './AdminFilemakerCampaignsPage.view';

export function AdminFilemakerCampaignsPage(): React.JSX.Element {
  const model = useAdminFilemakerCampaignsPageModel();
  return <AdminFilemakerCampaignsPageView {...model} />;
}
