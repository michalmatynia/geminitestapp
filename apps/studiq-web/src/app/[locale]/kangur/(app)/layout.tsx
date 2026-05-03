import KangurAppLayout from '../../../kangur/(app)/layout';

import type { ReactNode } from 'react';

export default async function LocalizedKangurAppLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  return KangurAppLayout({ children });
}
