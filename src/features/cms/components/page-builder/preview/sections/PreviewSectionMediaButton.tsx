'use client';

import React from 'react';

import type { MediaReplaceTarget } from '@/features/cms/components/page-builder/preview/preview-utils';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

interface PreviewSectionMediaButtonProps {
  show: boolean;
  onOpenMedia?: ((target: MediaReplaceTarget) => void) | undefined;
  sectionId: string;
  mediaKey: string;
  label?: string;
  className?: string;
}

export function PreviewSectionMediaButton({
  show,
  onOpenMedia,
  sectionId,
  mediaKey,
  label = 'Replace image',
  className,
}: PreviewSectionMediaButtonProps): React.JSX.Element | null {
  if (!show || !onOpenMedia) return null;

  return (
    <Button
      type='button'
      size='sm'
      variant='outline'
      onClick={(event: React.MouseEvent): void => {
        event.stopPropagation();
        onOpenMedia({
          kind: 'section',
          sectionId,
          key: mediaKey,
        });
      }}
      className={cn(
        'absolute left-3 top-3 z-10 h-7 rounded-full border-border/40 bg-gray-900/70 px-2 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-gray-900/90 hover:text-white',
        className
      )}
    >
      {label}
    </Button>
  );
}
