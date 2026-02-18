'use client';

import React from 'react';

import { LoadingState } from '@/shared/ui';

export function ProductListingsLoading(): React.JSX.Element {
  return (
    <LoadingState message='Loading listings...' className='py-8' />
  );
}
