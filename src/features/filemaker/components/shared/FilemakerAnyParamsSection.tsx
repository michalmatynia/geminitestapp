import { ListTree, Tags } from 'lucide-react';
import React from 'react';

import type {
  FilemakerAnyParam,
  FilemakerAnyParamTextValue,
  FilemakerAnyParamValue,
} from '../../filemaker-anyparam.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { Badge, Card } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

export interface FilemakerAnyParamsSectionProps {
  anyParams: FilemakerAnyParam[];
  title?: string;
}

const missingValue = 'n/a';

const formatOptionalValue = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : missingValue;
};

const valueLabel = (value: FilemakerAnyParamValue): string =>
  formatOptionalValue(value.label ?? value.valueId ?? value.legacyValueUuid);

const anyParamPath = (anyParam: FilemakerAnyParam): string => {
  const values = [...anyParam.values].sort(
    (left: FilemakerAnyParamValue, right: FilemakerAnyParamValue): number =>
      left.level - right.level
  );
  if (values.length > 0) return values.map(valueLabel).join(' > ');
  if (anyParam.legacyValueUuids.length > 0) return anyParam.legacyValueUuids.join(' > ');
  return 'Free text parameter';
};

const textValueLabel = (textValue: FilemakerAnyParamTextValue): string =>
  `${textValue.field}: ${textValue.value}`;

const FilemakerAnyParamCard = ({
  anyParam,
}: {
  anyParam: FilemakerAnyParam;
}): React.JSX.Element => (
  <Card key={anyParam.id} variant='subtle-compact' className='bg-card/20'>
    <div className='space-y-2 p-3'>
      <div className='flex min-w-0 items-start gap-2'>
        <ListTree className='mt-0.5 size-3.5 shrink-0 text-violet-300' />
        <div className='min-w-0'>
          <div className='truncate text-sm font-semibold text-white'>{anyParamPath(anyParam)}</div>
          <div className='truncate text-[10px] text-gray-600'>
            Legacy UUID: {formatOptionalValue(anyParam.legacyUuid)} | Owner UUID:{' '}
            {formatOptionalValue(anyParam.legacyOwnerUuid)}
          </div>
        </div>
      </div>
      {anyParam.textValues.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {anyParam.textValues.map((textValue: FilemakerAnyParamTextValue) => (
            <Badge
              key={`${anyParam.id}-${textValue.field}-${textValue.slot}`}
              variant='outline'
              className='max-w-full text-[10px]'
            >
              <Tags className='mr-1 size-3' />
              <span className='truncate'>{textValueLabel(textValue)}</span>
            </Badge>
          ))}
        </div>
      ) : null}
      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Values: {anyParam.valueIds.length > 0 ? anyParam.valueIds.length : anyParam.legacyValueUuids.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Modified: {formatTimestamp(anyParam.updatedAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Modified By: {formatOptionalValue(anyParam.updatedBy)}
        </Badge>
      </div>
    </div>
  </Card>
);

export function FilemakerAnyParamsSection({
  anyParams,
  title = 'Any Parameters',
}: FilemakerAnyParamsSectionProps): React.JSX.Element {
  return (
    <FormSection title={title} className='space-y-2 p-4'>
      {anyParams.length === 0 ? (
        <div className='text-xs text-gray-500'>No any parameters linked yet.</div>
      ) : (
        <div className='grid gap-2'>
          {anyParams.map((anyParam: FilemakerAnyParam) => (
            <FilemakerAnyParamCard key={anyParam.id} anyParam={anyParam} />
          ))}
        </div>
      )}
    </FormSection>
  );
}
