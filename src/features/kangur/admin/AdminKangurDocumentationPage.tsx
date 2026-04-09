'use client';

import Link from 'next/link';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurAdminStatusCard } from '@/features/kangur/admin/components/KangurAdminStatusCard';
import { KangurDocumentationCenter } from '@/features/kangur/admin/components/KangurDocumentationCenter';
import { KangurDocumentationTooltipSettingsPanel } from '@/features/kangur/admin/components/KangurDocumentationTooltipSettingsPanel';
import {
  KANGUR_HELP_SETTINGS_KEY,
  areKangurDocsTooltipsEnabled,
  parseKangurHelpSettings,
} from '@/features/kangur/docs/help-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { Badge, Button, Card, SkipToContentLink } from '@/features/kangur/shared/ui';
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
          <div
            className={`${KANGUR_GRID_ROOMY_CLASSNAME} xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]`}
          >
            <div className='space-y-6'>
              <KangurDocumentationTooltipSettingsPanel />
            </div>
            <div className='space-y-4 xl:sticky xl:top-24 xl:self-start'>
              <KangurAdminStatusCard
                title='Status'
                sticky={false}
                statusBadge={
                  <Badge variant={adminDocsEnabled ? 'secondary' : 'outline'}>
                    {adminDocsEnabled ? 'Tooltips active' : 'Tooltips off'}
                  </Badge>
                }
                items={[
                  {
                    label: 'Docs tooltips',
                    value: (
                      <Badge variant={tooltipsEnabled ? 'secondary' : 'outline'}>
                        {tooltipsEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    ),
                  },
                  {
                    label: 'Admin tooltips',
                    value: (
                      <Badge variant={adminDocsEnabled ? 'secondary' : 'outline'}>
                        {adminDocsEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    ),
                  },
                  {
                    label: 'Surface',
                    value: <Badge variant='outline'>Documentation</Badge>,
                  },
                ]}
              />
              <Card
                aria-labelledby={DOCUMENTATION_WORKSPACE_TITLE_ID}
                aria-describedby={DOCUMENTATION_WORKSPACE_DESCRIPTION_ID}
                variant='subtle'
                padding='md'
                className='rounded-2xl border-border/60 bg-card/40 text-sm text-muted-foreground shadow-sm'
              >
                <div className='flex items-center gap-2'>
                  <h2
                    id={DOCUMENTATION_WORKSPACE_TITLE_ID}
                    className='text-base font-semibold text-foreground'
                  >
                    Documentation workspace
                  </h2>
                  <Badge variant='outline'>Shared surface</Badge>
                </div>
                <p
                  id={DOCUMENTATION_WORKSPACE_DESCRIPTION_ID}
                  className='mt-2 max-w-3xl text-sm font-normal text-muted-foreground'
                >
                  Use this page to review the source guides behind Kangur tooltip content without
                  mixing the documentation browser into the settings form.
                </p>
              </Card>

              <Card
                variant='subtle'
                padding='md'
                className='rounded-2xl border-border/60 bg-card/40 text-sm text-muted-foreground shadow-sm'
              >
                <div className='text-sm font-semibold text-foreground'>Quick links</div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Jump back to the Kangur admin surfaces that shape documentation output.
                </p>
                <div className='mt-3 flex flex-col gap-2'>
                  <Button asChild variant='outline' size='sm' className='justify-between'>
                    <Link href='/admin/kangur/settings'>Kangur settings</Link>
                  </Button>
                  <Button asChild variant='outline' size='sm' className='justify-between'>
                    <Link href='/admin/kangur/content-manager'>Content manager</Link>
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          <KangurDocumentationCenter />
        </main>
      </KangurAdminContentShell>
    </>
  );
}
