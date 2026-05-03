import type { FilemakerEmailCampaignPreferenceStatus } from '@/shared/contracts/filemaker';
import type {
  FilemakerEmailCampaignPreferencesResponse,
  FilemakerEmailCampaignSuppressionReason,
} from '../types';
import type { FilemakerEmailCampaignRecipientActivitySummary } from '../settings';

export type FilemakerCampaignPreferencesScope = 'campaign' | 'all_campaigns';

export type FilemakerCampaignPreferencesPageProps = {
  initialEmailAddress?: string | null;
  initialCampaignId?: string | null;
  initialScope?: FilemakerCampaignPreferencesScope;
  initialToken?: string | null;
  hasValidSignedToken?: boolean;
  initialStatus?: FilemakerEmailCampaignPreferenceStatus;
  initialReason?: FilemakerEmailCampaignSuppressionReason | null;
  canResubscribe?: boolean;
  initialRecipientSummary?: FilemakerEmailCampaignRecipientActivitySummary | null;
};

export type FilemakerCampaignPreferencesStatusCopy = {
  title: string;
  body: string;
};

export type FilemakerCampaignPreferencesPageModel = {
  isSubmitting: boolean;
  status: FilemakerEmailCampaignPreferenceStatus;
  reason: FilemakerEmailCampaignSuppressionReason | null;
  canRestore: boolean;
  lastResult: FilemakerEmailCampaignPreferencesResponse | null;
  recipientSummary: FilemakerEmailCampaignRecipientActivitySummary | null;
  normalizedCampaignId: string | null;
  initialEmailAddress: string | null;
  isGlobalScope: boolean;
  hasValidSignedToken: boolean;
  statusCopy: FilemakerCampaignPreferencesStatusCopy;
  unsubscribe: () => void;
  resubscribe: () => void;
};
