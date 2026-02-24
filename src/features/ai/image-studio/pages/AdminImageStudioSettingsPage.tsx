'use client';

import React from 'react';
import { AdminImageStudioSettingsView } from '../components/AdminImageStudioSettingsView';
import { ImageStudioSettingsProvider } from '../context/ImageStudioSettingsContext';

export function AdminImageStudioSettingsPage(
  { embedded = false, onSaved }: { embedded?: boolean | undefined; onSaved?: (() => void) | undefined } = {}
): React.JSX.Element {
  return (
    <ImageStudioSettingsProvider onSaved={onSaved}>
      <AdminImageStudioSettingsView embedded={embedded} />
    </ImageStudioSettingsProvider>
  );
}
