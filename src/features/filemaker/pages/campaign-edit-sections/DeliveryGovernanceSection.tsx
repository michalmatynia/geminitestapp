'use client';

import { Button, FormField, FormSection, Input, SelectSimple, Textarea } from '@/shared/ui';
import { SUPPRESSION_REASON_OPTIONS as FILEMAKER_SUPPRESSION_REASON_OPTIONS } from '../AdminFilemakerCampaignEditPage.utils';
import type {
  FilemakerEmailCampaignSuppressionReason,
} from '../../types';
import { useCampaignEditContext } from '../AdminFilemakerCampaignEditPage.context';

export const DeliveryGovernanceSection = () => {
  const {
    suppressionEntries,
    suppressionEmailDraft,
    setSuppressionEmailDraft,
    suppressionReasonDraft,
    setSuppressionReasonDraft,
    suppressionNotesDraft,
    setSuppressionNotesDraft,
    handleAddSuppressionEntry,
    handleRemoveSuppressionEntry,
    isUpdatePending,
  } = useCampaignEditContext();

  const unsubscribeLinkTemplate = '{{unsubscribe_url}}';
  const preferencesLinkTemplate = '{{preferences_url}}';
  const manageAllPreferencesLinkTemplate = '{{manage_all_preferences_url}}';

  return (
    <FormSection title='Delivery Governance' className='space-y-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-4 rounded-md border border-border/60 bg-card/25 p-4'>
          <div className='text-sm font-semibold text-white'>Suppression Management</div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Email Address'>
              <Input
                placeholder='Email to suppress...'
                value={suppressionEmailDraft}
                onChange={(e) => setSuppressionEmailDraft(e.target.value)}
              />
            </FormField>
            <FormField label='Reason'>
              <SelectSimple
                ariaLabel='Suppression reason'
                value={suppressionReasonDraft}
                onValueChange={(value) =>
                  setSuppressionReasonDraft(value as FilemakerEmailCampaignSuppressionReason)
                }
                options={FILEMAKER_SUPPRESSION_REASON_OPTIONS}
              />
            </FormField>
          </div>
          <FormField label='Notes (Internal)'>
            <Textarea
              rows={2}
              placeholder='Why is this address suppressed?'
              value={suppressionNotesDraft}
              onChange={(e) => setSuppressionNotesDraft(e.target.value)}
            />
          </FormField>
          <Button
            type='button'
            size='sm'
            className='w-full'
            onClick={() => { void handleAddSuppressionEntry(); }}
            disabled={!suppressionEmailDraft || isUpdatePending}
          >
            Add Suppression
          </Button>
          <div className='space-y-2 pt-2'>
            <div className='text-[11px] uppercase tracking-[0.22em] text-gray-500'>
              Current Suppressions ({suppressionEntries.length})
            </div>
            {suppressionEntries.length === 0 ? (
              <div className='text-xs text-gray-500'>No manual suppressions active.</div>
            ) : (
              <div className='max-h-[200px] space-y-2 overflow-y-auto pr-2'>
                {suppressionEntries.map((entry) => (
                  <div
                    key={entry.emailAddress}
                    className='flex items-center justify-between gap-2 rounded-md border border-border/40 bg-card/40 p-2 text-xs'
                  >
                    <div className='min-w-0 flex-1 truncate'>
                      <div className='font-medium text-white'>{entry.emailAddress}</div>
                      <div className='text-[10px] text-gray-500'>
                        {entry.reason} • {entry.notes || 'No notes'}
                      </div>
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='xs'
                      className='h-6 text-rose-400 hover:text-rose-300'
                      onClick={() => { void handleRemoveSuppressionEntry(entry.emailAddress); }}
                      disabled={isUpdatePending}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className='space-y-4 rounded-md border border-border/60 bg-card/25 p-4'>
          <div className='text-sm font-semibold text-white'>Preference Link Tokens</div>
          <div className='text-xs text-gray-400'>
            Configure global opt-out and preference management links. These will replace tokens like{' '}
            <code>{'{UNSUBSCRIBE_LINK}'}</code> in the body.
          </div>
          <FormField label='Unsubscribe Link Template'>
            <Input value={unsubscribeLinkTemplate} readOnly />
          </FormField>
          <FormField label='Preferences Link Template'>
            <Input value={preferencesLinkTemplate} readOnly />
          </FormField>
          <FormField label='Manage All Preferences Link Template'>
            <Input value={manageAllPreferencesLinkTemplate} readOnly />
          </FormField>
          <div className='rounded-md bg-sky-500/10 p-3 text-[11px] text-sky-300/80'>
            Note: Link templates are currently globally managed and read-only per-campaign.
          </div>
        </div>
      </div>
    </FormSection>
  );
};
