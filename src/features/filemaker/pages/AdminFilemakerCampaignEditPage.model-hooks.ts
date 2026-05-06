import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useCountries } from '@/shared/hooks/use-i18n-queries';
import { useToast } from '@/shared/ui/primitives.public';

import {
  buildFilemakerCountryList,
  buildFilemakerCountryOptions,
  createFilemakerEmailCampaign,
} from '../settings';
import type { FilemakerEmailCampaign } from '../types';
import { createBlankCampaignDraft } from './AdminFilemakerCampaignEditPage.utils';
import { decodeRouteParam } from './filemaker-page-utils';
import type {
  CampaignCountryState,
  CampaignDraftState,
  CampaignEditRegistries,
  CampaignEditRoute,
  CampaignEditUi,
} from './AdminFilemakerCampaignEditPage.model-types';

export function useCampaignEditUi(): CampaignEditUi {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  return { toast, confirm, ConfirmationModal };
}

export function useCampaignEditRoute(): CampaignEditRoute {
  const params = useParams();
  const campaignId = useMemo(() => decodeRouteParam(params['campaignId']), [params]);
  const isCreateMode = campaignId === 'new' || campaignId.length === 0;
  return { campaignId, isCreateMode };
}

export function useCampaignEditCountryState(): CampaignCountryState {
  const countriesQuery = useCountries();
  const countries = useMemo(
    () => buildFilemakerCountryList(countriesQuery.data ?? []),
    [countriesQuery.data]
  );
  const countryOptions = useMemo(() => buildFilemakerCountryOptions(countries), [countries]);
  return { countries, countryOptions };
}

const resolveInitialDraft = (
  existingCampaign: FilemakerEmailCampaign | null
): FilemakerEmailCampaign => {
  if (existingCampaign === null) return createBlankCampaignDraft();
  return createFilemakerEmailCampaign(existingCampaign);
};

export function useCampaignEditDraftState(input: {
  campaignId: string;
  campaignRegistry: CampaignEditRegistries['campaignRegistry'];
  isCreateMode: boolean;
}): CampaignDraftState {
  const { campaignId, campaignRegistry, isCreateMode } = input;
  const existingCampaign = useMemo(
    () =>
      isCreateMode
        ? null
        : campaignRegistry.campaigns.find((campaign) => campaign.id === campaignId) ?? null,
    [campaignId, campaignRegistry.campaigns, isCreateMode]
  );
  const initialDraft = useMemo(() => resolveInitialDraft(existingCampaign), [existingCampaign]);
  const [draft, setDraft] = useState<FilemakerEmailCampaign>(initialDraft);
  const [launchingMode, setLaunchingMode] = useState<CampaignDraftState['launchingMode']>(null);
  const [testRecipientEmailDraft, setTestRecipientEmailDraft] = useState('');
  const [isTestSendPending, setIsTestSendPending] = useState(false);
  const [suppressionEmailDraft, setSuppressionEmailDraft] = useState('');
  const [suppressionReasonDraft, setSuppressionReasonDraft] =
    useState<CampaignDraftState['suppressionReasonDraft']>('manual_block');
  const [suppressionNotesDraft, setSuppressionNotesDraft] = useState('');

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  return {
    existingCampaign,
    draft,
    setDraft,
    launchingMode,
    setLaunchingMode,
    testRecipientEmailDraft,
    setTestRecipientEmailDraft,
    isTestSendPending,
    setIsTestSendPending,
    suppressionEmailDraft,
    setSuppressionEmailDraft,
    suppressionReasonDraft,
    setSuppressionReasonDraft,
    suppressionNotesDraft,
    setSuppressionNotesDraft,
  };
}
