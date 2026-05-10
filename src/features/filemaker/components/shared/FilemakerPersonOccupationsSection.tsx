import { Briefcase, ListTree } from 'lucide-react';
import React from 'react';

import type {
  FilemakerPersonOccupation,
  FilemakerPersonOccupationValue,
} from '../../filemaker-person-occupation.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { Badge, Card } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import {
  FilemakerLinkedRecordActions,
  type FilemakerLinkedRecordEditField,
} from './FilemakerLinkedRecordActions';

export interface FilemakerPersonOccupationsSectionProps {
  isSaving?: boolean;
  onDeleteOccupation?: (id: string) => Promise<void> | void;
  onUpdateOccupation?: (id: string, patch: Record<string, unknown>) => Promise<void> | void;
  occupations: FilemakerPersonOccupation[];
  title?: string;
}

const missingValue = 'n/a';

const formatOptionalValue = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : missingValue;
};

const valueLabel = (value: FilemakerPersonOccupationValue): string =>
  formatOptionalValue(value.label ?? value.valueId ?? value.legacyValueUuid);

const occupationPath = (occupation: FilemakerPersonOccupation): string => {
  const values = [...occupation.values].sort(
    (left: FilemakerPersonOccupationValue, right: FilemakerPersonOccupationValue): number =>
      left.level - right.level
  );
  if (values.length > 0) return values.map(valueLabel).join(' > ');
  return occupation.legacyValueUuids.join(' > ');
};

const splitLines = (value: boolean | string): string[] =>
  String(value)
    .split(/\r?\n/)
    .map((entry: string): string => entry.trim())
    .filter((entry: string): boolean => entry.length > 0);

const parseJsonArray = (value: boolean | string): unknown[] => {
  const normalized = String(value).trim();
  if (normalized.length === 0) return [];
  const parsed = JSON.parse(normalized) as unknown;
  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array.');
  return parsed;
};

const buildOccupationEditFields = (
  occupation: FilemakerPersonOccupation
): FilemakerLinkedRecordEditField[] => [
  {
    key: 'legacyValueUuids',
    label: 'Legacy Value UUIDs',
    type: 'textarea',
    rows: 4,
    value: occupation.legacyValueUuids.join('\n'),
    parse: splitLines,
  },
  {
    key: 'valueIds',
    label: 'Value IDs',
    type: 'textarea',
    rows: 4,
    value: occupation.valueIds.join('\n'),
    parse: splitLines,
  },
  {
    key: 'values',
    label: 'Values JSON',
    type: 'textarea',
    rows: 8,
    value: JSON.stringify(occupation.values, null, 2),
    parse: parseJsonArray,
  },
  { key: 'updatedBy', label: 'Modified By', value: occupation.updatedBy ?? '' },
];

const OccupationTitleBlock = ({
  occupation,
}: {
  occupation: FilemakerPersonOccupation;
}): React.JSX.Element => (
  <div className='flex min-w-0 items-start gap-2'>
    <Briefcase className='mt-0.5 size-3.5 shrink-0 text-lime-300' />
    <div className='min-w-0'>
      <div className='truncate text-sm font-semibold text-white'>
        {occupationPath(occupation)}
      </div>
      <div className='truncate text-[10px] text-gray-600'>
        Legacy UUID: {formatOptionalValue(occupation.legacyUuid)} | Person UUID:{' '}
        {formatOptionalValue(occupation.legacyPersonUuid)}
      </div>
    </div>
  </div>
);

const OccupationActions = ({
  isSaving,
  occupation,
  onDelete,
  onUpdate,
}: {
  isSaving: boolean;
  occupation: FilemakerPersonOccupation;
  onDelete?: (id: string) => Promise<void> | void;
  onUpdate?: (id: string, patch: Record<string, unknown>) => Promise<void> | void;
}): React.JSX.Element => (
  <FilemakerLinkedRecordActions
    deleteLabel='occupation'
    editTitle='Edit Occupation'
    isSaving={isSaving}
    fields={buildOccupationEditFields(occupation)}
    onSave={
      onUpdate === undefined
        ? undefined
        : (patch: Record<string, unknown>) => onUpdate(occupation.id, patch)
    }
    onDelete={onDelete === undefined ? undefined : () => onDelete(occupation.id)}
  />
);

const OccupationValueBadges = ({
  occupation,
}: {
  occupation: FilemakerPersonOccupation;
}): React.JSX.Element => (
  <div className='flex flex-wrap gap-1.5'>
    {occupation.values.map((value: FilemakerPersonOccupationValue) => (
      <Badge
        key={`${occupation.id}-${value.level}-${value.legacyValueUuid}`}
        variant='outline'
        className='max-w-full text-[10px]'
      >
        <ListTree className='mr-1 size-3' />
        <span className='truncate'>
          Level {value.level}: {valueLabel(value)}
        </span>
      </Badge>
    ))}
  </div>
);

const occupationValueCount = (occupation: FilemakerPersonOccupation): number =>
  occupation.valueIds.length > 0
    ? occupation.valueIds.length
    : occupation.legacyValueUuids.length;

const OccupationAuditBadges = ({
  occupation,
}: {
  occupation: FilemakerPersonOccupation;
}): React.JSX.Element => (
  <div className='flex flex-wrap gap-2'>
    <Badge variant='outline' className='text-[10px]'>
      Values: {occupationValueCount(occupation)}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Modified: {formatTimestamp(occupation.updatedAt)}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Modified By: {formatOptionalValue(occupation.updatedBy)}
    </Badge>
  </div>
);

const FilemakerPersonOccupationCard = (props: {
  isSaving: boolean;
  onDelete?: (id: string) => Promise<void> | void;
  onUpdate?: (id: string, patch: Record<string, unknown>) => Promise<void> | void;
  occupation: FilemakerPersonOccupation;
}): React.JSX.Element => (
  <Card key={props.occupation.id} variant='subtle-compact' className='bg-card/20'>
    <div className='space-y-2 p-3'>
      <div className='flex min-w-0 items-start justify-between gap-2'>
        <OccupationTitleBlock occupation={props.occupation} />
        <OccupationActions {...props} />
      </div>
      <OccupationValueBadges occupation={props.occupation} />
      <OccupationAuditBadges occupation={props.occupation} />
    </div>
  </Card>
);

export function FilemakerPersonOccupationsSection({
  isSaving = false,
  onDeleteOccupation,
  onUpdateOccupation,
  occupations,
  title = 'Occupations',
}: FilemakerPersonOccupationsSectionProps): React.JSX.Element {
  return (
    <FormSection title={title} className='space-y-2 p-4'>
      {occupations.length === 0 ? (
        <div className='text-xs text-gray-500'>No occupations linked yet.</div>
      ) : (
        <div className='grid gap-2'>
          {occupations.map((occupation: FilemakerPersonOccupation) => (
            <FilemakerPersonOccupationCard
              key={occupation.id}
              occupation={occupation}
              isSaving={isSaving}
              onDelete={onDeleteOccupation}
              onUpdate={onUpdateOccupation}
            />
          ))}
        </div>
      )}
    </FormSection>
  );
}
