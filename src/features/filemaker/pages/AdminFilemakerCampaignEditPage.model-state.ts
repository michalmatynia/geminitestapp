import type {
  AdminFilemakerCampaignEditState,
  CampaignCountryState,
  CampaignDraftState,
  CampaignEditActions,
  CampaignEditDerivedState,
  CampaignEditPersistence,
  CampaignEditRegistries,
  CampaignEditRoute,
  CampaignEditRouter,
  CampaignEditSettingsStore,
  CampaignEditUi,
  CampaignRunActions,
  UpdateSettingMutation,
} from './AdminFilemakerCampaignEditPage.model-types';

type CampaignEditStateInput = {
  route: CampaignEditRoute;
  registries: CampaignEditRegistries;
  draftState: CampaignDraftState;
  countryState: CampaignCountryState;
  derived: CampaignEditDerivedState;
  persistence: CampaignEditPersistence;
  actions: CampaignEditActions;
  runActions: CampaignRunActions;
  settingsStore: CampaignEditSettingsStore;
  updateSetting: UpdateSettingMutation;
  router: CampaignEditRouter;
  ui: CampaignEditUi;
};

export function buildCampaignEditState(
  input: CampaignEditStateInput
): AdminFilemakerCampaignEditState {
  return {
    ...input.route,
    database: input.registries.database,
    contentGroupRegistry: input.registries.contentGroupRegistry,
    persistContentGroupRegistry: input.persistence.persistContentGroupRegistry,
    ...input.countryState,
    existingCampaign: input.draftState.existingCampaign,
    draft: input.draftState.draft,
    setDraft: input.draftState.setDraft,
    launchingMode: input.draftState.launchingMode,
    suppressionEmailDraft: input.draftState.suppressionEmailDraft,
    setSuppressionEmailDraft: input.draftState.setSuppressionEmailDraft,
    testRecipientEmailDraft: input.draftState.testRecipientEmailDraft,
    setTestRecipientEmailDraft: input.draftState.setTestRecipientEmailDraft,
    isTestSendPending: input.draftState.isTestSendPending,
    ConfirmationModal: input.ui.ConfirmationModal,
    suppressionReasonDraft: input.draftState.suppressionReasonDraft,
    setSuppressionReasonDraft: input.draftState.setSuppressionReasonDraft,
    suppressionNotesDraft: input.draftState.suppressionNotesDraft,
    setSuppressionNotesDraft: input.draftState.setSuppressionNotesDraft,
    ...input.derived,
    schedulerStatus: input.registries.schedulerStatus,
    deliveryRegistry: input.registries.deliveryRegistry,
    attemptRegistry: input.registries.attemptRegistry,
    ...input.actions,
    handleRunAction: input.runActions.handleRunAction,
    isRunActionPending: input.runActions.isRunActionPending,
    isLoading: input.settingsStore.isLoading,
    isUpdatePending: input.updateSetting.isPending,
    router: input.router,
  };
}
