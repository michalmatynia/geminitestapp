import { KangurAliasAppLayout } from '@/features/kangur/server';

import type { ReactNode } from 'react';

export default async function Layout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  return await KangurAliasAppLayout({ children });
}
