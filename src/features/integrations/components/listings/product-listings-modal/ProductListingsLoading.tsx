import React from 'react';

import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

export function ProductListingsLoading(): React.JSX.Element {
  return <LoadingState message='Loading listings...' className='py-8' />;
}
