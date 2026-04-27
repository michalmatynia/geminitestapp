import { FileText } from 'lucide-react';
import React from 'react';

import type { FilemakerAnyText } from '../../filemaker-anytext.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { Badge, Card } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

export interface FilemakerAnyTextsSectionProps {
  anyTexts: FilemakerAnyText[];
  title?: string;
}

const missingValue = 'n/a';

const formatOptionalValue = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : missingValue;
};

const textPreview = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
};

const FilemakerAnyTextCard = ({
  anyText,
}: {
  anyText: FilemakerAnyText;
}): React.JSX.Element => (
  <Card key={anyText.id} variant='subtle-compact' className='bg-card/20'>
    <div className='space-y-2 p-3'>
      <div className='flex min-w-0 items-start gap-2'>
        <FileText className='mt-0.5 size-3.5 shrink-0 text-sky-300' />
        <div className='min-w-0'>
          <div className='truncate text-sm font-semibold text-white'>{textPreview(anyText.text)}</div>
          <div className='truncate text-[10px] text-gray-600'>
            Legacy UUID: {formatOptionalValue(anyText.legacyUuid)} | Owner UUID:{' '}
            {formatOptionalValue(anyText.legacyOwnerUuid)}
          </div>
        </div>
      </div>
      <div className='max-h-64 overflow-auto whitespace-pre-wrap rounded border border-border bg-muted/20 p-2 text-xs leading-5 text-gray-200'>
        {anyText.text}
      </div>
      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Modified: {formatTimestamp(anyText.updatedAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Modified By: {formatOptionalValue(anyText.updatedBy)}
        </Badge>
      </div>
    </div>
  </Card>
);

export function FilemakerAnyTextsSection({
  anyTexts,
  title = 'Any Text',
}: FilemakerAnyTextsSectionProps): React.JSX.Element {
  return (
    <FormSection title={title} className='space-y-2 p-4'>
      {anyTexts.length === 0 ? (
        <div className='text-xs text-gray-500'>No any text blocks linked yet.</div>
      ) : (
        <div className='grid gap-2'>
          {anyTexts.map((anyText: FilemakerAnyText) => (
            <FilemakerAnyTextCard key={anyText.id} anyText={anyText} />
          ))}
        </div>
      )}
    </FormSection>
  );
}
