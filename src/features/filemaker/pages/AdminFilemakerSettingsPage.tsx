'use client';

import type React from 'react';

import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

import {
  FilemakerJobApplicationSettingsForm,
  FilemakerSettingsShell,
} from './AdminFilemakerSettingsPage.parts';
import { useAdminFilemakerSettingsPageState } from './AdminFilemakerSettingsPage.state';

export function AdminFilemakerSettingsPage(): React.JSX.Element {
  const pageState = useAdminFilemakerSettingsPageState();

  if (!pageState.hasLoaded) {
    return (
      <FilemakerSettingsShell>
        <LoadingState message='Loading Filemaker settings...' />
      </FilemakerSettingsShell>
    );
  }

  return (
    <FilemakerSettingsShell>
      <FilemakerJobApplicationSettingsForm {...pageState} />
    </FilemakerSettingsShell>
  );
}
