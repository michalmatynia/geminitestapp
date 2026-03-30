import type { ReactNode } from 'react';

import { cn } from '@/features/kangur/shared/utils';

type KangurIconSummaryCardContentProps = {
  aside?: ReactNode;
  asideClassName?: string;
  className?: string;
  contentClassName?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  footer?: ReactNode;
  footerClassName?: string;
  headerClassName?: string;
  icon: ReactNode;
  title: ReactNode;
  titleClassName?: string;
  titleAs?: 'div' | 'h1' | 'h2' | 'h3' | 'p' | 'span';
  titleId?: string;
  titleWrapperClassName?: string;
};

export function KangurIconSummaryCardContent(
  props: KangurIconSummaryCardContentProps
): React.JSX.Element {
  const {
    aside,
    asideClassName,
    className,
    contentClassName,
    description,
    descriptionClassName,
    footer,
    footerClassName,
    headerClassName,
    icon,
    title,
    titleClassName,
    titleAs: TitleTag = 'div',
    titleId,
    titleWrapperClassName,
  } = props;
  return (
    <div className={cn('flex items-start kangur-panel-gap', className)}>
      {icon}
      <div className={cn('min-w-0 flex-1', contentClassName)}>
        <div className={cn('flex items-start justify-between kangur-panel-gap', headerClassName)}>
          <div className={cn('min-w-0 flex-1', titleWrapperClassName)}>
            <TitleTag
              id={titleId}
              className={cn(
                'break-words text-base font-extrabold leading-tight [color:var(--kangur-page-text)]',
                titleClassName
              )}
            >
              {title}
            </TitleTag>
            {description ? (
              <div
                className={cn(
                  'mt-0.5 break-words text-sm [color:var(--kangur-page-muted-text)]',
                  descriptionClassName
                )}
              >
                {description}
              </div>
            ) : null}
          </div>
          {aside ? <div className={cn('shrink-0', asideClassName)}>{aside}</div> : null}
        </div>
        {footer ? <div className={cn('mt-2', footerClassName)}>{footer}</div> : null}
      </div>
    </div>
  );
}
