'use client';

import React from 'react';
import { AdminImageStudioSettingsView } from '../components/AdminImageStudioSettingsView';
import { ImageStudioSettingsProvider } from '../context/ImageStudioSettingsContext';

export function AdminImageStudioSettingsPage(
  props: { embedded?: boolean | undefined; onSaved?: (() => void) | undefined } = {}
): React.JSX.Element {
  const { embedded = false, onSaved } = props;

  return (
    <ImageStudioSettingsProvider onSaved={onSaved}>
      <AdminImageStudioSettingsView embedded={embedded} />
    </ImageStudioSettingsProvider>
  );
}
