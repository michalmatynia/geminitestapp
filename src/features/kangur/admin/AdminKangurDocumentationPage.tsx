'use client';

import Link from 'next/link';
import React from 'react';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurDocumentationCenter } from '@/features/kangur/admin/components/KangurDocumentationCenter';
import { KangurDocumentationTooltipSettingsPanel } from '@/features/kangur/admin/components/KangurDocumentationTooltipSettingsPanel';
import { DocumentationStatusPanel } from './components/DocumentationStatusPanel';
import {
  KANGUR_HELP_SETTINGS_KEY,
  areKangurDocsTooltipsEnabled,
  parseKangurHelpSettings,
} from '@/features/kangur/docs/help-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { Button, SkipToContentLink } from '@/features/kangur/shared/ui';
import { KANGUR_GRID_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';

const DOCUMENTATION_CONTENT_ID = 'kangur-documentation-content';
const DOCUMENTATION_WORKSPACE_TITLE_ID = 'kangur-documentation-workspace-title';
const DOCUMENTATION_WORKSPACE_DESCRIPTION_ID = 'kangur-documentation-workspace-description';

export function AdminKangurDocumentationPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const helpSettings = parseKangurHelpSettings(settingsStore.get(KANGUR_HELP_SETTINGS_KEY));
  const adminDocsEnabled = areKangurDocsTooltipsEnabled(helpSettings, 'admin');
  const tooltipsEnabled = helpSettings.docsTooltips.enabled;

  return (
    <>
      <SkipToContentLink targetId={DOCUMENTATION_CONTENT_ID}>
        Skip to documentation content
      </SkipToContentLink>
      <KangurAdminContentShell
        title='Kangur Documentation'
        description='Browse the central Kangur guide library and the tooltip catalog used across learner, parent, and admin surfaces.'
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Kangur', href: '/admin/kangur' },
          { label: 'Documentation' },
        ]}
        headerActions={
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/kangur/settings'>Open settings</Link>
          </Button>
        }
      >
        <main
          id={DOCUMENTATION_CONTENT_ID}
          tabIndex={-1}
          aria-labelledby={DOCUMENTATION_WORKSPACE_TITLE_ID}
          aria-describedby={DOCUMENTATION_WORKSPACE_DESCRIPTION_ID}
          className='space-y-8 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
        >
          <KangurDocumentationCenter />
          <div
            className={`${KANGUR_GRID_ROOMY_CLASSNAME} xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]`}
          >
            <div className='space-y-6'>
              <KangurDocumentationTooltipSettingsPanel />
            </div>
            <DocumentationStatusPanel 
                adminDocsEnabled={adminDocsEnabled}
                tooltipsEnabled={tooltipsEnabled}
                titleId={DOCUMENTATION_WORKSPACE_TITLE_ID}
                descriptionId={DOCUMENTATION_WORKSPACE_DESCRIPTION_ID}
            />
          </div>
        </main>
      </KangurAdminContentShell>
    </>
  );
}

export default AdminKangurDocumentationPage;
