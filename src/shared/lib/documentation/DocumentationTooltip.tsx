'use client';

import React from 'react';

import { type DocumentationModuleId } from '@/shared/contracts/documentation';
import { Tooltip } from '@/shared/ui';

import { getDocumentationTooltip } from './tooltips';

type DocumentationTooltipProps = {
  children: React.ReactNode;
  docId: string;
  enabled: boolean;
  moduleId: DocumentationModuleId;
  maxWidth?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  wrapperClassName?: string;
};

export function DocumentationTooltip(props: DocumentationTooltipProps): React.JSX.Element {
  const {
    children,
    docId,
    enabled,
    moduleId,
    maxWidth = '400px',
    side = 'top',
    wrapperClassName = 'inline-flex',
  } = props;

  if (!enabled) {
    return <>{children}</>;
  }

  const content = getDocumentationTooltip(moduleId, docId);
  if (!content) {
    return <>{children}</>;
  }

  return (
    <Tooltip content={content} maxWidth={maxWidth} side={side} className={wrapperClassName}>
      {children}
    </Tooltip>
  );
}
