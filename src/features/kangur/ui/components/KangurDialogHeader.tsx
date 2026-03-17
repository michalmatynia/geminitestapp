'use client';

import { KangurDialogCloseButton } from '@/features/kangur/ui/components/KangurDialogCloseButton';
import { KangurDialogMeta } from '@/features/kangur/ui/components/KangurDialogMeta';

import type { ReactNode } from 'react';

type KangurDialogHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  closeAriaLabel?: string;
  closeLabel?: ReactNode;
  closeButton?: ReactNode;
};

export function KangurDialogHeader({
  title,
  description,
  closeAriaLabel,
  closeLabel,
  closeButton,
}: KangurDialogHeaderProps): React.JSX.Element {
  return (
    <>
      <KangurDialogMeta title={title} description={description} />
      {closeButton ??
        (closeAriaLabel ? (
          <KangurDialogCloseButton aria-label={closeAriaLabel} label={closeLabel} />
        ) : null)}
    </>
  );
}
