import type { ComponentProps, ReactNode } from 'react';

import { KangurOptionCardButton } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { cn } from '@/features/kangur/shared/utils';

type KangurIconSummaryOptionCardProps = Omit<
  ComponentProps<typeof KangurOptionCardButton>,
  'className'
> & {
  buttonClassName?: string;
  children: ReactNode;
};

export function KangurIconSummaryOptionCard(
  props: KangurIconSummaryOptionCardProps
): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const { buttonClassName, children, type = 'button', ...buttonProps } = props;

  return (
    <KangurOptionCardButton
      className={cn(
        isCoarsePointer && 'min-h-11 px-4 active:scale-[0.98]',
        buttonClassName
      )}
      type={type}
      {...buttonProps}
    >
      {children}
    </KangurOptionCardButton>
  );
}
