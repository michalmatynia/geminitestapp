import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/features/kangur/shared/utils';

import type { ReactNode } from 'react';

type KangurDialogMetaProps = {
  title: ReactNode;
  description: ReactNode;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function KangurDialogMeta({
  title,
  description,
  titleClassName,
  descriptionClassName,
}: KangurDialogMetaProps): React.JSX.Element {
  return (
    <>
      <DialogPrimitive.Title className={cn('sr-only', titleClassName)}>
        {title}
      </DialogPrimitive.Title>
      <DialogPrimitive.Description className={cn('sr-only', descriptionClassName)}>
        {description}
      </DialogPrimitive.Description>
    </>
  );
}
