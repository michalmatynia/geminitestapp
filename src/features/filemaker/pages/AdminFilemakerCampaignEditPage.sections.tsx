'use client';

import React from 'react';
import { DocumentWysiwygEditor } from '@/features/document-editor/components/DocumentWysiwygEditor';
import {
  Badge,
  Button,
  Checkbox,
  FormField,
  FormSection,
  Input,
  MultiSelect,
  SelectSimple,
  Textarea,
} from '@/shared/ui';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignLifecycleStatus,
  FilemakerEmailCampaignLaunchMode,
  FilemakerEmailCampaignSuppressionReason,
  FilemakerPartyKind,
  FilemakerPartyReference,
} from '../types';
import {
  CAMPAIGN_STATUS_OPTIONS as FILEMAKER_CAMPAIGN_STATUS_OPTIONS,
  EMAIL_STATUS_OPTIONS as FILEMAKER_EMAIL_STATUS_OPTIONS,
  formatCommaSeparatedValues as filemakerFormatCommaSeparatedValues,
  LAUNCH_MODE_OPTIONS as FILEMAKER_LAUNCH_MODE_OPTIONS,
  parseCommaSeparatedValues as filemakerParseCommaSeparatedValues,
  PARTY_KIND_OPTIONS as FILEMAKER_PARTY_KIND_OPTIONS,
  RECURRING_FREQUENCY_OPTIONS as FILEMAKER_RECURRING_FREQUENCY_OPTIONS,
  SUPPRESSION_REASON_OPTIONS as FILEMAKER_SUPPRESSION_REASON_OPTIONS,
  toDateTimeLocalValue as filemakerToDateTimeLocalValue,
  WEEKDAY_OPTIONS as FILEMAKER_WEEKDAY_OPTIONS,
  getRunActions,
} from './AdminFilemakerCampaignEditPage.utils';
import { formatTimestamp } from './filemaker-page-utils';

// ... (existing sections)

interface CampaignAnalyticsSectionProps {
  analytics: any;
}

export const CampaignAnalyticsSection = ({ analytics }: CampaignAnalyticsSectionProps) => (
  <FormSection title='Campaign Analytics' className='space-y-4 p-4'>
    <div className='flex flex-wrap gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Total Runs: {analytics.totalRuns}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Live Runs: {analytics.liveRunCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Dry Runs: {analytics.dryRunCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Event Count: {analytics.eventCount}
      </Badge>
    </div>
    <div className='grid gap-3 text-sm text-gray-300 md:grid-cols-2 xl:grid-cols-4'>
      <div className='rounded-md border border-border/60 bg-card/25 p-3'>
        <div className='text-[11px] text-gray-500'>Recipients Processed</div>
        <div className='mt-1 text-lg font-semibold text-white'>
          {analytics.processedCount}/{analytics.totalRecipients}
        </div>
        <div className='text-[11px] text-gray-500'>
          Completion rate: {analytics.completionRatePercent}%
        </div>
      </div>
      <div className='rounded-md border border-border/60 bg-card/25 p-3'>
        <div className='text-[11px] text-gray-500'>Delivery Outcome</div>
        <div className='mt-1 text-lg font-semibold text-white'>{analytics.sentCount} sent</div>
        <div className='text-[11px] text-gray-500'>
          Delivery rate: {analytics.deliveryRatePercent}%
        </div>
      </div>
      <div className='rounded-md border border-border/60 bg-card/25 p-3'>
        <div className='text-[11px] text-gray-500'>Failures</div>
        <div className='mt-1 text-lg font-semibold text-white'>
          {analytics.failedCount + analytics.bouncedCount}
        </div>
        <div className='text-[11px] text-gray-500'>
          Bounce rate: {analytics.bounceRatePercent}% • Failure rate: {analytics.failureRatePercent}%
        </div>
      </div>
      <div className='rounded-md border border-border/60 bg-card/25 p-3'>
        <div className='text-[11px] text-gray-500'>Suppression Impact</div>
        <div className='mt-1 text-lg font-semibold text-white'>
          {analytics.suppressionImpactCount}
        </div>
        <div className='text-[11px] text-gray-500'>Addresses currently filtered from preview</div>
      </div>
      <div className='rounded-md border border-border/60 bg-card/25 p-3'>
        <div className='text-[11px] text-gray-500'>Opens</div>
        <div className='mt-1 text-lg font-semibold text-white'>{analytics.openCount}</div>
        <div className='text-[11px] text-gray-500'>
          Open rate: {analytics.openRatePercent}% • Unique opens: {analytics.uniqueOpenCount} ({analytics.uniqueOpenRatePercent}%)
        </div>
      </div>
      <div className='rounded-md border border-border/60 bg-card/25 p-3'>
        <div className='text-[11px] text-gray-500'>Clicks</div>
        <div className='mt-1 text-lg font-semibold text-white'>{analytics.clickCount}</div>
        <div className='text-[11px] text-gray-500'>
          Click rate: {analytics.clickRatePercent}% • Unique clicks: {analytics.uniqueClickCount} ({analytics.uniqueClickRatePercent}%)
        </div>
      </div>
      <div className='rounded-md border border-border/60 bg-card/25 p-3'>
        <div className='text-[11px] text-gray-500'>Opt-outs</div>
        <div className='mt-1 text-lg font-semibold text-white'>{analytics.unsubscribeCount}</div>
        <div className='text-[11px] text-gray-500'>
          Unsubscribe rate: {analytics.unsubscribeRatePercent}%
        </div>
      </div>
      <div className='rounded-md border border-border/60 bg-card/25 p-3'>
        <div className='text-[11px] text-gray-500'>Restored</div>
        <div className='mt-1 text-lg font-semibold text-white'>{analytics.resubscribeCount}</div>
        <div className='text-[11px] text-gray-500'>
          Restore rate: {analytics.resubscribeRatePercent}% • Net opt-outs:{' '}
          {analytics.netUnsubscribeCount} ({analytics.netUnsubscribeRatePercent}%)
        </div>
      </div>
    </div>
    <div className='grid gap-3 text-[11px] text-gray-500 md:grid-cols-3'>
      <div>
        Latest run: {analytics.latestRunAt ? formatTimestamp(analytics.latestRunAt) : 'No runs yet'}
      </div>
      <div>Latest run status: {analytics.latestRunStatus ?? 'No runs yet'}</div>
      <div>
        Latest activity:{' '}
        {analytics.latestActivityAt
          ? formatTimestamp(analytics.latestActivityAt)
          : 'No campaign activity yet'}
      </div>
      <div>
        Latest open:{' '}
        {analytics.latestOpenAt ? formatTimestamp(analytics.latestOpenAt) : 'No open tracking yet'}
      </div>
      <div>
        Latest click:{' '}
        {analytics.latestClickAt ? formatTimestamp(analytics.latestClickAt) : 'No click tracking yet'}
      </div>
      <div>
        Latest opt-out:{' '}
        {analytics.latestUnsubscribeAt
          ? formatTimestamp(analytics.latestUnsubscribeAt)
          : 'No unsubscribe activity yet'}
      </div>
      <div>
        Latest restore:{' '}
        {analytics.latestResubscribeAt
          ? formatTimestamp(analytics.latestResubscribeAt)
          : 'No restore activity yet'}
      </div>
    </div>
    <div className='space-y-3'>
      <div className='text-[11px] uppercase tracking-[0.22em] text-gray-500'>Top clicked links</div>
      {analytics.topClickedLinks.length === 0 ? (
        <div className='text-sm text-gray-500'>
          No tracked click activity has been recorded for this campaign yet.
        </div>
      ) : (
        analytics.topClickedLinks.map((link: any) => (
          <div
            key={link.targetUrl}
            className='rounded-md border border-border/60 bg-card/25 p-3 text-sm text-gray-300'
          >
            <div className='break-all font-medium text-sky-300'>{link.targetUrl}</div>
            <div className='mt-1 text-[11px] text-gray-500'>
              {link.clickCount} clicks • {link.uniqueDeliveryCount} unique deliveries • rate{' '}
              {link.clickRatePercent}%
            </div>
            <div className='text-[11px] text-gray-500'>
              Latest click: {formatTimestamp(link.latestClickAt)}
            </div>
          </div>
        ))
      )}
    </div>
  </FormSection>
);

interface RecentRunsSectionProps {
  recentRuns: any[];
  deliveryRegistry: any;
  getFilemakerEmailCampaignDeliveriesForRun: (registry: any, runId: string) => any[];
  summarizeFilemakerEmailCampaignRunDeliveries: (deliveries: any[]) => any;
  handleRunStatusChange: (runId: string, nextStatus: any) => Promise<void>;
  isUpdatePending: boolean;
  router: any;
}

export const RecentRunsSection = ({
  recentRuns,
  deliveryRegistry,
  getFilemakerEmailCampaignDeliveriesForRun,
  summarizeFilemakerEmailCampaignRunDeliveries,
  handleRunStatusChange,
  isUpdatePending,
  router,
}: RecentRunsSectionProps) => (
  <FormSection title='Recent Runs' className='space-y-4 p-4'>
    {recentRuns.length === 0 ? (
      <div className='text-sm text-gray-500'>
        No runs yet. Create a dry run or launch the campaign to start monitoring progress.
      </div>
    ) : (
      recentRuns.map((run: any) => {
        const runDeliveries = getFilemakerEmailCampaignDeliveriesForRun(deliveryRegistry, run.id);
        const metrics =
          runDeliveries.length > 0
            ? summarizeFilemakerEmailCampaignRunDeliveries(runDeliveries)
            : {
                recipientCount: run.recipientCount,
                deliveredCount: run.deliveredCount,
                failedCount: run.failedCount,
                skippedCount: run.skippedCount,
              };
        const progressBase = metrics.recipientCount || 1;
        const progressPercent = Math.round(
          ((metrics.deliveredCount + metrics.failedCount + metrics.skippedCount) / progressBase) * 100
        );
        return (
          <div key={run.id} className='space-y-3 rounded-md border border-border/60 bg-card/25 p-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div className='space-y-1'>
                <div className='text-sm font-medium text-white'>{run.id}</div>
                <div className='text-[11px] text-gray-400'>
                  {run.mode === 'dry_run' ? 'Dry run' : 'Live run'} • {formatTimestamp(run.createdAt)}
                </div>
              </div>
              <Badge variant='outline' className='text-[10px] capitalize'>
                {run.status}
              </Badge>
            </div>
            <div className='grid gap-2 text-[11px] text-gray-500 md:grid-cols-4'>
              <div>Recipients: {metrics.recipientCount}</div>
              <div>Delivered: {metrics.deliveredCount}</div>
              <div>Failed: {metrics.failedCount}</div>
              <div>Skipped: {metrics.skippedCount}</div>
            </div>
            <div className='text-[11px] text-gray-500'>Progress: {progressPercent}%</div>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={(): void => {
                  router.push(`/admin/filemaker/campaigns/runs/${encodeURIComponent(run.id)}`);
                }}
              >
                Open Run Monitor
              </Button>
              {getRunActions(run).map((action) => (
                <Button
                  key={`${run.id}-${action.nextStatus}`}
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={isUpdatePending}
                  onClick={(): void => {
                    void handleRunStatusChange(run.id, action.nextStatus);
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        );
      })
    )}
  </FormSection>
);

// ... (existing sections)

interface DeliveryGovernanceSectionProps {
  suppressionEntries: any[];
  suppressionEmailDraft: string;
  setSuppressionEmailDraft: (val: string) => void;
  suppressionReasonDraft: FilemakerEmailCampaignSuppressionReason;
  setSuppressionReasonDraft: (val: FilemakerEmailCampaignSuppressionReason) => void;
  suppressionNotesDraft: string;
  setSuppressionNotesDraft: (val: string) => void;
  handleAddSuppressionEntry: () => void;
  handleRemoveSuppressionEntry: (email: string) => void;
  isUpdatePending: boolean;
  unsubscribeLinkTemplate: string;
  preferencesLinkTemplate: string;
  manageAllPreferencesLinkTemplate: string;
}

export const DeliveryGovernanceSection = ({
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
  unsubscribeLinkTemplate,
  preferencesLinkTemplate,
  manageAllPreferencesLinkTemplate,
}: DeliveryGovernanceSectionProps) => (
  <FormSection title='Delivery Governance' className='space-y-4 p-4'>
    <div className='flex flex-wrap gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Suppressed Addresses: {suppressionEntries.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Auto-bounce Blocking: Enabled
      </Badge>
    </div>
    <div className='grid gap-4 md:grid-cols-3'>
      <FormField label='Public unsubscribe link template'>
        <Input
          readOnly
          value={unsubscribeLinkTemplate}
          aria-label='Public unsubscribe link template'
          title='Public unsubscribe link template'
        />
      </FormField>
      <FormField label='Public preferences link template'>
        <Input
          readOnly
          value={preferencesLinkTemplate}
          aria-label='Public preferences link template'
          title='Public preferences link template'
        />
      </FormField>
      <FormField label='Public all-campaign preferences link template'>
        <Input
          readOnly
          value={manageAllPreferencesLinkTemplate}
          aria-label='Public all-campaign preferences link template'
          title='Public all-campaign preferences link template'
        />
      </FormField>
    </div>
    <div className='text-xs leading-5 text-gray-400'>
      Use <code>{'{{unsubscribe_url}}'}</code> in your campaign body for a signed recipient
      unsubscribe link, <code>{'{{preferences_url}}'}</code> for the signed campaign-scoped
      preferences center, and <code>{'{{manage_all_preferences_url}}'}</code> for a signed
      address-wide preferences center across all Filemaker campaigns. Use{' '}
      <code>{'{{open_tracking_pixel}}'}</code> in HTML content for a hidden signed open tracking
      pixel, <code>{'{{open_tracking_url}}'}</code> if you need the raw tracking URL,
      <code>{'{{click_tracking_url:https://example.com}}'}</code> for signed click redirects, and{' '}
      <code>{'{{email}}'}</code> for plain-text personalization.
    </div>
    <div className='grid gap-4 md:grid-cols-2'>
      <FormField label='Suppressed email address'>
        <Input
          value={suppressionEmailDraft}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setSuppressionEmailDraft(event.target.value);
          }}
          placeholder='blocked@example.com'
          aria-label='Suppressed email address'
          title='Suppressed email address'
        />
      </FormField>
      <FormField label='Suppression reason'>
        <SelectSimple
          value={suppressionReasonDraft}
          onValueChange={(value: string): void => {
            setSuppressionReasonDraft(value as FilemakerEmailCampaignSuppressionReason);
          }}
          options={FILEMAKER_SUPPRESSION_REASON_OPTIONS}
          placeholder='Select suppression reason'
          size='sm'
          ariaLabel='Suppression reason'
          title='Suppression reason'
        />
      </FormField>
      <FormField label='Notes' className='md:col-span-2'>
        <Textarea
          value={suppressionNotesDraft}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            setSuppressionNotesDraft(event.target.value);
          }}
          rows={2}
          placeholder='Optional reason or unsubscribe source'
          aria-label='Suppression notes'
        />
      </FormField>
    </div>
    <div className='flex justify-end'>
      <Button
        type='button'
        size='sm'
        variant='outline'
        disabled={isUpdatePending || !suppressionEmailDraft.trim()}
        onClick={(): void => {
          void handleAddSuppressionEntry();
        }}
      >
        Add Suppression
      </Button>
    </div>
    <div className='space-y-2'>
      {suppressionEntries.length === 0 ? (
        <div className='text-sm text-gray-500'>
          No suppressed addresses yet. Bounced addresses will be added automatically.
        </div>
      ) : (
        suppressionEntries.slice(0, 12).map((entry) => (
          <div
            key={entry.id}
            className='flex flex-wrap items-start justify-between gap-3 rounded-md border border-border/60 bg-card/25 p-3'
          >
            <div className='space-y-1'>
              <div className='text-sm font-medium text-white'>{entry.emailAddress}</div>
              <div className='flex flex-wrap gap-2'>
                <Badge variant='outline' className='text-[10px] capitalize'>
                  {entry.reason.replace('_', ' ')}
                </Badge>
                {entry.actor ? (
                  <Badge variant='outline' className='text-[10px]'>
                    {entry.actor}
                  </Badge>
                ) : null}
              </div>
              <div className='text-[11px] text-gray-500'>
                Added: {formatTimestamp(entry.createdAt)}
              </div>
              {entry.notes ? <div className='text-[11px] text-gray-400'>{entry.notes}</div> : null}
            </div>
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={isUpdatePending}
              onClick={(): void => {
                void handleRemoveSuppressionEntry(entry.emailAddress);
              }}
            >
              Remove
            </Button>
          </div>
        ))
      )}
    </div>
  </FormSection>
);

interface AudiencePreviewSectionProps {
  preview: {
    totalLinkedEmailCount: number;
    recipients: any[];
    excludedCount: number;
    suppressedCount: number;
    dedupedCount: number;
    sampleRecipients: any[];
  };
  launchEvaluation: {
    isEligible: boolean;
    blockers: string[];
    nextEligibleAt?: string | null;
  };
}

export const AudiencePreviewSection = ({
  preview,
  launchEvaluation,
}: AudiencePreviewSectionProps) => (
  <FormSection title='Audience Preview' className='space-y-4 p-4'>
    <div className='flex flex-wrap gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Linked Emails: {preview.totalLinkedEmailCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Matched: {preview.recipients.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Excluded: {preview.excludedCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Suppressed: {preview.suppressedCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Deduped Away: {preview.dedupedCount}
      </Badge>
    </div>
    <div className='rounded-md border border-border/60 bg-card/25 p-3 text-sm text-gray-300'>
      {launchEvaluation.isEligible ? (
        <span>Campaign is eligible to launch with the current audience and conditions.</span>
      ) : (
        <div className='space-y-2'>
          <div className='font-medium text-white'>Launch blockers</div>
          <ul className='list-disc space-y-1 pl-5 text-sm text-gray-300'>
            {launchEvaluation.blockers.map((blocker: string) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
          {launchEvaluation.nextEligibleAt && (
            <div className='text-[11px] text-gray-500'>
              Next eligible at: {formatTimestamp(launchEvaluation.nextEligibleAt)}
            </div>
          )}
        </div>
      )}
    </div>
    <div className='space-y-2'>
      {preview.sampleRecipients.length === 0 ? (
        <div className='text-sm text-gray-500'>No recipients currently match this campaign.</div>
      ) : (
        preview.sampleRecipients.map((recipient) => (
          <div
            key={`${recipient.partyKind}-${recipient.partyId}-${recipient.email}`}
            className='rounded-md border border-border/60 bg-card/25 p-3'
          >
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <div className='text-sm font-medium text-white'>{recipient.partyName}</div>
                <div className='text-[11px] text-gray-400'>
                  {recipient.email} • {recipient.partyKind}
                </div>
              </div>
              <Badge variant='outline' className='text-[10px] capitalize'>
                {recipient.emailStatus}
              </Badge>
            </div>
            <div className='mt-1 text-[11px] text-gray-500'>
              {recipient.city || 'Unknown city'}, {recipient.country || 'Unknown country'}
            </div>
          </div>
        ))
      )}
    </div>
  </FormSection>
);

interface SectionProps {
  draft: FilemakerEmailCampaign;
  setDraft: React.Dispatch<React.SetStateAction<FilemakerEmailCampaign>>;
}

export const CampaignDetailsSection = ({ draft, setDraft }: SectionProps) => (
  <FormSection title='Campaign Details' className='space-y-4 p-4'>
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Campaign name' className='md:col-span-2'>
        <Input
          value={draft.name}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setDraft((previous) => ({ ...previous, name: event.target.value }));
          }}
          placeholder='Spring outreach to exhibitors'
          aria-label='Campaign name'
          title='Campaign name'
        />
      </FormField>
      <FormField label='Status'>
        <SelectSimple
          value={draft.status}
          onValueChange={(value: string): void => {
            setDraft((previous) => ({
              ...previous,
              status: value as FilemakerEmailCampaignLifecycleStatus,
            }));
          }}
          options={FILEMAKER_CAMPAIGN_STATUS_OPTIONS}
          placeholder='Select campaign status'
          size='sm'
          ariaLabel='Select campaign status'
          title='Select campaign status'
        />
      </FormField>
      <FormField label='From name'>
        <Input
          value={draft.fromName ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setDraft((previous) => ({ ...previous, fromName: event.target.value || null }));
          }}
          placeholder='Case Resolver Team'
          aria-label='From name'
          title='From name'
        />
      </FormField>
      <FormField label='Reply-to email'>
        <Input
          value={draft.replyToEmail ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setDraft((previous) => ({
              ...previous,
              replyToEmail: event.target.value || null,
            }));
          }}
          placeholder='events@example.com'
          aria-label='Reply-to email'
          title='Reply-to email'
        />
      </FormField>
      <FormField label='Description' className='md:col-span-2'>
        <Textarea
          value={draft.description ?? ''}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            setDraft((previous) => ({
              ...previous,
              description: event.target.value || null,
            }));
          }}
          placeholder='Describe the purpose and timing of this campaign.'
          aria-label='Campaign description'
        />
      </FormField>
    </div>
  </FormSection>
);

export const ContentSection = ({ draft, setDraft }: SectionProps) => (
  <FormSection title='Content' className='space-y-4 p-4'>
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Subject' className='md:col-span-2'>
        <Input
          value={draft.subject}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setDraft((previous) => ({ ...previous, subject: event.target.value }));
          }}
          placeholder='Invitation to the next Filemaker event'
          aria-label='Campaign subject'
          title='Campaign subject'
        />
      </FormField>
      <FormField label='Preview text' className='md:col-span-2'>
        <Input
          value={draft.previewText ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setDraft((previous) => ({
              ...previous,
              previewText: event.target.value || null,
            }));
          }}
          placeholder='A short preview shown in inbox clients.'
          aria-label='Campaign preview text'
          title='Campaign preview text'
        />
      </FormField>
      <FormField
        label='HTML body'
        description='Write the primary campaign body with the shared rich-text editor.'
        className='md:col-span-2'
      >
        <DocumentWysiwygEditor
          value={draft.bodyHtml ?? ''}
          onChange={(nextValue: string): void => {
            setDraft((previous) => ({ ...previous, bodyHtml: nextValue || null }));
          }}
          placeholder='Write the HTML version of the campaign.'
          enableAdvancedTools
          allowFontFamily
          allowTextAlign
          surfaceClassName='min-h-[320px]'
          editorContentClassName='[&_.ProseMirror]:min-h-[320px]'
        />
      </FormField>
      <FormField
        label='Plain-text override'
        description='Optional. Leave blank to derive plain text from the HTML body during delivery.'
        className='md:col-span-2'
      >
        <Textarea
          value={draft.bodyText ?? ''}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            setDraft((previous) => ({ ...previous, bodyText: event.target.value || null }));
          }}
          rows={6}
          placeholder='Optional plain-text fallback or custom text-only variant.'
          aria-label='Campaign plain-text override'
        />
      </FormField>
    </div>
  </FormSection>
);

interface AudienceSectionProps extends SectionProps {
  eventOptions: Array<{ value: string; label: string }>;
  organizationOptions: Array<{ value: string; label: string }>;
  partyOptions: Array<{ value: string; label: string }>;
  decodeFilemakerPartyReference: (value: string) => FilemakerPartyReference | null;
}

export const AudienceSection = ({
  draft,
  setDraft,
  eventOptions,
  organizationOptions,
  partyOptions,
  decodeFilemakerPartyReference,
}: AudienceSectionProps) => (
  <FormSection title='Audience Rules' className='space-y-4 p-4'>
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Party kinds'>
        <MultiSelect
          options={FILEMAKER_PARTY_KIND_OPTIONS}
          selected={draft.audience.partyKinds}
          onChange={(values: string[]): void => {
            setDraft((previous) => ({
              ...previous,
              audience: {
                ...previous.audience,
                partyKinds: values as FilemakerPartyKind[],
              },
            }));
          }}
          placeholder='Select party kinds'
        />
      </FormField>
      <FormField label='Email statuses'>
        <MultiSelect
          options={FILEMAKER_EMAIL_STATUS_OPTIONS}
          selected={draft.audience.emailStatuses}
          onChange={(values: string[]): void => {
            setDraft((previous) => ({
              ...previous,
              audience: {
                ...previous.audience,
                emailStatuses: values as FilemakerEmailCampaign['audience']['emailStatuses'],
              },
            }));
          }}
          placeholder='Select email statuses'
        />
      </FormField>
      <FormField label='Event focus'>
        <MultiSelect
          options={eventOptions}
          selected={draft.audience.eventIds}
          onChange={(values: string[]): void => {
            setDraft((previous) => ({
              ...previous,
              audience: {
                ...previous.audience,
                eventIds: values,
              },
            }));
          }}
          placeholder='Select events'
        />
      </FormField>
      <FormField label='Organization focus'>
        <MultiSelect
          options={organizationOptions}
          selected={draft.audience.organizationIds}
          onChange={(values: string[]): void => {
            setDraft((previous) => ({
              ...previous,
              audience: {
                ...previous.audience,
                organizationIds: values,
              },
            }));
          }}
          placeholder='Select organizations'
        />
      </FormField>
      <FormField label='Include specific parties'>
        <MultiSelect
          options={partyOptions}
          selected={draft.audience.includePartyReferences.map(
            (reference) => `${reference.kind}:${reference.id}`
          )}
          onChange={(values: string[]): void => {
            setDraft((previous) => ({
              ...previous,
              audience: {
                ...previous.audience,
                includePartyReferences: values
                  .map((value: string): FilemakerPartyReference | null =>
                    decodeFilemakerPartyReference(value)
                  )
                  .filter(
                    (value: FilemakerPartyReference | null): value is FilemakerPartyReference =>
                      Boolean(value)
                  ),
              },
            }));
          }}
          placeholder='Select included parties'
        />
      </FormField>
      <FormField label='Exclude specific parties'>
        <MultiSelect
          options={partyOptions}
          selected={draft.audience.excludePartyReferences.map(
            (reference) => `${reference.kind}:${reference.id}`
          )}
          onChange={(values: string[]): void => {
            setDraft((previous) => ({
              ...previous,
              audience: {
                ...previous.audience,
                excludePartyReferences: values
                  .map((value: string): FilemakerPartyReference | null =>
                    decodeFilemakerPartyReference(value)
                  )
                  .filter(
                    (value: FilemakerPartyReference | null): value is FilemakerPartyReference =>
                      Boolean(value)
                  ),
              },
            }));
          }}
          placeholder='Select excluded parties'
        />
      </FormField>
      <FormField label='Countries (comma separated)'>
        <Input
          value={filemakerFormatCommaSeparatedValues(draft.audience.countries)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setDraft((previous) => ({
              ...previous,
              audience: {
                ...previous.audience,
                countries: filemakerParseCommaSeparatedValues(event.target.value),
              },
            }));
          }}
          placeholder='Poland, Germany'
          aria-label='Audience countries'
          title='Audience countries'
        />
      </FormField>
      <FormField label='Cities (comma separated)'>
        <Input
          value={filemakerFormatCommaSeparatedValues(draft.audience.cities)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setDraft((previous) => ({
              ...previous,
              audience: {
                ...previous.audience,
                cities: filemakerParseCommaSeparatedValues(event.target.value),
              },
            }));
          }}
          placeholder='Warsaw, Berlin'
          aria-label='Audience cities'
          title='Audience cities'
        />
      </FormField>
      <FormField label='Audience limit'>
        <Input
          type='number'
          value={draft.audience.limit ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const next = Number(event.target.value);
            setDraft((previous) => ({
              ...previous,
              audience: {
                ...previous.audience,
                limit: Number.isFinite(next) && next > 0 ? Math.trunc(next) : null,
              },
            }));
          }}
          placeholder='Leave empty for no limit'
          aria-label='Audience limit'
          title='Audience limit'
        />
      </FormField>
      <div className='flex items-center gap-3 rounded-md border border-border/60 bg-card/25 p-3 md:col-span-2'>
        <Checkbox
          id='filemaker-campaign-dedupe'
          checked={draft.audience.dedupeByEmail}
          onCheckedChange={(value): void => {
            setDraft((previous) => ({
              ...previous,
              audience: {
                ...previous.audience,
                dedupeByEmail: Boolean(value),
              },
            }));
          }}
        />
        <label htmlFor='filemaker-campaign-dedupe' className='cursor-pointer text-sm text-white'>
          Dedupe recipients by email address before launch
        </label>
      </div>
    </div>
  </FormSection>
);

export const LaunchSection = ({ draft, setDraft }: SectionProps) => (
  <FormSection title='Launch Conditions' className='space-y-4 p-4'>
    <div className='grid gap-3 md:grid-cols-2'>
      <FormField label='Launch mode'>
        <SelectSimple
          value={draft.launch.mode}
          onValueChange={(value: string): void => {
            setDraft((previous) => ({
              ...previous,
              launch: {
                ...previous.launch,
                mode: value as FilemakerEmailCampaignLaunchMode,
                recurring:
                  value === 'recurring'
                    ? previous.launch.recurring ?? {
                        frequency: 'weekly',
                        interval: 1,
                        weekdays: [1, 2, 3, 4, 5],
                        hourStart: null,
                        hourEnd: null,
                      }
                    : null,
              },
            }));
          }}
          options={FILEMAKER_LAUNCH_MODE_OPTIONS}
          placeholder='Select launch mode'
          size='sm'
          ariaLabel='Select launch mode'
          title='Select launch mode'
        />
      </FormField>
      <FormField label='Minimum audience size'>
        <Input
          type='number'
          value={draft.launch.minAudienceSize}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const next = Number(event.target.value);
            setDraft((previous) => ({
              ...previous,
              launch: {
                ...previous.launch,
                minAudienceSize: Number.isFinite(next) && next >= 0 ? Math.trunc(next) : 0,
              },
            }));
          }}
          aria-label='Minimum audience size'
          title='Minimum audience size'
        />
      </FormField>
      {draft.launch.mode === 'scheduled' && (
        <FormField label='Scheduled at' className='md:col-span-2'>
          <Input
            type='datetime-local'
            value={filemakerToDateTimeLocalValue(draft.launch.scheduledAt)}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setDraft((previous) => ({
                ...previous,
                launch: {
                  ...previous.launch,
                  scheduledAt: event.target.value || null,
                },
              }));
            }}
            aria-label='Scheduled launch time'
            title='Scheduled launch time'
          />
        </FormField>
      )}
      <div className='flex items-center gap-3 rounded-md border border-border/60 bg-card/25 p-3'>
        <Checkbox
          id='filemaker-campaign-weekdays'
          checked={draft.launch.onlyWeekdays}
          onCheckedChange={(value): void => {
            setDraft((previous) => ({
              ...previous,
              launch: {
                ...previous.launch,
                onlyWeekdays: Boolean(value),
              },
            }));
          }}
        />
        <label htmlFor='filemaker-campaign-weekdays' className='cursor-pointer text-sm text-white'>
          Restrict launches to weekdays only
        </label>
      </div>
      <div className='flex items-center gap-3 rounded-md border border-border/60 bg-card/25 p-3'>
        <Checkbox
          id='filemaker-campaign-approval'
          checked={draft.launch.requireApproval}
          onCheckedChange={(value): void => {
            setDraft((previous) => ({
              ...previous,
              launch: {
                ...previous.launch,
                requireApproval: Boolean(value),
              },
            }));
          }}
        />
        <label htmlFor='filemaker-campaign-approval' className='cursor-pointer text-sm text-white'>
          Require manual approval before launch
        </label>
      </div>
      <FormField label='Allowed hour start'>
        <Input
          type='number'
          min={0}
          max={23}
          value={draft.launch.allowedHourStart ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const next = Number(event.target.value);
            setDraft((previous) => ({
              ...previous,
              launch: {
                ...previous.launch,
                allowedHourStart:
                  Number.isFinite(next) && next >= 0 && next <= 23 ? Math.trunc(next) : null,
              },
            }));
          }}
          aria-label='Allowed hour start'
          title='Allowed hour start'
        />
      </FormField>
      <FormField label='Allowed hour end'>
        <Input
          type='number'
          min={0}
          max={23}
          value={draft.launch.allowedHourEnd ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const next = Number(event.target.value);
            setDraft((previous) => ({
              ...previous,
              launch: {
                ...previous.launch,
                allowedHourEnd:
                  Number.isFinite(next) && next >= 0 && next <= 23 ? Math.trunc(next) : null,
              },
            }));
          }}
          aria-label='Allowed hour end'
          title='Allowed hour end'
        />
      </FormField>
      <FormField label='Pause if bounce rate exceeds (%)'>
        <Input
          type='number'
          min={0}
          max={100}
          value={draft.launch.pauseOnBounceRatePercent ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            const next = Number(event.target.value);
            setDraft((previous) => ({
              ...previous,
              launch: {
                ...previous.launch,
                pauseOnBounceRatePercent:
                  Number.isFinite(next) && next >= 0 && next <= 100 ? next : null,
              },
            }));
          }}
          aria-label='Bounce rate pause threshold'
          title='Bounce rate pause threshold'
        />
      </FormField>
      <FormField label='Timezone'>
        <Input
          value={draft.launch.timezone ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setDraft((previous) => ({
              ...previous,
              launch: {
                ...previous.launch,
                timezone: event.target.value || null,
              },
            }));
          }}
          placeholder='UTC'
          aria-label='Launch timezone'
          title='Launch timezone'
        />
      </FormField>
      {draft.launch.requireApproval && (
        <>
          <div className='flex items-center gap-3 rounded-md border border-border/60 bg-card/25 p-3 md:col-span-2'>
            <Checkbox
              id='filemaker-campaign-approved'
              checked={Boolean(draft.approvalGrantedAt)}
              onCheckedChange={(value): void => {
                setDraft((previous) => ({
                  ...previous,
                  approvalGrantedAt: value ? previous.approvalGrantedAt ?? new Date().toISOString() : null,
                }));
              }}
            />
            <label htmlFor='filemaker-campaign-approved' className='cursor-pointer text-sm text-white'>
              Launch approved
            </label>
          </div>
          <FormField label='Approved by' className='md:col-span-2'>
            <Input
              value={draft.approvedBy ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setDraft((previous) => ({
                  ...previous,
                  approvedBy: event.target.value || null,
                }));
              }}
              placeholder='Operations manager'
              aria-label='Approved by'
              title='Approved by'
            />
          </FormField>
        </>
      )}

      {draft.launch.mode === 'recurring' && draft.launch.recurring && (
        <>
          <FormField label='Recurring frequency'>
            <SelectSimple
              value={draft.launch.recurring.frequency}
              onValueChange={(value: string): void => {
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    recurring: {
                      ...(previous.launch.recurring ?? {
                        frequency: 'weekly',
                        interval: 1,
                        weekdays: [1, 2, 3, 4, 5],
                        hourStart: null,
                        hourEnd: null,
                      }),
                      frequency: value as 'daily' | 'weekly' | 'monthly',
                    },
                  },
                }));
              }}
              options={FILEMAKER_RECURRING_FREQUENCY_OPTIONS}
              placeholder='Select recurring frequency'
              size='sm'
              ariaLabel='Select recurring frequency'
              title='Select recurring frequency'
            />
          </FormField>
          <FormField label='Recurring interval'>
            <Input
              type='number'
              value={draft.launch.recurring.interval}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                const next = Number(event.target.value);
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    recurring: {
                      ...(previous.launch.recurring ?? {
                        frequency: 'weekly',
                        interval: 1,
                        weekdays: [1, 2, 3, 4, 5],
                        hourStart: null,
                        hourEnd: null,
                      }),
                      interval: Number.isFinite(next) && next > 0 ? Math.trunc(next) : 1,
                    },
                  },
                }));
              }}
              aria-label='Recurring interval'
              title='Recurring interval'
            />
          </FormField>
          <FormField label='Recurring weekdays' className='md:col-span-2'>
            <MultiSelect
              options={FILEMAKER_WEEKDAY_OPTIONS}
              selected={draft.launch.recurring.weekdays.map(String)}
              onChange={(values: string[]): void => {
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    recurring: {
                      ...(previous.launch.recurring ?? {
                        frequency: 'weekly',
                        interval: 1,
                        weekdays: [1, 2, 3, 4, 5],
                        hourStart: null,
                        hourEnd: null,
                      }),
                      weekdays: values
                        .map((value: string): number => Number(value))
                        .filter(
                          (value: number): boolean =>
                            Number.isInteger(value) && value >= 0 && value <= 6
                        ),
                    },
                  },
                }));
              }}
              placeholder='Select recurring weekdays'
            />
          </FormField>
          <FormField label='Recurring hour start'>
            <Input
              type='number'
              min={0}
              max={23}
              value={draft.launch.recurring.hourStart ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                const next = Number(event.target.value);
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    recurring: {
                      ...(previous.launch.recurring ?? {
                        frequency: 'weekly',
                        interval: 1,
                        weekdays: [1, 2, 3, 4, 5],
                        hourStart: null,
                        hourEnd: null,
                      }),
                      hourStart:
                        Number.isFinite(next) && next >= 0 && next <= 23 ? Math.trunc(next) : null,
                    },
                  },
                }));
              }}
              aria-label='Recurring hour start'
              title='Recurring hour start'
            />
          </FormField>
          <FormField label='Recurring hour end'>
            <Input
              type='number'
              min={0}
              max={23}
              value={draft.launch.recurring.hourEnd ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                const next = Number(event.target.value);
                setDraft((previous) => ({
                  ...previous,
                  launch: {
                    ...previous.launch,
                    recurring: {
                      ...(previous.launch.recurring ?? {
                        frequency: 'weekly',
                        interval: 1,
                        weekdays: [1, 2, 3, 4, 5],
                        hourStart: null,
                        hourEnd: null,
                      }),
                      hourEnd:
                        Number.isFinite(next) && next >= 0 && next <= 23 ? Math.trunc(next) : null,
                    },
                  },
                }));
              }}
              aria-label='Recurring hour end'
              title='Recurring hour end'
            />
          </FormField>
        </>
      )}
    </div>
  </FormSection>
);
