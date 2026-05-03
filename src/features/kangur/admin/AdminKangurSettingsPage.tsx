'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Button, Alert } from '@/features/kangur/shared/ui';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { useKangurSettingsController } from './settings/useKangurSettingsController';
import { StorefrontThemePanel } from './settings/StorefrontThemePanel';
import { LaunchRouteSettingsPanel } from './settings/LaunchRouteSettingsPanel';
import { AiTutorSettingsPanel } from './settings/AiTutorSettingsPanel';
import { ParentVerificationPanel } from './settings/ParentVerificationPanel';
import { OperationsPanel } from './settings/OperationsPanel';
import { renderKangurNarratorSettingsPanel } from './components/KangurNarratorSettingsPanel';
import { KANGUR_GRID_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';

const SETTINGS_SECTION_CLASS_NAME = 'border-border/60 bg-card/35 shadow-sm';
const KANGUR_LAUNCH_ROUTE_OPTIONS = [
  { value: 'web_mobile_view', label: 'Mobile web view', description: 'Opens the standard Kangur page in the browser.' },
  { value: 'dedicated_app', label: 'Dedicated app', description: 'Offers a native Kangur app handoff.' },
];

export default function AdminKangurSettingsPage() {
  const ctrl = useKangurSettingsController();

  return (
    <KangurAdminContentShell
      title='Kangur Settings'
      headerActions={
        <Button onClick={ctrl.handleSave} disabled={!ctrl.isDirty || ctrl.isSaving}>
          {ctrl.isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      }
    >
      <div className='space-y-8'>
        <div className={`${KANGUR_GRID_ROOMY_CLASSNAME} xl:grid-cols-2`}>
          <StorefrontThemePanel className={SETTINGS_SECTION_CLASS_NAME} />
          <LaunchRouteSettingsPanel
            launchRoute={ctrl.launchRoute}
            setLaunchRoute={ctrl.setLaunchRoute}
            options={KANGUR_LAUNCH_ROUTE_OPTIONS}
            className={SETTINGS_SECTION_CLASS_NAME}
          />
        </div>

        {renderKangurNarratorSettingsPanel({
          engine: ctrl.engine,
          voice: ctrl.voice,
          setEngine: ctrl.setEngine,
          setVoice: ctrl.setVoice,
          onSave: ctrl.handleSave,
          className: SETTINGS_SECTION_CLASS_NAME,
        })}

        <AiTutorSettingsPanel controller={ctrl} className={SETTINGS_SECTION_CLASS_NAME} />
        <ParentVerificationPanel controller={ctrl} className={SETTINGS_SECTION_CLASS_NAME} />
        <OperationsPanel className={SETTINGS_SECTION_CLASS_NAME} />
      </div>
    </KangurAdminContentShell>
  );
}
