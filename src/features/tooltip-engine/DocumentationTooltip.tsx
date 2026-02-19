'use client';

import React from 'react';

import { type DocumentationModuleId } from '@/features/documentation';
import { Tooltip } from '@/shared/ui';

import { getDocumentationTooltip } from './tooltip-content';

type DocumentationTooltipProps = {
  children: React.ReactNode;
  docId: string;
  enabled: boolean;
  moduleId: DocumentationModuleId;
  maxWidth?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  wrapperClassName?: string;
};

export function DocumentationTooltip({
  children,
  docId,
  enabled,
  moduleId,
  maxWidth = '400px',
  side = 'top',
  wrapperClassName = 'inline-flex',
}: DocumentationTooltipProps): React.JSX.Element {
  if (!enabled) {
    return <>{children}</>;
  }

  const content = getDocumentationTooltip(moduleId, docId);
  if (!content) {
    return <>{children}</>;
  }

  return (
    <Tooltip content={content} maxWidth={maxWidth} side={side}>
      <span className={wrapperClassName}>{children}</span>
    </Tooltip>
  );
}
