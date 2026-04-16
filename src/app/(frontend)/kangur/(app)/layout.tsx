/*
 * StudiQ alias app layout
 *
 * Purpose: Wrap alias-app routes in the Kangur alias app layout which provides
 * consistent skip links, landmarks and page-level accessibility glue.
 *
 * Accessibility notes:
 * - The alias layout should expose a main landmark and a skip-to-content
 *   target id that downstream shells can use.
 */
import { KangurAliasAppLayout } from '@/features/kangur/server';

import type { ReactNode } from 'react';

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <KangurAliasAppLayout>{children}</KangurAliasAppLayout>;
}
