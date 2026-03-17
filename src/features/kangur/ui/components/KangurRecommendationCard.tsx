import type { ComponentProps, ReactNode } from 'react';

import {
  KangurCardDescription,
  KangurCardTitle,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/utils/cn';

// ── Recommendation Card Sub-components ───────────────────────────────────────

export function KangurRecommendationCardHeader({
  accent,
  labelContent,
  label,
  labelClassName,
  labelTestId,
  labelStyle,
  labelSize,
  headerExtras,
  className,
}: {
  accent: ComponentProps<typeof KangurInfoCard>['accent'];
  labelContent?: ReactNode;
  label?: ReactNode;
  labelClassName?: string;
  labelTestId?: string;
  labelStyle?: ComponentProps<typeof KangurStatusChip>['labelStyle'];
  labelSize?: ComponentProps<typeof KangurStatusChip>['size'];
  headerExtras?: ReactNode;
  className?: string;
}): React.JSX.Element {
  const chipAccent = accent;
  const chipClassName = labelClassName;
  const chipTestId = labelTestId;
  const chipLabelStyle = labelStyle;
  const chipLabelSize = labelSize;

  return (
    <div className={cn(KANGUR_WRAP_CENTER_ROW_CLASSNAME, className)}>
      {labelContent ??
        (label ? (
          <KangurStatusChip
            accent={chipAccent}
            className={cn('w-fit text-[11px] uppercase tracking-[0.16em]', chipClassName)}
            data-testid={chipTestId}
            labelStyle={chipLabelStyle}
            size={chipLabelSize}
          >
            {label}
          </KangurStatusChip>
        ) : null)}
      {headerExtras}
    </div>
  );
}

export function KangurRecommendationCardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex flex-col', className)}>
      {children}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

type KangurRecommendationCardProps = {
  action?: ReactNode;
  accent: ComponentProps<typeof KangurInfoCard>['accent'];
  bodyClassName?: string;
  className?: string;
  contentClassName?: string;
  dataTestId: string;
  description?: ReactNode;
  descriptionClassName?: string;
  descriptionRelaxed?: boolean;
  descriptionSize?: ComponentProps<typeof KangurCardDescription>['size'];
  descriptionTestId?: string;
  headerClassName?: string;
  headerExtras?: ReactNode;
  label?: ReactNode;
  labelClassName?: string;
  labelContent?: ReactNode;
  labelSize?: ComponentProps<typeof KangurStatusChip>['size'];
  labelStyle?: ComponentProps<typeof KangurStatusChip>['labelStyle'];
  labelTestId?: string;
  title: ReactNode;
  titleClassName?: string;
  titleSize?: ComponentProps<typeof KangurCardTitle>['size'];
  titleTestId: string;
};

export default function KangurRecommendationCard(
  props: KangurRecommendationCardProps
): React.JSX.Element {
  const {
    action,
    accent,
    bodyClassName,
    className,
    contentClassName,
    dataTestId,
    description,
    descriptionClassName,
    descriptionRelaxed,
    descriptionSize,
    descriptionTestId,
    headerClassName,
    headerExtras,
    label,
    labelClassName,
    labelContent,
    labelSize,
    labelStyle,
    labelTestId,
    title,
    titleClassName,
    titleSize,
    titleTestId,
  } = props;

  return (
    <KangurInfoCard
      accent={accent}
      className={cn('w-full', className)}
      data-testid={dataTestId}
      padding='md'
      tone='accent'
    >
      <div className={cn(KANGUR_STACK_TIGHT_CLASSNAME, 'text-left', contentClassName)}>
        <KangurRecommendationCardHeader
          accent={accent}
          className={headerClassName}
          headerExtras={headerExtras}
          label={label}
          labelClassName={labelClassName}
          labelContent={labelContent}
          labelSize={labelSize}
          labelStyle={labelStyle}
          labelTestId={labelTestId}
        />
        <KangurRecommendationCardBody className={bodyClassName}>
          <KangurCardTitle
            as='p'
            className={titleClassName}
            data-testid={titleTestId}
            size={titleSize}
          >
            {title}
          </KangurCardTitle>
          {description ? (
            <KangurCardDescription
              as='p'
              className={descriptionClassName}
              data-testid={descriptionTestId}
              relaxed={descriptionRelaxed}
              size={descriptionSize}
            >
              {description}
            </KangurCardDescription>
          ) : null}
        </KangurRecommendationCardBody>
        {action}
      </div>
    </KangurInfoCard>
  );
}
