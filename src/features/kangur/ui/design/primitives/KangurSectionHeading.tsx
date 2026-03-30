import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_ACCENT_STYLES, type KangurAccent } from '../tokens';
import {
  KANGUR_HEADLINE_CLASSNAMES,
  kangurHeadlineVariants,
} from './KangurHeadline';
import { kangurIconBadgeVariants } from './KangurIconBadge';

export type KangurSectionHeadingProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> & {
  accent?: KangurAccent;
  align?: 'left' | 'center';
  description?: React.ReactNode;
  descriptionId?: string;
  headingAs?: 'h1' | 'h2' | 'h3';
  headingSize?: VariantProps<typeof kangurHeadlineVariants>['size'];
  icon?: React.ReactNode;
  iconAccent?: KangurAccent;
  iconSize?: VariantProps<typeof kangurIconBadgeVariants>['size'];
  layout?: 'stacked' | 'inline';
  title: React.ReactNode;
  titleId?: string;
};

const resolveKangurSectionHeadingAlignmentClassName = (
  align: NonNullable<KangurSectionHeadingProps['align']>
): string => (align === 'left' ? 'items-start text-left' : 'items-center text-center');

const resolveKangurSectionHeadingLayoutClassName = (
  layout: NonNullable<KangurSectionHeadingProps['layout']>
): string => (layout === 'inline' ? 'flex-row' : 'flex-col');

const resolveKangurSectionHeadingContentClassName = (
  layout: NonNullable<KangurSectionHeadingProps['layout']>
): string => (layout === 'inline' ? 'space-y-1 min-w-0' : 'space-y-1');

function KangurSectionHeadingIcon(props: {
  accent: KangurAccent;
  icon: React.ReactNode;
  iconAccent?: KangurAccent;
  iconSize: VariantProps<typeof kangurIconBadgeVariants>['size'];
}): React.JSX.Element {
  const { accent, icon, iconAccent, iconSize } = props;

  return (
    <span
      className={cn(
        kangurIconBadgeVariants({ size: iconSize }),
        KANGUR_ACCENT_STYLES[iconAccent ?? accent].icon
      )}
      aria-hidden='true'
    >
      {icon}
    </span>
  );
}

function KangurSectionHeadingOptionalIcon(props: {
  accent: KangurAccent;
  icon?: React.ReactNode;
  iconAccent?: KangurAccent;
  iconSize: VariantProps<typeof kangurIconBadgeVariants>['size'];
}): React.JSX.Element | null {
  const { accent, icon, iconAccent, iconSize } = props;

  return icon ? (
    <KangurSectionHeadingIcon
      accent={accent}
      icon={icon}
      iconAccent={iconAccent}
      iconSize={iconSize}
    />
  ) : null;
}

function KangurSectionHeadingDescription(props: {
  description: React.ReactNode;
  descriptionId?: string;
}): React.JSX.Element {
  return (
    <p className='break-words text-sm [color:var(--kangur-page-muted-text)]' id={props.descriptionId}>
      {props.description}
    </p>
  );
}

function KangurSectionHeadingOptionalDescription(props: {
  description?: React.ReactNode;
  descriptionId?: string;
}): React.JSX.Element | null {
  return props.description ? (
    <KangurSectionHeadingDescription
      description={props.description}
      descriptionId={props.descriptionId}
    />
  ) : null;
}

export function KangurSectionHeading(props: KangurSectionHeadingProps): React.JSX.Element {
  const {
    accent = 'slate',
    align = 'center',
    className,
    description,
    descriptionId,
    headingAs = 'h2',
    headingSize = 'sm',
    icon,
    iconAccent,
    iconSize = 'md',
    layout = 'stacked',
    title,
    titleId,
    ...restProps
  } = props;
  const alignmentClassName = resolveKangurSectionHeadingAlignmentClassName(align);
  const HeadingComp = headingAs;

  return (
    <div
      className={cn(
        'flex kangur-panel-gap',
        resolveKangurSectionHeadingLayoutClassName(layout),
        alignmentClassName,
        className
      )}
      {...restProps}
    >
      <KangurSectionHeadingOptionalIcon
        accent={accent}
        icon={icon}
        iconAccent={iconAccent}
        iconSize={iconSize}
      />
      <div className={resolveKangurSectionHeadingContentClassName(layout)}>
        <HeadingComp
          className={cn(
            'break-words',
            kangurHeadlineVariants({ size: headingSize }),
            KANGUR_HEADLINE_CLASSNAMES[accent]
          )}
          id={titleId}
        >
          {title}
        </HeadingComp>
        <KangurSectionHeadingOptionalDescription
          description={description}
          descriptionId={descriptionId}
        />
      </div>
    </div>
  );
}
