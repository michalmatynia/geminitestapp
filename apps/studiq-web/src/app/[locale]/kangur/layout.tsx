import React, { type ReactNode } from 'react';
import SharedKangurLayout from '../../kangur/layout';

export default function LocalizedKangurLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <SharedKangurLayout>{children}</SharedKangurLayout>;
}
