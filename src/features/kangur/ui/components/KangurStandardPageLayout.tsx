'use client';

import type { ReactNode } from 'react';

import { LazyKangurDocsTooltipEnhancer } from '@/features/kangur/ui/components/LazyKangurDocsTooltipEnhancer';
import {
  KangurPageContainer,
  KangurPageShell,
  type KangurPageContainerProps,
  type KangurPageShellProps,
} from '@/features/kangur/ui/design/primitives';
import type { KangurPageTone } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

export type KangurStandardPageLayoutProps = {
  embeddedOverride?: boolean | null;
  tone?: KangurPageTone;
  id?: string;
  shellClassName?: string;
  skipLinkTargetId?: string;
  skipLinkLabel?: string;
  docsRootId?: string;
  docsTooltipsEnabled?: boolean;
  shellProps?: Omit<KangurPageShellProps, 'children' | 'tone' | 'skipLinkTargetId' | 'skipLinkLabel'>;
  navigation?: ReactNode;
  beforeNavigation?: ReactNode;
  afterNavigation?: ReactNode;
  containerProps?: Omit<KangurPageContainerProps, 'children'>;
  children: ReactNode;
};

type KangurStandardPageLayoutResolvedProps = {
  embeddedOverride?: boolean | null;
  tone: KangurPageTone;
  resolvedShellId?: string;
  resolvedSkipLinkTargetId?: string;
  skipLinkLabel?: string;
  resolvedShellClassName?: string;
  docsRootId?: string;
  docsTooltipsEnabled: boolean;
  restShellProps: Omit<
    KangurPageShellProps,
    'children' | 'tone' | 'skipLinkTargetId' | 'skipLinkLabel'
  >;
  beforeNavigation?: ReactNode;
  navigation?: ReactNode;
  afterNavigation?: ReactNode;
  resolvedContainerProps: Omit<KangurPageContainerProps, 'children'>;
  children: ReactNode;
};

const renderKangurStandardPageLayout = (
  resolvedProps: KangurStandardPageLayoutResolvedProps
): React.JSX.Element => {
  const {
    embeddedOverride,
    tone,
    resolvedShellId,
    resolvedSkipLinkTargetId,
    skipLinkLabel,
    resolvedShellClassName,
    docsRootId,
    docsTooltipsEnabled,
    restShellProps,
    beforeNavigation,
    navigation,
    afterNavigation,
    resolvedContainerProps,
    children,
  } = resolvedProps;

  return (
    <KangurPageShell
      embeddedOverride={embeddedOverride}
      tone={tone}
      id={resolvedShellId}
      skipLinkTargetId={resolvedSkipLinkTargetId}
      skipLinkLabel={skipLinkLabel}
      className={resolvedShellClassName}
      {...restShellProps}
    >
      {docsRootId ? (
        <LazyKangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId={docsRootId} />
      ) : null}
      {beforeNavigation}
      {navigation}
      {afterNavigation}
      <KangurPageContainer embeddedOverride={embeddedOverride} {...resolvedContainerProps}>
        {children}
      </KangurPageContainer>
    </KangurPageShell>
  );
};

const resolveKangurStandardPageLayoutResolvedProps = (
  props: KangurStandardPageLayoutProps
): KangurStandardPageLayoutResolvedProps => {
  const {
    embeddedOverride,
    tone = 'play',
    id,
    shellClassName,
    skipLinkTargetId,
    skipLinkLabel,
    docsRootId,
    docsTooltipsEnabled = true,
    shellProps,
    navigation,
    beforeNavigation,
    afterNavigation,
    containerProps,
    children,
  } = props;
  const { className: shellPropsClassName, id: shellPropsId, ...restShellProps } = shellProps ?? {};
  const resolvedContainerId = resolveKangurStandardPageLayoutContainerId(containerProps);

  return {
    embeddedOverride,
    tone,
    resolvedShellId: id ?? shellPropsId,
    resolvedSkipLinkTargetId: skipLinkTargetId ?? resolvedContainerId,
    skipLinkLabel,
    resolvedShellClassName: cn(shellPropsClassName, shellClassName),
    docsRootId,
    docsTooltipsEnabled,
    restShellProps,
    beforeNavigation,
    navigation,
    afterNavigation,
    resolvedContainerProps: resolveKangurStandardPageLayoutContainerProps(containerProps),
    children,
  };
};

const resolveKangurStandardPageLayoutContainerId = (
  containerProps: KangurStandardPageLayoutProps['containerProps']
): string | undefined => {
  const containerId = containerProps?.id;
  return typeof containerId === 'string' && containerId.trim().length > 0 ? containerId : undefined;
};

const resolveKangurStandardPageLayoutContainerProps = (
  containerProps: KangurStandardPageLayoutProps['containerProps']
): Omit<KangurPageContainerProps, 'children'> => ({
  ...containerProps,
  'data-kangur-route-main':
    containerProps && 'data-kangur-route-main' in containerProps
      ? containerProps['data-kangur-route-main']
      : true,
});

export function KangurStandardPageLayout(props: KangurStandardPageLayoutProps): React.JSX.Element {
  return renderKangurStandardPageLayout(resolveKangurStandardPageLayoutResolvedProps(props));
}
