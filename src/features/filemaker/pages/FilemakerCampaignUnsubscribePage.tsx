'use client';

import React, { useMemo, useState } from 'react';

import { filemakerEmailCampaignUnsubscribeResponseSchema } from '@/shared/contracts/filemaker';
import { api, ApiError } from '@/shared/lib/api-client';
import { Badge, Button, FormField, Input, useToast } from '@/shared/ui';

import type { FilemakerEmailCampaignUnsubscribeResponse } from '../types';

type FilemakerCampaignUnsubscribePageProps = {
  initialEmailAddress?: string | null;
  initialCampaignId?: string | null;
};

const normalizeEmailAddress = (value: string): string => value.trim().toLowerCase();

export function FilemakerCampaignUnsubscribePage({
  initialEmailAddress,
  initialCampaignId,
}: FilemakerCampaignUnsubscribePageProps): React.JSX.Element {
  const { toast } = useToast();
  const [emailAddress, setEmailAddress] = useState(initialEmailAddress ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] =
    useState<FilemakerEmailCampaignUnsubscribeResponse | null>(null);

  const normalizedCampaignId = useMemo(
    () => initialCampaignId?.trim() || null,
    [initialCampaignId]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const normalizedEmail = normalizeEmailAddress(emailAddress);
    if (!normalizedEmail) {
      toast('Email address is required.', { variant: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post<FilemakerEmailCampaignUnsubscribeResponse>(
        '/api/filemaker/campaigns/unsubscribe',
        {
          emailAddress: normalizedEmail,
          campaignId: normalizedCampaignId,
          source: 'public-unsubscribe-page',
        },
        { logError: false }
      );
      const parsed = filemakerEmailCampaignUnsubscribeResponseSchema.safeParse(response);
      if (!parsed.success) {
        throw new Error('Invalid unsubscribe response.');
      }
      setSubmittedResult(parsed.data);
      toast(
        parsed.data.alreadySuppressed
          ? 'This address was already unsubscribed.'
          : 'You have been unsubscribed.',
        { variant: 'success' }
      );
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Failed to submit the unsubscribe request.';
      toast(message, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-2xl items-center px-4 py-10 sm:px-6'>
      <div className='w-full rounded-3xl border border-border/60 bg-card/80 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8'>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Badge variant='outline' className='text-[10px] uppercase tracking-[0.24em]'>
              Filemaker Campaigns
            </Badge>
            <h1 className='text-3xl font-semibold tracking-tight text-white'>
              Unsubscribe from campaign emails
            </h1>
            <p className='max-w-xl text-sm leading-6 text-gray-300'>
              Use this form to stop future Filemaker campaign deliveries to a specific email
              address. The address will be added to the campaign suppression list immediately.
            </p>
          </div>

          <div className='flex flex-wrap gap-2'>
            {normalizedCampaignId ? (
              <Badge variant='outline' className='text-[10px]'>
                Campaign: {normalizedCampaignId}
              </Badge>
            ) : null}
            {submittedResult ? (
              <Badge variant='outline' className='text-[10px]'>
                Status: {submittedResult.alreadySuppressed ? 'already suppressed' : 'suppressed'}
              </Badge>
            ) : null}
          </div>

          <form className='space-y-4' onSubmit={(event) => void handleSubmit(event)}>
            <FormField label='Email address'>
              <Input
                type='email'
                value={emailAddress}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setEmailAddress(event.target.value);
                }}
                placeholder='name@example.com'
                autoComplete='email'
                aria-label='Email address'
                title='Email address'
                disabled={isSubmitting}
              />
            </FormField>

            <div className='rounded-2xl border border-border/50 bg-background/40 p-4 text-sm leading-6 text-gray-300'>
              {submittedResult ? (
                <>
                  <div className='font-medium text-white'>
                    {submittedResult.alreadySuppressed
                      ? 'This address was already on the suppression list.'
                      : 'Your unsubscribe request has been recorded.'}
                  </div>
                  <div className='mt-1 break-all text-gray-300'>{submittedResult.emailAddress}</div>
                </>
              ) : (
                <>
                  <div className='font-medium text-white'>What happens next</div>
                  <div className='mt-1'>
                    The email address will be stored in the Filemaker campaign suppression registry
                    and excluded from future campaign sends.
                  </div>
                </>
              )}
            </div>

            <div className='flex flex-wrap gap-3'>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Unsubscribe'}
              </Button>
              {submittedResult ? (
                <Button
                  type='button'
                  variant='outline'
                  disabled={isSubmitting}
                  onClick={(): void => {
                    setSubmittedResult(null);
                  }}
                >
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
