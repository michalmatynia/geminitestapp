'use client';

import type { ReactNode } from 'react';

import { KangurDocsTooltipEnhancer } from '@/features/kangur/docs/tooltips';
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

export function KangurStandardPageLayout({
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
}: KangurStandardPageLayoutProps): React.JSX.Element {
  const { className: shellPropsClassName, id: shellPropsId, ...restShellProps } = shellProps ?? {};
  const resolvedContainerId =
    typeof containerProps?.id === 'string' && containerProps.id.trim().length > 0
      ? containerProps.id
      : undefined;
  const resolvedSkipLinkTargetId = skipLinkTargetId ?? resolvedContainerId;
  const resolvedShellId = id ?? shellPropsId;
  const resolvedShellClassName = cn(shellPropsClassName, shellClassName);
  const resolvedContainerProps: Omit<KangurPageContainerProps, 'children'> = {
    ...containerProps,
    'data-kangur-route-main':
      containerProps && 'data-kangur-route-main' in containerProps
        ? containerProps['data-kangur-route-main']
        : true,
  };

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
        <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId={docsRootId} />
      ) : null}
      {beforeNavigation}
      {navigation}
      {afterNavigation}
      <KangurPageContainer embeddedOverride={embeddedOverride} {...resolvedContainerProps}>
        {children}
      </KangurPageContainer>
    </KangurPageShell>
  );
}
