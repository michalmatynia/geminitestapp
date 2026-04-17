import KangurAppLayout from '../../../kangur/(app)/layout';

import type { ReactNode } from 'react';

export default function LocalizedKangurAppLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <KangurAppLayout>{children}</KangurAppLayout>;
}
