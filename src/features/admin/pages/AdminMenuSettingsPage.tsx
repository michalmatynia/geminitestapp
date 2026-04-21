'use client';

import React from 'react';
import { PanelHeader } from '@/shared/ui/templates.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import {
  AdminMenuSettingsProvider,
  useAdminMenuSettings,
} from '../context/AdminMenuSettingsContext';

import { FavoritesSection } from './menu-settings/FavoritesSection';
import { SectionColorsSection } from './menu-settings/SectionColorsSection';
import { MenuBuilderSection } from './menu-settings/MenuBuilderSection';

function AdminMenuSettingsInner(): React.JSX.Element {
  const { isSaving, handleSave, isDirty, isDefaultState, handleReset } = useAdminMenuSettings();

  return (
    <div className='mx-auto max-w-7xl p-6'>
      <PanelHeader
        title='Menu Settings'
        description='Configure admin navigation layout, favorites and color themes.'
        actions={[
          {
            key: 'reset',
            label: 'Restore Defaults',
            variant: 'outline',
            onClick: () => {
              handleReset();
            },
            disabled: isDefaultState,
          },
          {
            key: 'save',
            label: isSaving ? 'Saving...' : 'Save Settings',
            onClick: () => {
              void handleSave();
            },
            disabled: !isDirty || isSaving,
          },
        ]}
      />

      <div className={`${UI_GRID_ROOMY_CLASSNAME} mt-8 lg:grid-cols-2`}>
        <FavoritesSection />
        <SectionColorsSection />
      </div>

      <MenuBuilderSection />
    </div>
  );
}

export function AdminMenuSettingsPage(): React.JSX.Element {
  return (
    <AdminMenuSettingsProvider>
      <AdminMenuSettingsInner />
    </AdminMenuSettingsProvider>
  );
}
