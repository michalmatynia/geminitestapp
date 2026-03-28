'use client';

import React from 'react';

import { DocumentWysiwygEditor } from '@/features/document-editor/components/DocumentWysiwygEditor';
import type {
  FilemakerEmailCampaign,
  FilemakerPartyReference,
} from '@/shared/contracts/filemaker';
import { Badge, FormField, FormSection, Input, SelectSimple, Textarea } from '@/shared/ui';

import { AudienceSourceSection } from './campaign-edit-sections/AudienceSourceSection';
export { DeliveryGovernanceSection } from './campaign-edit-sections/DeliveryGovernanceSection';
export {
  CampaignAnalyticsSection,
  RecentRunsSection,
} from './campaign-edit-sections/CampaignInsightsSections';
import {
  CAMPAIGN_STATUS_OPTIONS,
  formatCommaSeparatedValues,
  parseCommaSeparatedValues,
  LAUNCH_MODE_OPTIONS,
} from './AdminFilemakerCampaignEditPage.utils';

import type {
  FilemakerEmailCampaignAudiencePreview,
  FilemakerEmailCampaignLaunchEvaluation,
} from '../types/campaigns';

type CampaignDraftSetter = React.Dispatch<React.SetStateAction<FilemakerEmailCampaign>>;

type OptionLike = {
  value: string;
  label: string;
};

const defaultRecurringRule = () => ({
  frequency: 'weekly' as const,
  interval: 1,
  weekdays: [1, 2, 3, 4, 5],
  hourStart: null,
  hourEnd: null,
});

const updateCampaignDraft = (
  setDraft: CampaignDraftSetter,
  update: (draft: FilemakerEmailCampaign) => FilemakerEmailCampaign
): void => {
  setDraft((current) => update(current));
};

export function CampaignDetailsSection({
  draft,
  setDraft,
}: {
  draft: FilemakerEmailCampaign;
  setDraft: CampaignDraftSetter;
}): React.JSX.Element {
  return (
    <FormSection title='Campaign Details' className='space-y-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <FormField label='Campaign name'>
          <Input
            value={draft.name}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                name: event.target.value,
              }));
            }}
          />
        </FormField>
        <FormField label='Status'>
          <SelectSimple
            ariaLabel='Campaign status'
            value={draft.status}
            onValueChange={(value) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                status: value as FilemakerEmailCampaign['status'],
              }));
            }}
            options={CAMPAIGN_STATUS_OPTIONS}
          />
        </FormField>
        <FormField label='Subject'>
          <Input
            value={draft.subject}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                subject: event.target.value,
              }));
            }}
          />
        </FormField>
        <FormField label='Preview text'>
          <Input
            value={draft.previewText ?? ''}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                previewText: event.target.value || null,
              }));
            }}
          />
        </FormField>
        <FormField label='From name'>
          <Input
            value={draft.fromName ?? ''}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                fromName: event.target.value || null,
              }));
            }}
          />
        </FormField>
        <FormField label='Reply-to email'>
          <Input
            value={draft.replyToEmail ?? ''}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                replyToEmail: event.target.value || null,
              }));
            }}
          />
        </FormField>
      </div>
      <FormField label='Internal description'>
        <Textarea
          rows={3}
          value={draft.description ?? ''}
          onChange={(event) => {
            updateCampaignDraft(setDraft, (current) => ({
              ...current,
              description: event.target.value || null,
            }));
          }}
        />
      </FormField>
    </FormSection>
  );
}

export function ContentSection({
  draft,
  setDraft,
}: {
  draft: FilemakerEmailCampaign;
  setDraft: CampaignDraftSetter;
}): React.JSX.Element {
  return (
    <FormSection title='Campaign Content' className='space-y-4 p-4'>
      <div className='text-sm text-gray-400'>
        Write the primary campaign body with the shared rich-text editor.
      </div>
      <DocumentWysiwygEditor
        value={draft.bodyHtml ?? ''}
        onChange={(value) => {
          updateCampaignDraft(setDraft, (current) => ({
            ...current,
            bodyHtml: value || null,
          }));
        }}
        placeholder='Write your campaign email...'
        enableAdvancedTools
        allowFontFamily
        allowTextAlign
      />
      <FormField
        label='Campaign plain-text override'
        description='Optional. Leave blank to derive plain text from the HTML body during delivery.'
      >
        <Textarea
          rows={4}
          aria-label='Campaign plain-text override'
          value={draft.bodyText ?? ''}
          onChange={(event) => {
            updateCampaignDraft(setDraft, (current) => ({
              ...current,
              bodyText: event.target.value || null,
            }));
          }}
        />
      </FormField>
    </FormSection>
  );
}

export function AudienceSection({
  draft,
  setDraft,
  organizationOptions,
  eventOptions,
  partyOptions,
}: {
  draft: FilemakerEmailCampaign;
  setDraft: CampaignDraftSetter;
  organizationOptions: OptionLike[];
  eventOptions: OptionLike[];
  partyOptions: OptionLike[];
}): React.JSX.Element {
  const primaryPartyKind = draft.audience.partyKinds[0] ?? 'person';
  const manualPartyIds = draft.audience.includePartyReferences.map((reference) => reference.id);

  return (
    <div className='space-y-4'>
      <AudienceSourceSection
        partyKind={primaryPartyKind}
        setPartyKind={(value) => {
          updateCampaignDraft(setDraft, (current) => ({
            ...current,
            audience: {
              ...current.audience,
              partyKinds: [value],
              includePartyReferences: current.audience.includePartyReferences.map(
                (reference): FilemakerPartyReference => ({
                  ...reference,
                  kind: value,
                })
              ),
            },
          }));
        }}
        manualPartyIds={manualPartyIds}
        setManualPartyIds={(value) => {
          updateCampaignDraft(setDraft, (current) => ({
            ...current,
            audience: {
              ...current.audience,
              includePartyReferences: value.map(
                (id): FilemakerPartyReference => ({
                  kind: primaryPartyKind,
                  id,
                })
              ),
            },
          }));
        }}
        manualPartyReferences={draft.audience.includePartyReferences}
      />
      <FormSection title='Audience Filters' className='space-y-4 p-4'>
        <div className='flex flex-wrap gap-2 text-[10px]'>
          <Badge variant='outline'>Organizations: {organizationOptions.length}</Badge>
          <Badge variant='outline'>Events: {eventOptions.length}</Badge>
          <Badge variant='outline'>Parties: {partyOptions.length}</Badge>
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          <FormField label='Organization IDs'>
            <Input
              value={formatCommaSeparatedValues(draft.audience.organizationIds)}
              onChange={(event) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: {
                    ...current.audience,
                    organizationIds: parseCommaSeparatedValues(event.target.value),
                  },
                }));
              }}
            />
          </FormField>
          <FormField label='Event IDs'>
            <Input
              value={formatCommaSeparatedValues(draft.audience.eventIds)}
              onChange={(event) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: {
                    ...current.audience,
                    eventIds: parseCommaSeparatedValues(event.target.value),
                  },
                }));
              }}
            />
          </FormField>
          <FormField label='Countries'>
            <Input
              value={formatCommaSeparatedValues(draft.audience.countries)}
              onChange={(event) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: {
                    ...current.audience,
                    countries: parseCommaSeparatedValues(event.target.value),
                  },
                }));
              }}
            />
          </FormField>
          <FormField label='Cities'>
            <Input
              value={formatCommaSeparatedValues(draft.audience.cities)}
              onChange={(event) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: {
                    ...current.audience,
                    cities: parseCommaSeparatedValues(event.target.value),
                  },
                }));
              }}
            />
          </FormField>
          <FormField label='Audience limit'>
            <Input
              type='number'
              value={draft.audience.limit == null ? '' : String(draft.audience.limit)}
              onChange={(event) => {
                updateCampaignDraft(setDraft, (current) => ({
                  ...current,
                  audience: {
                    ...current.audience,
                    limit:
                      event.target.value.trim() === ''
                        ? null
                        : Number.parseInt(event.target.value, 10) || null,
                  },
                }));
              }}
            />
          </FormField>
        </div>
      </FormSection>
    </div>
  );
}

export function LaunchSection({
  draft,
  setDraft,
}: {
  draft: FilemakerEmailCampaign;
  setDraft: CampaignDraftSetter;
}): React.JSX.Element {
  return (
    <FormSection title='Launch Rules' className='space-y-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <FormField label='Launch mode'>
          <SelectSimple
            ariaLabel='Launch mode'
            value={draft.launch.mode}
            onValueChange={(value) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  mode: value as FilemakerEmailCampaign['launch']['mode'],
                  recurring:
                    value === 'recurring'
                      ? current.launch.recurring ?? defaultRecurringRule()
                      : value === 'scheduled'
                        ? null
                        : current.launch.recurring,
                },
              }));
            }}
            options={LAUNCH_MODE_OPTIONS}
          />
        </FormField>
        <FormField label='Scheduled at'>
          <Input
            type='datetime-local'
            value={draft.launch.scheduledAt ?? ''}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  scheduledAt: event.target.value || null,
                },
              }));
            }}
          />
        </FormField>
        <FormField label='Minimum audience size'>
          <Input
            type='number'
            value={String(draft.launch.minAudienceSize)}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  minAudienceSize: Number.parseInt(event.target.value, 10) || 0,
                },
              }));
            }}
          />
        </FormField>
        <FormField label='Timezone'>
          <Input
            value={draft.launch.timezone ?? ''}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  timezone: event.target.value || null,
                },
              }));
            }}
          />
        </FormField>
      </div>
      <div className='grid gap-4 md:grid-cols-4'>
        <FormField label='Allowed hour start'>
          <Input
            type='number'
            min={0}
            max={23}
            value={draft.launch.allowedHourStart == null ? '' : String(draft.launch.allowedHourStart)}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  allowedHourStart:
                    event.target.value.trim() === ''
                      ? null
                      : Number.parseInt(event.target.value, 10) || null,
                },
              }));
            }}
          />
        </FormField>
        <FormField label='Allowed hour end'>
          <Input
            type='number'
            min={0}
            max={23}
            value={draft.launch.allowedHourEnd == null ? '' : String(draft.launch.allowedHourEnd)}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  allowedHourEnd:
                    event.target.value.trim() === ''
                      ? null
                      : Number.parseInt(event.target.value, 10) || null,
                },
              }));
            }}
          />
        </FormField>
        <FormField label='Pause on bounce %'>
          <Input
            type='number'
            min={0}
            max={100}
            value={
              draft.launch.pauseOnBounceRatePercent == null
                ? ''
                : String(draft.launch.pauseOnBounceRatePercent)
            }
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  pauseOnBounceRatePercent:
                    event.target.value.trim() === ''
                      ? null
                      : Number.parseFloat(event.target.value) || null,
                },
              }));
            }}
          />
        </FormField>
        <FormField label='Recurring weekdays'>
          <Input
            value={formatCommaSeparatedValues((draft.launch.recurring?.weekdays ?? []).map(String))}
            onChange={(event) => {
              updateCampaignDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  recurring: {
                    ...(current.launch.recurring ?? defaultRecurringRule()),
                    weekdays: parseCommaSeparatedValues(event.target.value)
                      .map((value) => Number.parseInt(value, 10))
                      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
                  },
                },
              }));
            }}
          />
        </FormField>
      </div>
    </FormSection>
  );
}

export function AudiencePreviewSection({
  preview,
  launchEvaluation,
}: {
  preview: FilemakerEmailCampaignAudiencePreview;
  launchEvaluation: FilemakerEmailCampaignLaunchEvaluation;
}): React.JSX.Element {
  return (
    <FormSection title='Audience Preview' className='space-y-4 p-4'>
      <div className='flex flex-wrap gap-2 text-[10px]'>
        <Badge variant='outline'>Recipients: {preview.recipients.length}</Badge>
        <Badge variant='outline'>Excluded: {preview.excludedCount}</Badge>
        <Badge variant='outline'>Suppressed: {preview.suppressedCount}</Badge>
        <Badge variant='outline'>Deduped: {preview.dedupedCount}</Badge>
        <Badge variant='outline'>Linked emails: {preview.totalLinkedEmailCount}</Badge>
      </div>
      <div className='rounded-md border border-border/60 bg-card/25 p-3 text-sm text-gray-300'>
        {launchEvaluation.isEligible ? (
          <span className='text-emerald-300'>Campaign is eligible for launch.</span>
        ) : (
          <div className='space-y-1'>
            <div className='text-amber-300'>Campaign is not launchable yet.</div>
            {launchEvaluation.blockers.map((blocker) => (
              <div key={blocker} className='text-xs text-gray-400'>
                {blocker}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className='space-y-2'>
        <div className='text-xs font-semibold text-gray-400'>Sample recipients</div>
        {preview.sampleRecipients.length === 0 ? (
          <div className='text-sm text-gray-500'>No recipients available for preview.</div>
        ) : (
          <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-3'>
            {preview.sampleRecipients.map((recipient) => (
              <div
                key={`${recipient.partyKind}-${recipient.partyId}-${recipient.emailId}`}
                className='rounded-md border border-border/60 bg-card/25 p-3 text-xs text-gray-300'
              >
                <div className='font-medium text-white'>{recipient.partyName}</div>
                <div>{recipient.email}</div>
                <div className='text-gray-500'>
                  {recipient.partyKind} • {recipient.country || 'No country'} •{' '}
                  {recipient.city || 'No city'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormSection>
  );
}
