import { KangurAliasAppLayout } from '@/features/kangur/server';

import type { ReactNode } from 'react';

export default function Layout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <KangurAliasAppLayout>{children}</KangurAliasAppLayout>;
}
