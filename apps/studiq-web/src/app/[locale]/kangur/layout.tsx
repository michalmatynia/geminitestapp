import SharedKangurLayout from '../../kangur/layout';

import type { ReactNode } from 'react';

export default function LocalizedKangurLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <SharedKangurLayout>{children}</SharedKangurLayout>;
}
