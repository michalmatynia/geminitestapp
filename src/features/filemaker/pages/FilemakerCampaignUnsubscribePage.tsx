'use client';

import React, { useMemo, useState } from 'react';

import { filemakerEmailCampaignUnsubscribeResponseSchema } from '@/shared/contracts/filemaker';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { api, ApiError } from '@/shared/lib/api-client';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Input, useToast } from '@/shared/ui/primitives.public';

import type { FilemakerEmailCampaignUnsubscribeResponse } from '../types';

type FilemakerCampaignUnsubscribePageProps = {
  initialEmailAddress?: string | null;
  initialCampaignId?: string | null;
  initialToken?: string | null;
  hasValidSignedToken?: boolean;
};

type TokenStatus = 'verified' | 'invalid' | 'none';
type SubmitUnsubscribeVariables = {
  activeToken: string | null;
  normalizedCampaignId: string | null;
  normalizedEmail: string;
};

type UnsubscribePageModel = {
  emailAddress: string;
  setEmailAddress: (value: string) => void;
  isSubmitting: boolean;
  submittedResult: FilemakerEmailCampaignUnsubscribeResponse | null;
  clearSubmittedResult: () => void;
  tokenStatus: TokenStatus;
  normalizedCampaignId: string | null;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

const normalizeEmailAddress = (value: string): string => value.trim().toLowerCase();

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

const resolveInitialTokenStatus = (
  initialToken: string | null | undefined,
  hasValidSignedToken: boolean
): TokenStatus => {
  if (normalizeOptionalString(initialToken) === null) return 'none';
  return hasValidSignedToken ? 'verified' : 'invalid';
};

const resolveErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Failed to submit the unsubscribe request.';
};

const submitUnsubscribe = async ({
  activeToken,
  normalizedCampaignId,
  normalizedEmail,
}: SubmitUnsubscribeVariables): Promise<FilemakerEmailCampaignUnsubscribeResponse> => {
  const response = await api.post<FilemakerEmailCampaignUnsubscribeResponse>(
    '/api/filemaker/campaigns/unsubscribe',
    buildUnsubscribePayload(activeToken, normalizedEmail, normalizedCampaignId),
    { logError: false }
  );
  const parsed = filemakerEmailCampaignUnsubscribeResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error('Invalid unsubscribe response.');
  return parsed.data;
};

const useUnsubscribeMutation = (): MutationResult<
  FilemakerEmailCampaignUnsubscribeResponse,
  SubmitUnsubscribeVariables
> =>
  createMutationV2({
    mutationKey: ['filemaker', 'campaigns', 'unsubscribe', 'submit'],
    mutationFn: submitUnsubscribe,
    meta: {
      source: 'features.filemaker.campaignUnsubscribe.submit',
      operation: 'action',
      resource: 'filemaker.campaign-unsubscribe',
      domain: 'filemaker',
      description: 'Submits Filemaker campaign unsubscribe requests.',
      errorPresentation: 'toast',
      tags: ['filemaker', 'campaigns', 'unsubscribe'],
    },
  });

const useUnsubscribePageModel = ({
  initialEmailAddress,
  initialCampaignId,
  initialToken,
  hasValidSignedToken = false,
}: FilemakerCampaignUnsubscribePageProps): UnsubscribePageModel => {
  const { toast } = useToast();
  const unsubscribeMutation = useUnsubscribeMutation();
  const [emailAddress, setEmailAddress] = useState(initialEmailAddress ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] =
    useState<FilemakerEmailCampaignUnsubscribeResponse | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(
    resolveInitialTokenStatus(initialToken, hasValidSignedToken)
  );
  const normalizedCampaignId = useMemo(() => normalizeOptionalString(initialCampaignId), [initialCampaignId]);
  const normalizedToken = useMemo(() => normalizeOptionalString(initialToken), [initialToken]);
  const activeToken = tokenStatus === 'verified' ? normalizedToken : null;

  const submit = async (): Promise<void> => {
    const normalizedEmail = normalizeEmailAddress(emailAddress);
    if (activeToken === null && normalizedEmail.length === 0) {
      toast('Email address is required.', { variant: 'error' });
      return;
    }
    await submitUnsubscribeRequest({
      activeToken,
      normalizedEmail,
      normalizedCampaignId,
      setSubmittedResult,
      setTokenStatus,
      toast,
      unsubscribeMutation,
    });
  };

  return {
    emailAddress,
    setEmailAddress,
    isSubmitting,
    submittedResult,
    clearSubmittedResult: (): void => { setSubmittedResult(null); },
    tokenStatus,
    normalizedCampaignId,
    handleSubmit: (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      setIsSubmitting(true);
      submit().then(
        () => { setIsSubmitting(false); },
        (error: unknown) => {
          toast(resolveErrorMessage(error), { variant: 'error' });
          setIsSubmitting(false);
        }
      );
    },
  };
};

type SubmitUnsubscribeRequestInput = {
  activeToken: string | null;
  normalizedEmail: string;
  normalizedCampaignId: string | null;
  setSubmittedResult: (result: FilemakerEmailCampaignUnsubscribeResponse) => void;
  setTokenStatus: (status: TokenStatus) => void;
  toast: ReturnType<typeof useToast>['toast'];
  unsubscribeMutation: MutationResult<
    FilemakerEmailCampaignUnsubscribeResponse,
    SubmitUnsubscribeVariables
  >;
};

const submitUnsubscribeRequest = async ({
  activeToken,
  normalizedEmail,
  normalizedCampaignId,
  setSubmittedResult,
  setTokenStatus,
  toast,
  unsubscribeMutation,
}: SubmitUnsubscribeRequestInput): Promise<void> => {
  try {
    const response = await unsubscribeMutation.mutateAsync({
      activeToken,
      normalizedCampaignId,
      normalizedEmail,
    });
    setSubmittedResult(response);
    toast(response.alreadySuppressed ? 'This address was already unsubscribed.' : 'You have been unsubscribed.', {
      variant: 'success',
    });
    if (activeToken !== null) setTokenStatus('verified');
  } catch (error: unknown) {
    toast(resolveErrorMessage(error), { variant: 'error' });
    if (activeToken !== null) setTokenStatus('invalid');
  }
};

const buildUnsubscribePayload = (
  activeToken: string | null,
  normalizedEmail: string,
  normalizedCampaignId: string | null
): Record<string, unknown> => {
  if (activeToken !== null) {
    return { token: activeToken, source: 'public-unsubscribe-page' };
  }
  return {
    emailAddress: normalizedEmail,
    campaignId: normalizedCampaignId,
    source: 'public-unsubscribe-page',
  };
};

const UnsubscribeBadges = ({ model }: { model: UnsubscribePageModel }): React.JSX.Element => (
  <div className='flex flex-wrap gap-2'>
    {model.normalizedCampaignId !== null ? (
      <Badge variant='outline' className='text-[10px]'>Campaign: {model.normalizedCampaignId}</Badge>
    ) : null}
    {model.tokenStatus === 'verified' ? <Badge variant='outline' className='text-[10px]'>Signed link verified</Badge> : null}
    {model.tokenStatus === 'invalid' ? <Badge variant='outline' className='text-[10px]'>Signed link invalid</Badge> : null}
    {model.submittedResult !== null ? (
      <Badge variant='outline' className='text-[10px]'>
        Status: {model.submittedResult.alreadySuppressed ? 'already suppressed' : 'suppressed'}
      </Badge>
    ) : null}
  </div>
);

const UnsubscribeStatusPanel = ({ model }: { model: UnsubscribePageModel }): React.JSX.Element => {
  if (model.submittedResult !== null) return <SubmittedStatus result={model.submittedResult} />;
  if (model.tokenStatus === 'verified') return <VerifiedTokenStatus />;
  if (model.tokenStatus === 'invalid') return <InvalidTokenStatus />;
  return <DefaultUnsubscribeStatus />;
};

const SubmittedStatus = ({ result }: { result: FilemakerEmailCampaignUnsubscribeResponse }): React.JSX.Element => (
  <>
    <div className='font-medium text-white'>
      {result.alreadySuppressed ? 'This address was already on the suppression list.' : 'Your unsubscribe request has been recorded.'}
    </div>
    <div className='mt-1 break-all text-gray-300'>{result.emailAddress}</div>
  </>
);

const VerifiedTokenStatus = (): React.JSX.Element => (
  <>
    <div className='font-medium text-white'>Signed unsubscribe link confirmed</div>
    <div className='mt-1'>
      This link already identifies the recipient and campaign context. Submitting it will add the resolved email address to the Filemaker suppression list.
    </div>
  </>
);

const InvalidTokenStatus = (): React.JSX.Element => (
  <>
    <div className='font-medium text-white'>This unsubscribe link is no longer valid</div>
    <div className='mt-1'>You can still submit a manual unsubscribe request by entering the email address below.</div>
  </>
);

const DefaultUnsubscribeStatus = (): React.JSX.Element => (
  <>
    <div className='font-medium text-white'>What happens next</div>
    <div className='mt-1'>
      The email address will be stored in the Filemaker campaign suppression registry and excluded from future campaign sends.
    </div>
  </>
);

const resolveSubmitButtonLabel = (model: UnsubscribePageModel): string => {
  if (model.isSubmitting) return 'Submitting...';
  if (model.tokenStatus === 'verified') return 'Confirm unsubscribe';
  return 'Unsubscribe';
};

export function FilemakerCampaignUnsubscribePage(
  props: FilemakerCampaignUnsubscribePageProps
): React.JSX.Element {
  const model = useUnsubscribePageModel(props);
  return (
    <div className='mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-2xl items-center px-4 py-10 sm:px-6'>
      <div className='w-full rounded-3xl border border-border/60 bg-card/80 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8'>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Badge variant='outline' className='text-[10px] uppercase tracking-[0.24em]'>Filemaker Campaigns</Badge>
            <h1 className='text-3xl font-semibold tracking-tight text-white'>Unsubscribe from campaign emails</h1>
            <p className='max-w-xl text-sm leading-6 text-gray-300'>
              Use this form to stop future Filemaker campaign deliveries to a specific email address. The address will be added to the campaign suppression list immediately.
            </p>
          </div>
          <UnsubscribeBadges model={model} />
          <form className='space-y-4' onSubmit={model.handleSubmit}>
            <FormField label='Email address'>
              <Input
                type='email'
                value={model.emailAddress}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => { model.setEmailAddress(event.target.value); }}
                placeholder='name@example.com'
                autoComplete='email'
                aria-label='Email address'
                title='Email address'
                disabled={model.isSubmitting || model.tokenStatus === 'verified'}
              />
            </FormField>
            <div className='rounded-2xl border border-border/50 bg-background/40 p-4 text-sm leading-6 text-gray-300'>
              <UnsubscribeStatusPanel model={model} />
            </div>
            <div className='flex flex-wrap gap-3'>
              <Button type='submit' disabled={model.isSubmitting}>{resolveSubmitButtonLabel(model)}</Button>
              {model.submittedResult !== null ? (
                <Button type='button' variant='outline' disabled={model.isSubmitting} onClick={model.clearSubmittedResult}>
                  Submit another address
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
