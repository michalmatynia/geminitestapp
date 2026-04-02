'use client';

import Link from 'next/link';
import React from 'react';

import {
  textEditorEngineSettingsMetaByInstance,
} from '@/shared/lib/text-editor-engine/defaults';
import {
  getTextEditorInstanceSettingsHref,
} from '@/shared/lib/text-editor-engine/settings';
import type { TextEditorEngineInstance } from '@/shared/lib/text-editor-engine/types';
import { cn } from '@/shared/utils';

export interface TextEditorEngineBrandButtonProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick' | 'onMouseDown'> {
  instance: TextEditorEngineInstance;
  href?: string;
}

export function TextEditorEngineBrandButton({
  instance,
  href,
  className,
  ...props
}: TextEditorEngineBrandButtonProps): React.JSX.Element {
  const meta = textEditorEngineSettingsMetaByInstance[instance];
  const label = `Open ${meta.title} text editor settings`;

  return (
    <Link
      href={href ?? getTextEditorInstanceSettingsHref(instance)}
      className={cn(
        'absolute bottom-2 right-2 z-20 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-border bg-muted/80 px-1.5 text-[10px] font-semibold lowercase text-gray-300 shadow-sm transition hover:bg-muted hover:text-white',
        className
      )}
      title={label}
      aria-label={label}
      onMouseDown={(event: React.MouseEvent<HTMLAnchorElement>): void => {
        event.stopPropagation();
      }}
      onClick={(event: React.MouseEvent<HTMLAnchorElement>): void => {
        event.stopPropagation();
      }}
      {...props}
    >
      te
    </Link>
  );
}
