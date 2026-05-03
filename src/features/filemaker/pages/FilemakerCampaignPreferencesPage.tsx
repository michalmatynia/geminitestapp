'use client';

import React from 'react';

import { useFilemakerCampaignPreferencesPageModel } from './FilemakerCampaignPreferencesPage.model';
import type { FilemakerCampaignPreferencesPageProps } from './FilemakerCampaignPreferencesPage.types';
import { FilemakerCampaignPreferencesPageView } from './FilemakerCampaignPreferencesPage.view';

export function FilemakerCampaignPreferencesPage(
  props: FilemakerCampaignPreferencesPageProps
): React.JSX.Element {
  const model = useFilemakerCampaignPreferencesPageModel(props);
  return <FilemakerCampaignPreferencesPageView model={model} />;
}
