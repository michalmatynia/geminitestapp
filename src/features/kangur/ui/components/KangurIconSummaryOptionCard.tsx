'use client';

import type { ComponentProps } from 'react';

import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import { KangurOptionCardButton } from '@/features/kangur/ui/design/primitives';

type KangurIconSummaryOptionCardProps = Omit<
  ComponentProps<typeof KangurOptionCardButton>,
  'children' | 'className'
> &
  Omit<ComponentProps<typeof KangurIconSummaryCardContent>, 'className'> & {
    buttonClassName?: string;
    layoutClassName?: string;
  };

export function KangurIconSummaryOptionCard({
  aside,
  asideClassName,
  buttonClassName,
  contentClassName,
  description,
  descriptionClassName,
  footer,
  footerClassName,
  headerClassName,
  icon,
  layoutClassName,
  title,
  titleClassName,
  titleWrapperClassName,
  type = 'button',
  ...buttonProps
}: KangurIconSummaryOptionCardProps): React.JSX.Element {
  return (
    <KangurOptionCardButton className={buttonClassName} type={type} {...buttonProps}>
      <KangurIconSummaryCardContent
        aside={aside}
        asideClassName={asideClassName}
        className={layoutClassName}
        contentClassName={contentClassName}
        description={description}
        descriptionClassName={descriptionClassName}
        footer={footer}
        footerClassName={footerClassName}
        headerClassName={headerClassName}
        icon={icon}
        title={title}
        titleClassName={titleClassName}
        titleWrapperClassName={titleWrapperClassName}
      />
    </KangurOptionCardButton>
  );
}
