'use client';

import type { Dispatch, SetStateAction } from 'react';

import { DocumentWysiwygEditor } from '@/features/document-editor/components/DocumentWysiwygEditor';
import {
  Badge,
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
  FilemakerEmailStatus,
  FilemakerEmailCampaignRecurringRule,
  FilemakerPartyKind,
  FilemakerPartyReference,
} from '../types';
import type {
  FilemakerEmailCampaignAudiencePreview,
  FilemakerEmailCampaignLaunchEvaluation,
} from '../types/campaigns';
import {
  CAMPAIGN_STATUS_OPTIONS,
  EMAIL_STATUS_OPTIONS,
  PARTY_KIND_OPTIONS,
  RECURRING_FREQUENCY_OPTIONS,
  toDateTimeLocalValue,
  WEEKDAY_OPTIONS,
} from './AdminFilemakerCampaignEditPage.utils';

export {
  CampaignAnalyticsSection,
  RecentRunsSection,
} from './campaign-edit-sections/CampaignInsightsSections';
export { DeliveryGovernanceSection } from './campaign-edit-sections/DeliveryGovernanceSection';

type CampaignDraftSetter = Dispatch<SetStateAction<FilemakerEmailCampaign>>;

const DEFAULT_RECURRING_RULE: FilemakerEmailCampaignRecurringRule = {
  frequency: 'weekly',
  interval: 1,
  weekdays: [1, 2, 3, 4, 5],
  hourStart: null,
  hourEnd: null,
};

const parseCommaSeparatedValues = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((entry: string) => entry.trim())
        .filter(Boolean)
    )
  );

const formatCommaSeparatedValues = (values: readonly string[]): string => values.join(', ');

const toPartyReferenceValue = (reference: FilemakerPartyReference): string =>
  `${reference.kind}:${reference.id}`;

const toNullableInt = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBoundedPercentage = (value: string): number | null => {
  const parsed = toNullableInt(value);
  if (parsed == null) return null;
  return Math.max(0, Math.min(100, parsed));
};

const updateDraft = (
  setDraft: CampaignDraftSetter,
  recipe: (current: FilemakerEmailCampaign) => FilemakerEmailCampaign
): void => {
  setDraft((current) => recipe(current));
};

const resolveRecurringRule = (
  recurring: FilemakerEmailCampaignRecurringRule | null | undefined
): FilemakerEmailCampaignRecurringRule => recurring ?? DEFAULT_RECURRING_RULE;

interface CampaignDetailsSectionProps {
  draft: FilemakerEmailCampaign;
  setDraft: CampaignDraftSetter;
}

export function CampaignDetailsSection({
  draft,
  setDraft,
}: CampaignDetailsSectionProps): React.JSX.Element {
  return (
    <FormSection title='Campaign Details' className='space-y-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        <FormField label='Campaign name'>
          <Input
            value={draft.name}
            onChange={(event) => {
              const nextName = event.target.value;
              updateDraft(setDraft, (current) => ({
                ...current,
                name: nextName,
              }));
            }}
          />
        </FormField>
        <FormField label='Campaign status'>
          <SelectSimple
            ariaLabel='Campaign status'
            value={draft.status}
            onValueChange={(value) => {
              updateDraft(setDraft, (current) => ({
                ...current,
                status: value as FilemakerEmailCampaignLifecycleStatus,
              }));
            }}
            options={CAMPAIGN_STATUS_OPTIONS}
          />
        </FormField>
        <FormField label='Reply-to email'>
          <Input
            type='email'
            value={draft.replyToEmail ?? ''}
            onChange={(event) => {
              const nextReplyToEmail = event.target.value.trim() || null;
              updateDraft(setDraft, (current) => ({
                ...current,
                replyToEmail: nextReplyToEmail,
              }));
            }}
          />
        </FormField>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        <FormField label='Subject line'>
          <Input
            value={draft.subject}
            onChange={(event) => {
              const nextSubject = event.target.value;
              updateDraft(setDraft, (current) => ({
                ...current,
                subject: nextSubject,
              }));
            }}
          />
        </FormField>
        <FormField label='Preview text'>
          <Input
            value={draft.previewText ?? ''}
            onChange={(event) => {
              const nextPreviewText = event.target.value || null;
              updateDraft(setDraft, (current) => ({
                ...current,
                previewText: nextPreviewText,
              }));
            }}
          />
        </FormField>
        <FormField label='From name'>
          <Input
            value={draft.fromName ?? ''}
            onChange={(event) => {
              const nextFromName = event.target.value || null;
              updateDraft(setDraft, (current) => ({
                ...current,
                fromName: nextFromName,
              }));
            }}
          />
        </FormField>
      </div>

      <FormField label='Internal description'>
        <Textarea
          rows={4}
          value={draft.description ?? ''}
          onChange={(event) => {
            const nextDescription = event.target.value || null;
            updateDraft(setDraft, (current) => ({
              ...current,
              description: nextDescription,
            }));
          }}
        />
      </FormField>
    </FormSection>
  );
}

interface ContentSectionProps {
  draft: FilemakerEmailCampaign;
  setDraft: CampaignDraftSetter;
}

export function ContentSection({
  draft,
  setDraft,
}: ContentSectionProps): React.JSX.Element {
  return (
    <FormSection title='Campaign Content' className='space-y-4 p-4'>
      <FormField
        label='HTML email body'
        description='Write the primary campaign body with the shared rich-text editor.'
      >
        <DocumentWysiwygEditor
          value={draft.bodyHtml ?? ''}
          onChange={(nextValue) => {
            updateDraft(setDraft, (current) => ({
              ...current,
              bodyHtml: nextValue || null,
            }));
          }}
          placeholder='Campaign HTML body'
          surfaceOptions={{ style: { minHeight: '400px' } }}
        />
      </FormField>

      <FormField
        label='Plain-text override'
        description='Optional. Leave blank to derive plain text from the HTML body during delivery.'
      >
        <Textarea
          aria-label='Campaign plain-text override'
          rows={6}
          value={draft.bodyText ?? ''}
          onChange={(event) => {
            const nextBodyText = event.target.value || null;
            updateDraft(setDraft, (current) => ({
              ...current,
              bodyText: nextBodyText,
            }));
          }}
        />
      </FormField>
    </FormSection>
  );
}

interface AudienceSectionProps {
  draft: FilemakerEmailCampaign;
  setDraft: CampaignDraftSetter;
  eventOptions: Array<{ value: string; label: string }>;
  organizationOptions: Array<{ value: string; label: string }>;
  partyOptions: Array<{ value: string; label: string }>;
  decodeFilemakerPartyReference: (value: string | null | undefined) => FilemakerPartyReference | null;
}

export function AudienceSection({
  draft,
  setDraft,
  eventOptions,
  organizationOptions,
  partyOptions,
  decodeFilemakerPartyReference,
}: AudienceSectionProps): React.JSX.Element {
  const selectedPartyReferences = draft.audience.includePartyReferences.map(toPartyReferenceValue);

  return (
    <FormSection title='Audience Rules' className='space-y-4 p-4'>
      <div className='grid gap-4 xl:grid-cols-2'>
        <FormField label='Recipient kinds'>
          <MultiSelect
            options={PARTY_KIND_OPTIONS}
            selected={draft.audience.partyKinds}
            onChange={(values) => {
              updateDraft(setDraft, (current) => ({
                ...current,
                audience: {
                  ...current.audience,
                  partyKinds: values as FilemakerPartyKind[],
                },
              }));
            }}
            placeholder='Select recipient kinds'
          />
        </FormField>

        <FormField label='Email statuses'>
          <MultiSelect
            options={EMAIL_STATUS_OPTIONS}
            selected={draft.audience.emailStatuses}
            onChange={(values) => {
              updateDraft(setDraft, (current) => ({
                ...current,
                audience: {
                  ...current.audience,
                  emailStatuses: values as FilemakerEmailStatus[],
                },
              }));
            }}
            placeholder='Select email statuses'
          />
        </FormField>
      </div>

      <div className='grid gap-4 xl:grid-cols-3'>
        <FormField label='Organizations'>
          <MultiSelect
            options={organizationOptions}
            selected={draft.audience.organizationIds}
            onChange={(values) => {
              updateDraft(setDraft, (current) => ({
                ...current,
                audience: {
                  ...current.audience,
                  organizationIds: values,
                },
              }));
            }}
            placeholder='Filter by organization'
          />
        </FormField>

        <FormField label='Events'>
          <MultiSelect
            options={eventOptions}
            selected={draft.audience.eventIds}
            onChange={(values) => {
              updateDraft(setDraft, (current) => ({
                ...current,
                audience: {
                  ...current.audience,
                  eventIds: values,
                },
              }));
            }}
            placeholder='Filter by event'
          />
        </FormField>

        <FormField label='Pinned recipients'>
          <MultiSelect
            options={partyOptions}
            selected={selectedPartyReferences}
            onChange={(values) => {
              const includePartyReferences = values
                .map((value) => decodeFilemakerPartyReference(value))
                .filter((value): value is FilemakerPartyReference => value !== null);
              updateDraft(setDraft, (current) => ({
                ...current,
                audience: {
                  ...current.audience,
                  includePartyReferences,
                },
              }));
            }}
            placeholder='Pin specific recipients'
          />
        </FormField>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        <FormField label='Countries (comma separated)'>
          <Input
            value={formatCommaSeparatedValues(draft.audience.countries)}
            onChange={(event) => {
              const countries = parseCommaSeparatedValues(event.target.value);
              updateDraft(setDraft, (current) => ({
                ...current,
                audience: {
                  ...current.audience,
                  countries,
                },
              }));
            }}
          />
        </FormField>

        <FormField label='Cities (comma separated)'>
          <Input
            value={formatCommaSeparatedValues(draft.audience.cities)}
            onChange={(event) => {
              const cities = parseCommaSeparatedValues(event.target.value);
              updateDraft(setDraft, (current) => ({
                ...current,
                audience: {
                  ...current.audience,
                  cities,
                },
              }));
            }}
          />
        </FormField>

        <FormField label='Audience cap'>
          <Input
            type='number'
            min={1}
            value={draft.audience.limit ?? ''}
            onChange={(event) => {
              const limit = toNullableInt(event.target.value);
              updateDraft(setDraft, (current) => ({
                ...current,
                audience: {
                  ...current.audience,
                  limit,
                },
              }));
            }}
          />
        </FormField>
      </div>

      <div className='flex items-center gap-2'>
        <Checkbox
          id='filemaker-campaign-audience-dedupe'
          checked={draft.audience.dedupeByEmail}
          onCheckedChange={(checked) => {
            updateDraft(setDraft, (current) => ({
              ...current,
              audience: {
                ...current.audience,
                dedupeByEmail: checked === true,
              },
            }));
          }}
        />
        <label htmlFor='filemaker-campaign-audience-dedupe' className='text-sm text-gray-300'>
          Deduplicate recipients by email address
        </label>
      </div>
    </FormSection>
  );
}

interface LaunchSectionProps {
  draft: FilemakerEmailCampaign;
  setDraft: CampaignDraftSetter;
}

export function LaunchSection({
  draft,
  setDraft,
}: LaunchSectionProps): React.JSX.Element {
  const recurringRule = resolveRecurringRule(draft.launch.recurring);

  return (
    <FormSection title='Launch Rules' className='space-y-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        <FormField label='Launch mode'>
          <SelectSimple
            ariaLabel='Launch mode'
            value={draft.launch.mode}
            onValueChange={(value) => {
              updateDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  mode: value as FilemakerEmailCampaign['launch']['mode'],
                  recurring:
                    value === 'recurring'
                      ? current.launch.recurring ?? DEFAULT_RECURRING_RULE
                      : null,
                },
              }));
            }}
            options={[
              { value: 'manual', label: 'Manual', description: 'Launch only on demand.' },
              { value: 'scheduled', label: 'Scheduled', description: 'Launch at a fixed time.' },
              {
                value: 'recurring',
                label: 'Recurring',
                description: 'Run on a repeating delivery window.',
              },
            ]}
          />
        </FormField>

        <FormField label='Minimum audience size'>
          <Input
            type='number'
            min={0}
            value={draft.launch.minAudienceSize}
            onChange={(event) => {
              const nextValue = toNullableInt(event.target.value) ?? 0;
              updateDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  minAudienceSize: Math.max(0, nextValue),
                },
              }));
            }}
          />
        </FormField>

        <FormField label='Timezone'>
          <Input
            value={draft.launch.timezone ?? 'UTC'}
            onChange={(event) => {
              const timezone = event.target.value || 'UTC';
              updateDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  timezone,
                },
              }));
            }}
          />
        </FormField>
      </div>

      {draft.launch.mode === 'scheduled' ? (
        <FormField label='Scheduled launch time'>
          <Input
            type='datetime-local'
            value={toDateTimeLocalValue(draft.launch.scheduledAt)}
            onChange={(event) => {
              const scheduledAt = event.target.value || null;
              updateDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  scheduledAt,
                },
              }));
            }}
          />
        </FormField>
      ) : null}

      {draft.launch.mode === 'recurring' ? (
        <div className='space-y-4 rounded-md border border-border/60 bg-card/25 p-4'>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <FormField label='Frequency'>
              <SelectSimple
                ariaLabel='Recurring frequency'
                value={recurringRule.frequency}
                onValueChange={(value) => {
                  updateDraft(setDraft, (current) => ({
                    ...current,
                    launch: {
                      ...current.launch,
                      recurring: {
                        ...resolveRecurringRule(current.launch.recurring),
                        frequency: value as FilemakerEmailCampaignRecurringRule['frequency'],
                      },
                    },
                  }));
                }}
                options={RECURRING_FREQUENCY_OPTIONS}
              />
            </FormField>

            <FormField label='Interval'>
              <Input
                type='number'
                min={1}
                value={recurringRule.interval}
                onChange={(event) => {
                  const nextInterval = Math.max(1, toNullableInt(event.target.value) ?? 1);
                  updateDraft(setDraft, (current) => ({
                    ...current,
                    launch: {
                      ...current.launch,
                      recurring: {
                        ...resolveRecurringRule(current.launch.recurring),
                        interval: nextInterval,
                      },
                    },
                  }));
                }}
              />
            </FormField>

            <FormField label='Window start hour'>
              <Input
                type='number'
                min={0}
                max={23}
                value={recurringRule.hourStart ?? ''}
                onChange={(event) => {
                  const hourStart = toNullableInt(event.target.value);
                  updateDraft(setDraft, (current) => ({
                    ...current,
                    launch: {
                      ...current.launch,
                      recurring: {
                        ...resolveRecurringRule(current.launch.recurring),
                        hourStart,
                      },
                    },
                  }));
                }}
              />
            </FormField>

            <FormField label='Window end hour'>
              <Input
                type='number'
                min={0}
                max={23}
                value={recurringRule.hourEnd ?? ''}
                onChange={(event) => {
                  const hourEnd = toNullableInt(event.target.value);
                  updateDraft(setDraft, (current) => ({
                    ...current,
                    launch: {
                      ...current.launch,
                      recurring: {
                        ...resolveRecurringRule(current.launch.recurring),
                        hourEnd,
                      },
                    },
                  }));
                }}
              />
            </FormField>
          </div>

          {recurringRule.frequency !== 'daily' ? (
            <FormField label='Recurring weekdays'>
              <MultiSelect
                options={WEEKDAY_OPTIONS}
                selected={recurringRule.weekdays.map(String)}
                onChange={(values) => {
                  const weekdays = values
                    .map((value) => Number.parseInt(value, 10))
                    .filter((value) => Number.isFinite(value));
                  updateDraft(setDraft, (current) => ({
                    ...current,
                    launch: {
                      ...current.launch,
                      recurring: {
                        ...resolveRecurringRule(current.launch.recurring),
                        weekdays,
                      },
                    },
                  }));
                }}
                placeholder='Select recurring weekdays'
              />
            </FormField>
          ) : null}
        </div>
      ) : null}

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        <FormField label='Allowed start hour'>
          <Input
            type='number'
            min={0}
            max={23}
            value={draft.launch.allowedHourStart ?? ''}
            onChange={(event) => {
              const allowedHourStart = toNullableInt(event.target.value);
              updateDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  allowedHourStart,
                },
              }));
            }}
          />
        </FormField>

        <FormField label='Allowed end hour'>
          <Input
            type='number'
            min={0}
            max={23}
            value={draft.launch.allowedHourEnd ?? ''}
            onChange={(event) => {
              const allowedHourEnd = toNullableInt(event.target.value);
              updateDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  allowedHourEnd,
                },
              }));
            }}
          />
        </FormField>

        <FormField label='Pause on bounce rate (%)'>
          <Input
            type='number'
            min={0}
            max={100}
            value={draft.launch.pauseOnBounceRatePercent ?? ''}
            onChange={(event) => {
              const pauseOnBounceRatePercent = toBoundedPercentage(event.target.value);
              updateDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  pauseOnBounceRatePercent,
                },
              }));
            }}
          />
        </FormField>
      </div>

      <div className='flex flex-wrap gap-6'>
        <div className='flex items-center gap-2'>
          <Checkbox
            id='filemaker-campaign-require-approval'
            checked={draft.launch.requireApproval}
            onCheckedChange={(checked) => {
              updateDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  requireApproval: checked === true,
                },
              }));
            }}
          />
          <label htmlFor='filemaker-campaign-require-approval' className='text-sm text-gray-300'>
            Require manual approval before launch
          </label>
        </div>

        <div className='flex items-center gap-2'>
          <Checkbox
            id='filemaker-campaign-only-weekdays'
            checked={draft.launch.onlyWeekdays}
            onCheckedChange={(checked) => {
              updateDraft(setDraft, (current) => ({
                ...current,
                launch: {
                  ...current.launch,
                  onlyWeekdays: checked === true,
                },
              }));
            }}
          />
          <label htmlFor='filemaker-campaign-only-weekdays' className='text-sm text-gray-300'>
            Restrict launches to weekdays
          </label>
        </div>
      </div>
    </FormSection>
  );
}

interface AudiencePreviewSectionProps {
  preview: FilemakerEmailCampaignAudiencePreview;
  launchEvaluation: FilemakerEmailCampaignLaunchEvaluation;
}

export function AudiencePreviewSection({
  preview,
  launchEvaluation,
}: AudiencePreviewSectionProps): React.JSX.Element {
  return (
    <FormSection title='Audience Preview' className='space-y-4 p-4'>
      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Recipients: {preview.recipients.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Excluded: {preview.excludedCount}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Suppressed: {preview.suppressedCount}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Deduped: {preview.dedupedCount}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Launch ready: {launchEvaluation.isEligible ? 'yes' : 'no'}
        </Badge>
      </div>

      {launchEvaluation.blockers.length > 0 ? (
        <div className='rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100'>
          <div className='font-semibold'>Launch blockers</div>
          <ul className='mt-2 list-disc space-y-1 pl-5'>
            {launchEvaluation.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.sampleRecipients.length === 0 ? (
        <div className='text-sm text-gray-500'>
          No recipients match the current audience rules yet.
        </div>
      ) : (
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
          {preview.sampleRecipients.map((recipient) => (
            <div
              key={`${recipient.partyKind}:${recipient.partyId}:${recipient.emailId}`}
              className='rounded-md border border-border/60 bg-card/25 p-3 text-sm text-gray-300'
            >
              <div className='font-medium text-white'>{recipient.partyName || recipient.partyId}</div>
              <div className='text-[11px] text-gray-500'>{recipient.email}</div>
              <div className='mt-1 text-[11px] text-gray-500 capitalize'>
                {recipient.partyKind} • {recipient.emailStatus}
              </div>
              <div className='text-[11px] text-gray-500'>
                {recipient.city || 'Unknown city'}, {recipient.country || 'Unknown country'}
              </div>
            </div>
          ))}
        </div>
      )}
    </FormSection>
  );
}
