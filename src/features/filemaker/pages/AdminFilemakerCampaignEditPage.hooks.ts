'use client';

import {
  useAdminFilemakerCampaignEditModel,
  type AdminFilemakerCampaignEditState,
} from './AdminFilemakerCampaignEditPage.model';

export function useAdminFilemakerCampaignEditState(): AdminFilemakerCampaignEditState {
  return useAdminFilemakerCampaignEditModel();
}
