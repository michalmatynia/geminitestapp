'use client';

import { useMemo } from 'react';

import { FormField, FormSection, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';
import {
  PARTY_KIND_OPTIONS as FILEMAKER_PARTY_KIND_OPTIONS,
  formatCommaSeparatedValues as filemakerFormatCommaSeparatedValues,
  parseCommaSeparatedValues as filemakerParseCommaSeparatedValues,
} from '../AdminFilemakerCampaignEditPage.utils';
import type {
  FilemakerAudienceConditionGroup,
  FilemakerDatabase,
  FilemakerOrganizationLegacyDemand,
  FilemakerPartyKind,
  FilemakerValue,
} from '../../types';
import { useCampaignEditContext } from '../AdminFilemakerCampaignEditPage.context';
import {
  AudienceConditionBuilder,
  type AudienceConditionValueOption,
  type AudienceConditionValueOptions,
} from './AudienceConditionBuilder';

const normalizeOptionText = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveValueLabel = (value: FilemakerValue | null | undefined, fallback: string): string => {
  const label = normalizeOptionText(value?.label);
  if (label.length > 0) return label;
  const rawValue = normalizeOptionText(value?.value);
  if (rawValue.length > 0) return rawValue;
  return fallback;
};

const buildValuesById = (database: FilemakerDatabase): Map<string, FilemakerValue> =>
  new Map(database.values.map((value: FilemakerValue): [string, FilemakerValue] => [value.id, value]));

const collectDemandValueIds = (database: FilemakerDatabase): Set<string> => {
  const valueIds = new Set<string>();
  database.organizationLegacyDemands.forEach(
    (demand: FilemakerOrganizationLegacyDemand): void => {
      demand.valueIds.forEach((valueId: string): void => {
        const normalizedValueId = normalizeOptionText(valueId);
        if (normalizedValueId.length > 0) valueIds.add(normalizedValueId);
      });
    }
  );
  return valueIds;
};

const sortConditionOptions = (
  options: AudienceConditionValueOption[]
): AudienceConditionValueOption[] =>
  options.sort((left, right) => left.label.localeCompare(right.label));

const buildDemandValueOptions = (database: FilemakerDatabase): AudienceConditionValueOption[] => {
  const valuesById = buildValuesById(database);
  return sortConditionOptions(
    Array.from(collectDemandValueIds(database)).map((valueId: string) => {
      const value = valuesById.get(valueId);
      return {
        value: valueId,
        label: resolveValueLabel(value, valueId),
        description: value?.legacyUuid ? `Legacy UUID: ${value.legacyUuid}` : valueId,
      };
    })
  );
};

const buildDemandLegacyUuidOptions = (
  database: FilemakerDatabase
): AudienceConditionValueOption[] => {
  const valuesById = buildValuesById(database);
  return sortConditionOptions(
    Array.from(collectDemandValueIds(database)).reduce<AudienceConditionValueOption[]>(
      (options: AudienceConditionValueOption[], valueId: string): AudienceConditionValueOption[] => {
        const value = valuesById.get(valueId);
        const legacyUuid = normalizeOptionText(value?.legacyUuid);
        if (legacyUuid.length === 0) return options;
        options.push({
          value: legacyUuid,
          label: resolveValueLabel(value, valueId),
          description: legacyUuid,
        });
        return options;
      },
      []
    )
  );
};

const buildDemandLabelOptions = (database: FilemakerDatabase): AudienceConditionValueOption[] => {
  const valuesById = buildValuesById(database);
  const labels = new Map<string, AudienceConditionValueOption>();
  collectDemandValueIds(database).forEach((valueId: string): void => {
    const label = resolveValueLabel(valuesById.get(valueId), valueId);
    if (!labels.has(label)) labels.set(label, { value: label, label });
  });
  return sortConditionOptions(Array.from(labels.values()));
};

const buildDemandPathOptions = (database: FilemakerDatabase): AudienceConditionValueOption[] => {
  const valuesById = buildValuesById(database);
  const paths = new Map<string, AudienceConditionValueOption>();
  database.organizationLegacyDemands.forEach(
    (demand: FilemakerOrganizationLegacyDemand): void => {
      const valueIds = demand.valueIds
        .map((valueId: string): string => normalizeOptionText(valueId))
        .filter((valueId: string): boolean => valueId.length > 0);
      if (valueIds.length === 0) return;
      const pathValue = valueIds.join('>');
      if (paths.has(pathValue)) return;
      paths.set(pathValue, {
        value: pathValue,
        label: valueIds
          .map((valueId: string): string => resolveValueLabel(valuesById.get(valueId), valueId))
          .join(' > '),
        description: `${valueIds.length} level${valueIds.length === 1 ? '' : 's'}`,
      });
    }
  );
  return sortConditionOptions(Array.from(paths.values()));
};

const buildAudienceConditionValueOptions = (
  database: FilemakerDatabase
): AudienceConditionValueOptions => ({
  'email.status': [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'bounced', label: 'Bounced' },
    { value: 'unverified', label: 'Unverified' },
  ],
  'organization.demandLabel': buildDemandLabelOptions(database),
  'organization.demandLegacyValueUuid': buildDemandLegacyUuidOptions(database),
  'organization.demandPath': buildDemandPathOptions(database),
  'organization.demandValueId': buildDemandValueOptions(database),
});

export const AudienceSourceSection = () => {
  const { database, draft, setDraft } = useCampaignEditContext();
  const primaryPartyKind = draft.audience.partyKinds[0] ?? 'person';
  const manualPartyIds = draft.audience.includePartyReferences
    .filter((reference) => reference.kind === primaryPartyKind)
    .map((reference) => reference.id);
  const fieldValueOptions = useMemo(
    () => buildAudienceConditionValueOptions(database),
    [database]
  );
  
  const setPartyKind = (val: FilemakerPartyKind) => {
    setDraft(prev => ({
      ...prev,
      audience: {
        ...prev.audience,
        partyKinds: [val],
        includePartyReferences: prev.audience.includePartyReferences.map((reference) => ({
          ...reference,
          kind: val,
        })),
      }
    }));
  };

  const setManualPartyIds = (val: string[]) => {
    setDraft(prev => ({
      ...prev,
      audience: {
        ...prev.audience,
        includePartyReferences: val.map((id) => ({
          id,
          kind: prev.audience.partyKinds[0] ?? 'person',
        })),
      }
    }));
  };

  return (
    <FormSection title='Audience & Source' className='space-y-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <FormField label='Recipient Kind'>
          <SelectSimple
            ariaLabel='Recipient kind'
            value={primaryPartyKind}
            onValueChange={(value) => setPartyKind(value as FilemakerPartyKind)}
            options={FILEMAKER_PARTY_KIND_OPTIONS}
          />
        </FormField>
        <FormField label='Manual Party IDs (Comma separated)'>
          <Input
            placeholder='e.g. 123, 456, 789'
            value={filemakerFormatCommaSeparatedValues(manualPartyIds)}
            onChange={(e) => setManualPartyIds(filemakerParseCommaSeparatedValues(e.target.value))}
          />
        </FormField>
      </div>
      <div className='space-y-2'>
        <div className='text-xs font-semibold text-gray-400'>Manual Party References</div>
        <div className='rounded-md border border-border/60 bg-card/25 p-3 text-xs text-gray-500'>
          {manualPartyIds.length === 0 ? (
            'No manual references added. Use the IDs field above for simple targeting.'
          ) : (
            <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
              {manualPartyIds.map((id) => (
                <div key={id} className='rounded border border-border/40 p-2'>
                  <span className='font-medium text-white'>{id}</span> ({primaryPartyKind})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className='space-y-2'>
        <div className='text-xs font-semibold text-gray-400'>
          Field Conditions (organisation / person / email)
        </div>
        <AudienceConditionBuilder
          fieldValueOptions={fieldValueOptions}
          value={draft.audience.conditionGroup}
          onChange={(next: FilemakerAudienceConditionGroup) =>
            setDraft((prev) => ({
              ...prev,
              audience: {
                ...prev.audience,
                conditionGroup: next,
              },
            }))
          }
        />
      </div>
    </FormSection>
  );
};
