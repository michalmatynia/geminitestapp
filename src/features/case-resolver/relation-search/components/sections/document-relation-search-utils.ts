import { File, FileText, ScanText } from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils/ui-utils';

import type { ResultHeight } from '../../context/DocumentRelationSearchContext';

export function FileTypeIcon({
  fileType,
  className,
}: {
  fileType: string;
  className?: string | undefined;
}): React.JSX.Element {
  if (fileType === 'document') {
    return React.createElement(FileText, { className: cn('size-3.5 text-blue-400/70', className) });
  }
  if (fileType === 'scanfile') {
    return React.createElement(ScanText, {
      className: cn('size-3.5 text-amber-400/70', className),
    });
  }
  return React.createElement(File, { className: cn('size-3.5 text-gray-500', className) });
}

export function formatShortDate(isoDate: string | null | undefined): string {
  if (isoDate === null || isoDate === undefined || isoDate === '') return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export const RESULT_HEIGHT_MAP: Record<ResultHeight, string> = {
  compact: 'max-h-40',
  normal: 'max-h-64',
  expanded: 'max-h-[28rem]',
};

export const TAG_NONE = '__tag_none__';
export const CAT_NONE = '__cat_none__';
