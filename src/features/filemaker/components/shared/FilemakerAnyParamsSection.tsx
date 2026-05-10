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
import {
  FilemakerLinkedRecordActions,
  type FilemakerLinkedRecordEditField,
} from './FilemakerLinkedRecordActions';

export interface FilemakerAnyParamsSectionProps {
  anyParams: FilemakerAnyParam[];
  isSaving?: boolean;
  onDeleteAnyParam?: (id: string) => Promise<void> | void;
  onUpdateAnyParam?: (id: string, patch: Record<string, unknown>) => Promise<void> | void;
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

const buildAnyParamEditFields = (anyParam: FilemakerAnyParam): FilemakerLinkedRecordEditField[] => [
  {
    key: 'legacyValueUuids',
    label: 'Legacy Value UUIDs',
    type: 'textarea',
    rows: 4,
    value: anyParam.legacyValueUuids.join('\n'),
    parse: splitLines,
  },
  {
    key: 'valueIds',
    label: 'Value IDs',
    type: 'textarea',
    rows: 4,
    value: anyParam.valueIds.join('\n'),
    parse: splitLines,
  },
  {
    key: 'textValues',
    label: 'Text Values JSON',
    type: 'textarea',
    rows: 6,
    value: JSON.stringify(anyParam.textValues, null, 2),
    parse: parseJsonArray,
  },
  {
    key: 'values',
    label: 'Values JSON',
    type: 'textarea',
    rows: 8,
    value: JSON.stringify(anyParam.values, null, 2),
    parse: parseJsonArray,
  },
  { key: 'updatedBy', label: 'Modified By', value: anyParam.updatedBy ?? '' },
];

const AnyParamTitleBlock = ({ anyParam }: { anyParam: FilemakerAnyParam }): React.JSX.Element => (
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
);

const AnyParamActions = ({
  anyParam,
  isSaving,
  onDelete,
  onUpdate,
}: {
  anyParam: FilemakerAnyParam;
  isSaving: boolean;
  onDelete?: (id: string) => Promise<void> | void;
  onUpdate?: (id: string, patch: Record<string, unknown>) => Promise<void> | void;
}): React.JSX.Element => (
  <FilemakerLinkedRecordActions
    deleteLabel='any parameter'
    editTitle='Edit Any Parameter'
    isSaving={isSaving}
    fields={buildAnyParamEditFields(anyParam)}
    onSave={
      onUpdate === undefined
        ? undefined
        : (patch: Record<string, unknown>) => onUpdate(anyParam.id, patch)
    }
    onDelete={onDelete === undefined ? undefined : () => onDelete(anyParam.id)}
  />
);

const AnyParamTextValueBadges = ({
  anyParam,
}: {
  anyParam: FilemakerAnyParam;
}): React.JSX.Element | null => {
  if (anyParam.textValues.length === 0) return null;
  return (
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
  );
};

const anyParamValueCount = (anyParam: FilemakerAnyParam): number =>
  anyParam.valueIds.length > 0 ? anyParam.valueIds.length : anyParam.legacyValueUuids.length;

const AnyParamAuditBadges = ({ anyParam }: { anyParam: FilemakerAnyParam }): React.JSX.Element => (
  <div className='flex flex-wrap gap-2'>
    <Badge variant='outline' className='text-[10px]'>
      Values: {anyParamValueCount(anyParam)}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Modified: {formatTimestamp(anyParam.updatedAt)}
    </Badge>
    <Badge variant='outline' className='text-[10px]'>
      Modified By: {formatOptionalValue(anyParam.updatedBy)}
    </Badge>
  </div>
);

const FilemakerAnyParamCard = (props: {
  anyParam: FilemakerAnyParam;
  isSaving: boolean;
  onDelete?: (id: string) => Promise<void> | void;
  onUpdate?: (id: string, patch: Record<string, unknown>) => Promise<void> | void;
}): React.JSX.Element => (
  <Card key={props.anyParam.id} variant='subtle-compact' className='bg-card/20'>
    <div className='space-y-2 p-3'>
      <div className='flex min-w-0 items-start justify-between gap-2'>
        <AnyParamTitleBlock anyParam={props.anyParam} />
        <AnyParamActions {...props} />
      </div>
      <AnyParamTextValueBadges anyParam={props.anyParam} />
      <AnyParamAuditBadges anyParam={props.anyParam} />
    </div>
  </Card>
);

export function FilemakerAnyParamsSection({
  anyParams,
  isSaving = false,
  onDeleteAnyParam,
  onUpdateAnyParam,
  title = 'Any Parameters',
}: FilemakerAnyParamsSectionProps): React.JSX.Element {
  return (
    <FormSection title={title} className='space-y-2 p-4'>
      {anyParams.length === 0 ? (
        <div className='text-xs text-gray-500'>No any parameters linked yet.</div>
      ) : (
        <div className='grid gap-2'>
          {anyParams.map((anyParam: FilemakerAnyParam) => (
            <FilemakerAnyParamCard
              key={anyParam.id}
              anyParam={anyParam}
              isSaving={isSaving}
              onDelete={onDeleteAnyParam}
              onUpdate={onUpdateAnyParam}
            />
          ))}
        </div>
      )}
    </FormSection>
  );
}
