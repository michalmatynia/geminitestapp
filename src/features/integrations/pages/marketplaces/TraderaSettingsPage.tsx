'use client';

import React from 'react';

import { SectionHeader } from '@/shared/ui';

export default function TraderaSettingsPage(): React.JSX.Element {
  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title='Tradera Settings'
        description='Manage Tradera integration settings, sync rules, and credentials.'
        className='mb-6'
      />
      <div className='rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground'>
        Settings panel coming soon.
      </div>
    </div>
  );
}
