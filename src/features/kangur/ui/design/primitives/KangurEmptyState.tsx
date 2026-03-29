import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_ACCENT_STYLES } from '../tokens';
import { kangurInfoCardVariants, type KangurInfoCardProps } from './KangurInfoCard';

export type KangurEmptyStateProps = React.HTMLAttributes<HTMLDivElement> &
  Pick<KangurInfoCardProps, 'accent' | 'padding'> & {
    align?: 'left' | 'center';
    description?: React.ReactNode;
    icon?: React.ReactNode;
    title?: React.ReactNode;
  };

function KangurEmptyStateIcon(props: {
  accent: NonNullable<KangurEmptyStateProps['accent']>;
  centered: boolean;
  icon: React.ReactNode;
}): React.JSX.Element {
  const { accent, centered, icon } = props;

  return (
    <div
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-2xl',
        KANGUR_ACCENT_STYLES[accent].icon,
        centered && 'mx-auto'
      )}
    >
      {icon}
    </div>
  );
}

function KangurEmptyStateTitle(props: { title: React.ReactNode }): React.JSX.Element {
  return <div className='break-words text-base font-bold [color:var(--kangur-page-text)]'>{props.title}</div>;
}

function KangurEmptyStateDescription(props: { description: React.ReactNode }): React.JSX.Element {
  return (
    <p className='break-words text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
      {props.description}
    </p>
  );
}

export function KangurEmptyState(input: KangurEmptyStateProps): React.JSX.Element {
  const {
    accent = 'slate',
    align = 'center',
    children,
    className,
    description,
    icon,
    padding = 'lg',
    title,
    ...props
  } = input;
  const centered = align === 'center';
  const emptyStateAccent = accent;
  const emptyStateClassName = className;
  const emptyStateDescription = description;
  const emptyStateIcon = icon;
  const emptyStatePadding = padding;
  const emptyStateTitle = title;

  return (
    <div
      className={cn(
        kangurInfoCardVariants({ dashed: true, padding: emptyStatePadding, tone: 'muted' }),
        'kangur-panel-shell',
        'space-y-3',
        centered && 'text-center',
        emptyStateClassName
      )}
      {...props}
    >
      {emptyStateIcon ? (
        <KangurEmptyStateIcon accent={emptyStateAccent} centered={centered} icon={emptyStateIcon} />
      ) : null}
      {emptyStateTitle ? <KangurEmptyStateTitle title={emptyStateTitle} /> : null}
      {emptyStateDescription ? (
        <KangurEmptyStateDescription description={emptyStateDescription} />
      ) : null}
      {children}
    </div>
  );
}
