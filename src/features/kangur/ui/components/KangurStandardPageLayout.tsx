'use client';

import type { ReactNode } from 'react';

import { KangurDocsTooltipEnhancer } from '@/features/kangur/docs/tooltips';
import {
  KangurPageContainer,
  KangurPageShell,
  type KangurPageContainerProps,
} from '@/features/kangur/ui/design/primitives';
import type { KangurPageTone } from '@/features/kangur/ui/design/tokens';

export type KangurStandardPageLayoutProps = {
  tone?: KangurPageTone;
  id?: string;
  skipLinkTargetId?: string;
  skipLinkLabel?: string;
  docsRootId?: string;
  docsTooltipsEnabled?: boolean;
  navigation?: ReactNode;
  beforeNavigation?: ReactNode;
  afterNavigation?: ReactNode;
  containerProps?: Omit<KangurPageContainerProps, 'children'>;
  children: ReactNode;
};

export function KangurStandardPageLayout({
  tone = 'play',
  id,
  skipLinkTargetId,
  skipLinkLabel,
  docsRootId,
  docsTooltipsEnabled = true,
  navigation,
  beforeNavigation,
  afterNavigation,
  containerProps,
  children,
}: KangurStandardPageLayoutProps): React.JSX.Element {
  const resolvedContainerId =
    typeof containerProps?.id === 'string' && containerProps.id.trim().length > 0
      ? containerProps.id
      : undefined;
  const resolvedSkipLinkTargetId = skipLinkTargetId ?? resolvedContainerId;
  const resolvedContainerProps: Omit<KangurPageContainerProps, 'children'> = {
    ...containerProps,
    'data-kangur-route-main':
      containerProps && 'data-kangur-route-main' in containerProps
        ? containerProps['data-kangur-route-main']
        : true,
  };

  return (
    <KangurPageShell
      tone={tone}
      id={id}
      skipLinkTargetId={resolvedSkipLinkTargetId}
      skipLinkLabel={skipLinkLabel}
    >
      {docsRootId ? (
        <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId={docsRootId} />
      ) : null}
      {beforeNavigation}
      {navigation}
      {afterNavigation}
      <KangurPageContainer {...resolvedContainerProps}>{children}</KangurPageContainer>
    </KangurPageShell>
  );
}
