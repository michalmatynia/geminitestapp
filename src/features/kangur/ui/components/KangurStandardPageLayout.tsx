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
  return (
    <KangurPageShell tone={tone} id={id} skipLinkTargetId={skipLinkTargetId} skipLinkLabel={skipLinkLabel}>
      {docsRootId ? (
        <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId={docsRootId} />
      ) : null}
      {beforeNavigation}
      {navigation}
      {afterNavigation}
      <KangurPageContainer {...containerProps}>{children}</KangurPageContainer>
    </KangurPageShell>
  );
}
