'use client';

import { useMemo, type JSX } from 'react';

import { FormField, FormSection, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';

import {
  PARTY_KIND_OPTIONS as FILEMAKER_PARTY_KIND_OPTIONS,
  formatCommaSeparatedValues as filemakerFormatCommaSeparatedValues,
  parseCommaSeparatedValues as filemakerParseCommaSeparatedValues,
} from '../AdminFilemakerCampaignEditPage.utils';
import type {
  FilemakerAudienceConditionGroup,
  FilemakerEmailCampaign,
  FilemakerPartyKind,
} from '../../types';
import { useCampaignEditContext } from '../AdminFilemakerCampaignEditPage.context';
import {
  AudienceConditionBuilder,
  type AudienceConditionValueOptions,
} from './AudienceConditionBuilder';
import { buildAudienceConditionValueOptions } from './AudienceConditionBuilder.value-options';

type ManualPartyReferencesProps = {
  manualPartyIds: string[];
  primaryPartyKind: FilemakerPartyKind;
};

function ManualPartyReferences({
  manualPartyIds,
  primaryPartyKind,
}: ManualPartyReferencesProps): JSX.Element {
  return (
    <div className='space-y-2'>
      <div className='text-xs font-semibold text-gray-400'>Manual Party References</div>
      <div className='rounded-md border border-border/60 bg-card/25 p-3 text-xs text-gray-500'>
        {manualPartyIds.length === 0 ? (
          'No manual references added. Use the IDs field above for simple targeting.'
        ) : (
          <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
            {manualPartyIds.map((id: string) => (
              <div key={id} className='rounded border border-border/40 p-2'>
                <span className='font-medium text-white'>{id}</span> ({primaryPartyKind})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AudienceFieldConditions({
  fieldValueOptions,
}: {
  fieldValueOptions: AudienceConditionValueOptions;
}): JSX.Element {
  const { draft, setDraft } = useCampaignEditContext();
  return (
    <div className='space-y-2'>
      <div className='text-xs font-semibold text-gray-400'>
        Field Conditions (organisation / person / email)
      </div>
      <AudienceConditionBuilder
        fieldValueOptions={fieldValueOptions}
        value={draft.audience.conditionGroup}
        onChange={(next: FilemakerAudienceConditionGroup): void =>
          setDraft((prev: FilemakerEmailCampaign): FilemakerEmailCampaign => ({
            ...prev,
            audience: {
              ...prev.audience,
              conditionGroup: next,
            },
          }))
        }
      />
    </div>
  );
}

const applyPartyKind = (
  campaign: FilemakerEmailCampaign,
  value: FilemakerPartyKind
): FilemakerEmailCampaign => ({
  ...campaign,
  audience: {
    ...campaign.audience,
    partyKinds: [value],
    includePartyReferences: campaign.audience.includePartyReferences.map((reference) => ({
      ...reference,
      kind: value,
    })),
  },
});

const applyManualPartyIds = (
  campaign: FilemakerEmailCampaign,
  value: string[]
): FilemakerEmailCampaign => ({
  ...campaign,
  audience: {
    ...campaign.audience,
    includePartyReferences: value.map((id: string) => ({
      id,
      kind: campaign.audience.partyKinds[0] ?? 'person',
    })),
  },
});

export function AudienceSourceSection(): JSX.Element {
  const { database, draft, setDraft } = useCampaignEditContext();
  const primaryPartyKind = draft.audience.partyKinds[0] ?? 'person';
  const manualPartyIds = draft.audience.includePartyReferences
    .filter((reference) => reference.kind === primaryPartyKind)
    .map((reference) => reference.id);
  const fieldValueOptions = useMemo(
    () => buildAudienceConditionValueOptions(database),
    [database]
  );

  const setPartyKind = (value: FilemakerPartyKind): void => {
    setDraft((prev: FilemakerEmailCampaign): FilemakerEmailCampaign =>
      applyPartyKind(prev, value)
    );
  };

  const setManualPartyIds = (value: string[]): void => {
    setDraft((prev: FilemakerEmailCampaign): FilemakerEmailCampaign =>
      applyManualPartyIds(prev, value)
    );
  };

  return (
    <FormSection title='Audience & Source' className='space-y-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <FormField label='Recipient Kind'>
          <SelectSimple
            ariaLabel='Recipient kind'
            value={primaryPartyKind}
            onValueChange={(value: string): void => setPartyKind(value as FilemakerPartyKind)}
            options={FILEMAKER_PARTY_KIND_OPTIONS}
          />
        </FormField>
        <FormField label='Manual Party IDs (Comma separated)'>
          <Input
            placeholder='e.g. 123, 456, 789'
            value={filemakerFormatCommaSeparatedValues(manualPartyIds)}
            onChange={(event): void =>
              setManualPartyIds(filemakerParseCommaSeparatedValues(event.target.value))
            }
          />
        </FormField>
      </div>
      <ManualPartyReferences
        manualPartyIds={manualPartyIds}
        primaryPartyKind={primaryPartyKind}
      />
      <AudienceFieldConditions fieldValueOptions={fieldValueOptions} />
    </FormSection>
  );
}
