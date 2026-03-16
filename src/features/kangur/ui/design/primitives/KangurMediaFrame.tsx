import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_SURFACE_CARD_CLASSNAME, type KangurAccent } from '../tokens';

export const kangurMediaFrameVariants = cva(`${KANGUR_SURFACE_CARD_CLASSNAME}`, {
  variants: {
    accent: {
      indigo: 'border-indigo-100 bg-gradient-to-br kangur-gradient-accent-soft-indigo',
      violet: 'border-violet-100 bg-gradient-to-br kangur-gradient-accent-soft-violet',
      emerald: 'border-emerald-100 bg-gradient-to-br kangur-gradient-accent-soft-emerald',
      sky: 'border-sky-100 bg-gradient-to-br kangur-gradient-accent-soft-sky',
      amber: 'border-amber-100 bg-gradient-to-br kangur-gradient-accent-soft-amber',
      rose: 'border-rose-100 bg-gradient-to-br kangur-gradient-accent-soft-rose',
      teal: 'border-teal-100 bg-gradient-to-br kangur-gradient-accent-soft-teal',
      slate: 'border-slate-200/85 bg-gradient-to-br kangur-gradient-accent-soft-slate',
    },
    padding: {
      sm: 'kangur-media-padding-sm',
      md: 'kangur-media-padding-md',
    },
    fillHeight: {
      true: 'flex h-full items-center',
      false: '',
    },
    dashed: {
      true: 'border-dashed',
      false: '',
    },
    overflowHidden: {
      true: 'overflow-hidden',
      false: '',
    },
  },
  defaultVariants: {
    accent: 'slate',
    padding: 'md',
    fillHeight: false,
    dashed: false,
    overflowHidden: false,
  },
});

export const KANGUR_MEDIA_FRAME_FIT_CLASSNAMES = {
  generic: {
    cover: '',
    contain: '',
    none: '',
  },
  image: {
    cover: 'overflow-hidden [&_img]:h-[260px] [&_img]:w-full [&_img]:object-cover',
    contain: '[&_img]:h-auto [&_img]:max-h-[320px] [&_img]:w-full [&_img]:object-contain',
    none: '[&_img]:h-auto [&_img]:w-auto [&_img]:max-w-full',
  },
  svg: {
    cover: '[&_svg]:h-[260px] [&_svg]:w-full [&_svg]:object-cover',
    contain: '[&_svg]:h-auto [&_svg]:max-h-[320px] [&_svg]:w-full [&_svg]:object-contain',
    none: '[&_svg]:h-auto [&_svg]:w-auto [&_svg]:max-w-full',
  },
} as const;

export type KangurMediaFrameProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof kangurMediaFrameVariants> & {
    accent?: KangurAccent;
    fit?: 'cover' | 'contain' | 'none';
    mediaType?: 'generic' | 'image' | 'svg';
  };

export const KangurMediaFrame = React.forwardRef<HTMLDivElement, KangurMediaFrameProps>(
  (
    {
      accent = 'slate',
      className,
      dashed,
      fillHeight,
      fit = 'contain',
      mediaType = 'generic',
      overflowHidden,
      padding,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        kangurMediaFrameVariants({
          accent,
          dashed,
          fillHeight,
          overflowHidden: overflowHidden ?? (mediaType === 'image' && fit === 'cover'),
          padding,
        }),
        KANGUR_MEDIA_FRAME_FIT_CLASSNAMES[mediaType][fit],
        className
      )}
      {...props}
    />
  )
);
KangurMediaFrame.displayName = 'KangurMediaFrame';
