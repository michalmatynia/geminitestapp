import type React from 'react';
import type { useRouter } from 'nextjs-toploader/app';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type { CountryOption } from '@/shared/contracts/internationalization';
import type { useConfirm } from '@/shared/hooks/ui/useConfirm';
import type { useUpdateSetting } from '@/shared/hooks/use-settings';
import type { SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';
import type { useToast } from '@/shared/ui/primitives.public';

import type { FilemakerEmailCampaignSchedulerStatus } from '../settings';
import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignContentGroupRegistry,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunMode,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignSuppressionReason,
  FilemakerEmailCampaignSuppressionRegistry,
  FilemakerMailAccount,
} from '../types';
import type {
  FilemakerEmailCampaignAnalytics,
  FilemakerEmailCampaignAudiencePreview,
  FilemakerEmailCampaignLaunchEvaluation,
} from '../types/campaigns';
import type { useFilemakerCampaignRunActions } from './useFilemakerCampaignRunActions';

export type CampaignOption = {
  value: string;
  label: string;
};

export type CampaignEditToast = ReturnType<typeof useToast>['toast'];
export type CampaignEditConfirm = ReturnType<typeof useConfirm>['confirm'];
export type CampaignEditRouter = ReturnType<typeof useRouter>;
export type CampaignEditSettingsStore = SettingsStoreValue;
export type ConfirmationModalComponent = ReturnType<typeof useConfirm>['ConfirmationModal'];
export type UpdateSettingMutation = ReturnType<typeof useUpdateSetting>;
export type PersistedCampaignBuilder = (
  overrides?: Partial<FilemakerEmailCampaign>
) => FilemakerEmailCampaign;

export type CampaignEditUi = {
  toast: CampaignEditToast;
  confirm: CampaignEditConfirm;
  ConfirmationModal: ConfirmationModalComponent;
};

export type CampaignEditRoute = {
  campaignId: string;
  isCreateMode: boolean;
};

export type CampaignCountryState = {
  countries: CountryOption[];
  countryOptions: Array<LabeledOptionWithDescriptionDto<string>>;
};

export type CampaignEditRegistries = {
  database: FilemakerDatabase;
  campaignRegistry: FilemakerEmailCampaignRegistry;
  contentGroupRegistry: FilemakerEmailCampaignContentGroupRegistry;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
  schedulerStatus: FilemakerEmailCampaignSchedulerStatus;
};

export type CampaignDraftState = {
  existingCampaign: FilemakerEmailCampaign | null;
  draft: FilemakerEmailCampaign;
  setDraft: React.Dispatch<React.SetStateAction<FilemakerEmailCampaign>>;
  launchingMode: FilemakerEmailCampaignRunMode | null;
  setLaunchingMode: React.Dispatch<React.SetStateAction<FilemakerEmailCampaignRunMode | null>>;
  testRecipientEmailDraft: string;
  setTestRecipientEmailDraft: React.Dispatch<React.SetStateAction<string>>;
  isTestSendPending: boolean;
  setIsTestSendPending: React.Dispatch<React.SetStateAction<boolean>>;
  suppressionEmailDraft: string;
  setSuppressionEmailDraft: React.Dispatch<React.SetStateAction<string>>;
  suppressionReasonDraft: FilemakerEmailCampaignSuppressionReason;
  setSuppressionReasonDraft: React.Dispatch<React.SetStateAction<FilemakerEmailCampaignSuppressionReason>>;
  suppressionNotesDraft: string;
  setSuppressionNotesDraft: React.Dispatch<React.SetStateAction<string>>;
};

export type CampaignEditDerivedState = {
  organizationOptions: CampaignOption[];
  eventOptions: CampaignOption[];
  partyOptions: CampaignOption[];
  mailAccountOptions: CampaignOption[];
  selectedMailAccount: FilemakerMailAccount | null;
  preview: FilemakerEmailCampaignAudiencePreview;
  launchEvaluation: FilemakerEmailCampaignLaunchEvaluation;
  recentRuns: FilemakerEmailCampaignRun[];
  suppressionEntries: FilemakerEmailCampaignSuppressionRegistry['entries'];
  analytics: FilemakerEmailCampaignAnalytics;
  nextAutomationAt: string | null;
  schedulerFailureMessage: string | null;
};

export type CampaignEditPersistence = {
  persistCampaignRegistry: (nextCampaigns: FilemakerEmailCampaign[]) => Promise<void>;
  persistContentGroupRegistry: (
    nextRegistry: FilemakerEmailCampaignContentGroupRegistry
  ) => Promise<void>;
  persistCampaignDeletion: (input: {
    nextCampaigns: FilemakerEmailCampaign[];
    campaignId: string;
  }) => Promise<void>;
  persistSuppressionRegistry: (
    nextSuppressionRegistry: FilemakerEmailCampaignSuppressionRegistry
  ) => Promise<void>;
};

export type CampaignEditActions = {
  saveCampaign: (successMessage?: string) => Promise<FilemakerEmailCampaign | null>;
  handleLaunch: (mode: FilemakerEmailCampaignRunMode) => Promise<void>;
  handleSendTestEmail: () => Promise<void>;
  handleDuplicateCampaign: () => Promise<void>;
  handleToggleArchiveCampaign: () => Promise<void>;
  handleDeleteCampaign: () => void;
  handleGrantApproval: () => Promise<void>;
  handleRevokeApproval: () => Promise<void>;
  handleAddSuppressionEntry: () => Promise<void>;
  handleRemoveSuppressionEntry: (emailAddress: string) => Promise<void>;
};

export type CampaignEditActionContext = {
  draftState: CampaignDraftState;
  route: CampaignEditRoute;
  registries: CampaignEditRegistries;
  persistence: CampaignEditPersistence;
  router: CampaignEditRouter;
  settingsStore: CampaignEditSettingsStore;
  toast: CampaignEditToast;
  confirm: CampaignEditConfirm;
};

export type CampaignRunActions = ReturnType<typeof useFilemakerCampaignRunActions>;

export type AdminFilemakerCampaignEditState = CampaignEditRoute &
  CampaignCountryState &
  CampaignEditDerivedState &
  CampaignEditActions & {
    database: FilemakerDatabase;
    contentGroupRegistry: FilemakerEmailCampaignContentGroupRegistry;
    persistContentGroupRegistry: CampaignEditPersistence['persistContentGroupRegistry'];
    existingCampaign: FilemakerEmailCampaign | null;
    draft: FilemakerEmailCampaign;
    setDraft: React.Dispatch<React.SetStateAction<FilemakerEmailCampaign>>;
    launchingMode: FilemakerEmailCampaignRunMode | null;
    suppressionEmailDraft: string;
    setSuppressionEmailDraft: React.Dispatch<React.SetStateAction<string>>;
    testRecipientEmailDraft: string;
    setTestRecipientEmailDraft: React.Dispatch<React.SetStateAction<string>>;
    isTestSendPending: boolean;
    ConfirmationModal: ConfirmationModalComponent;
    suppressionReasonDraft: FilemakerEmailCampaignSuppressionReason;
    setSuppressionReasonDraft: React.Dispatch<React.SetStateAction<FilemakerEmailCampaignSuppressionReason>>;
    suppressionNotesDraft: string;
    setSuppressionNotesDraft: React.Dispatch<React.SetStateAction<string>>;
    schedulerStatus: FilemakerEmailCampaignSchedulerStatus;
    deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
    attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
    handleRunAction: CampaignRunActions['handleRunAction'];
    isRunActionPending: boolean;
    isLoading: boolean;
    isUpdatePending: boolean;
    router: CampaignEditRouter;
  };
