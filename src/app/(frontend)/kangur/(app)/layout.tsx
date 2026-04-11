import { KangurAliasAppLayout } from '@/features/kangur/server';

import type { ReactNode } from 'react';

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <KangurAliasAppLayout>{children}</KangurAliasAppLayout>;
}
