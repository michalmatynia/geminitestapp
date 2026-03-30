import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_ACCENT_STYLES } from '../tokens';
import { kangurInfoCardVariants } from './KangurInfoCard';

export type KangurInlineFallbackProps = React.HTMLAttributes<HTMLDivElement> & {
  accent?: string;
  align?: 'left' | 'center';
  description?: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
};

const resolveKangurInlineFallbackAccent = (accent: string): string =>
  KANGUR_ACCENT_STYLES[accent as keyof typeof KANGUR_ACCENT_STYLES]?.icon ||
  KANGUR_ACCENT_STYLES.slate.icon;

function KangurInlineFallbackIcon(props: {
  accent: string;
  centered: boolean;
  icon: React.ReactNode;
}): React.JSX.Element {
  const { accent, centered, icon } = props;

  return (
    <div
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-2xl',
        resolveKangurInlineFallbackAccent(accent),
        centered && 'mx-auto'
      )}
    >
      {icon}
    </div>
  );
}

function KangurInlineFallbackDescription(props: {
  description: React.ReactNode;
}): React.JSX.Element {
  return (
    <p className='break-words text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
      {props.description}
    </p>
  );
}

export function KangurInlineFallback({
  accent = 'slate',
  align = 'center',
  children,
  className,
  description,
  icon,
  title,
  ...props
}: KangurInlineFallbackProps): React.JSX.Element {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        kangurInfoCardVariants({ dashed: true, padding: 'md', tone: 'muted' }),
        'w-full space-y-3',
        centered && 'text-center',
        className
      )}
      {...props}
    >
      {icon ? <KangurInlineFallbackIcon accent={accent} centered={centered} icon={icon} /> : null}
      <div className='break-words text-base font-bold [color:var(--kangur-page-text)]'>
        {title}
      </div>
      {description ? <KangurInlineFallbackDescription description={description} /> : null}
      {children}
    </div>
  );
}
