'use client';

import React, { useMemo } from 'react';

import { AppEmbedItem } from './AppEmbedItem';
import { APP_EMBED_OPTIONS } from '../lib/constants';

export function AppEmbedList(): React.ReactNode {
  const options = useMemo(() => APP_EMBED_OPTIONS, []);

  return (
    <div className='space-y-4'>
      {options.map((option) => (
        <AppEmbedItem key={option.id} option={option} />
      ))}
    </div>
  );
}
