import * as React from 'react';

import { cn } from '@/shared/utils/ui-utils';

type SurfaceComponentProps = {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

type SurfaceProps<T extends SurfaceComponentProps> = Omit<T, 'className' | 'style' | 'children'> & {
  className?: string;
  style?: React.CSSProperties;
};

type RadixOverlayContentShellProps<
  OverlayProps extends SurfaceComponentProps,
  ContentProps extends SurfaceComponentProps,
> = {
  Portal: React.ElementType<{ children?: React.ReactNode }>;
  Overlay: React.ElementType;
  Content: React.ElementType;
  overlayBaseClassName: string;
  contentBaseClassName: string;
  overlayProps?: SurfaceProps<OverlayProps>;
  contentProps?: SurfaceProps<ContentProps>;
  overlayRef?: React.Ref<unknown>;
  contentRef?: React.Ref<unknown>;
  children?: React.ReactNode;
};

export function RadixOverlayContentShell<
  OverlayProps extends SurfaceComponentProps,
  ContentProps extends SurfaceComponentProps,
>({
  Portal,
  Overlay,
  Content,
  overlayBaseClassName,
  contentBaseClassName,
  overlayProps,
  contentProps,
  overlayRef,
  contentRef,
  children,
}: RadixOverlayContentShellProps<OverlayProps, ContentProps>): React.JSX.Element {
  const { className: overlayClassName, style: overlayStyle, ...overlayRest } =
    (overlayProps ?? {}) as SurfaceProps<OverlayProps>;
  const {
    className: contentClassName,
    style: contentStyle,
    children: contentPropChildren,
    ...contentRest
  } = ((contentProps ?? {}) as SurfaceProps<ContentProps> & {
    children?: React.ReactNode;
  });
  const resolvedChildren = children ?? contentPropChildren;

  return (
    <Portal>
      {React.createElement(Overlay, {
        ...(overlayRest as OverlayProps),
        ref: overlayRef,
        className: cn(overlayBaseClassName, overlayClassName),
        style: overlayStyle,
      })}
      {React.createElement(
        Content,
        {
          ...(contentRest as ContentProps),
          ref: contentRef,
          className: cn(contentBaseClassName, contentClassName),
          style: contentStyle,
        },
        resolvedChildren
      )}
    </Portal>
  );
}
