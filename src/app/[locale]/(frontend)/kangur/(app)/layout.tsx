import SharedKangurAppLayout from '@/app/(frontend)/kangur/(app)/layout';

import type { ReactNode } from 'react';

export default function LocalizedKangurAppLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <SharedKangurAppLayout>{children}</SharedKangurAppLayout>;
}
