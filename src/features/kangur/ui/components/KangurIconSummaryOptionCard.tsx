import type { ComponentProps, ReactNode } from 'react';

import { KangurOptionCardButton } from '@/features/kangur/ui/design/primitives';

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
  const { buttonClassName, children, type = 'button', ...buttonProps } = props;

  return (
    <KangurOptionCardButton className={buttonClassName} type={type} {...buttonProps}>
      {children}
    </KangurOptionCardButton>
  );
}
