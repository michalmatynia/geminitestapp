import { useRouter } from 'nextjs-toploader/app';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { useCampaignEditActions } from './AdminFilemakerCampaignEditPage.action-hooks';
import { useCampaignEditDerivedState } from './AdminFilemakerCampaignEditPage.derived';
import { useCampaignEditMailAccounts } from './AdminFilemakerCampaignEditPage.mail-accounts';
import {
  useCampaignEditCountryState,
  useCampaignEditDraftState,
  useCampaignEditRoute,
  useCampaignEditUi,
} from './AdminFilemakerCampaignEditPage.model-hooks';
import { buildCampaignEditState } from './AdminFilemakerCampaignEditPage.model-state';
import type { AdminFilemakerCampaignEditState } from './AdminFilemakerCampaignEditPage.model-types';
import { useCampaignEditPersistence } from './AdminFilemakerCampaignEditPage.persistence';
import { useCampaignEditRegistries } from './AdminFilemakerCampaignEditPage.registries';
import { useFilemakerCampaignRunActions } from './useFilemakerCampaignRunActions';

export type { AdminFilemakerCampaignEditState };

export function useAdminFilemakerCampaignEditModel(): AdminFilemakerCampaignEditState {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const route = useCampaignEditRoute();
  const ui = useCampaignEditUi();
  const registries = useCampaignEditRegistries(settingsStore);
  const countryState = useCampaignEditCountryState();
  const draftState = useCampaignEditDraftState({
    campaignId: route.campaignId,
    campaignRegistry: registries.campaignRegistry,
    isCreateMode: route.isCreateMode,
  });
  const mailAccounts = useCampaignEditMailAccounts(ui.toast);
  const runActions = useFilemakerCampaignRunActions();
  const derived = useCampaignEditDerivedState({
    ...registries,
    draft: draftState.draft,
    existingCampaign: draftState.existingCampaign,
    mailAccounts,
  });
  const persistence = useCampaignEditPersistence({
    ...registries,
    updateSetting,
  });
  const actions = useCampaignEditActions({
    draftState,
    route,
    registries,
    persistence,
    router,
    settingsStore,
    toast: ui.toast,
    confirm: ui.confirm,
  });
  return buildCampaignEditState({
    route,
    registries,
    draftState,
    countryState,
    derived,
    persistence,
    actions,
    runActions,
    settingsStore,
    updateSetting,
    router,
    ui,
  });
}
