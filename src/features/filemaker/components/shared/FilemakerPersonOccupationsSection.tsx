import { Briefcase, ListTree } from 'lucide-react';
import React from 'react';

import type {
  FilemakerPersonOccupation,
  FilemakerPersonOccupationValue,
} from '../../filemaker-person-occupation.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { Badge, Card } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

export interface FilemakerPersonOccupationsSectionProps {
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

const FilemakerPersonOccupationCard = ({
  occupation,
}: {
  occupation: FilemakerPersonOccupation;
}): React.JSX.Element => (
  <Card key={occupation.id} variant='subtle-compact' className='bg-card/20'>
    <div className='space-y-2 p-3'>
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
      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Values:{' '}
          {occupation.valueIds.length > 0
            ? occupation.valueIds.length
            : occupation.legacyValueUuids.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Modified: {formatTimestamp(occupation.updatedAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Modified By: {formatOptionalValue(occupation.updatedBy)}
        </Badge>
      </div>
    </div>
  </Card>
);

export function FilemakerPersonOccupationsSection({
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
            <FilemakerPersonOccupationCard key={occupation.id} occupation={occupation} />
          ))}
        </div>
      )}
    </FormSection>
  );
}
