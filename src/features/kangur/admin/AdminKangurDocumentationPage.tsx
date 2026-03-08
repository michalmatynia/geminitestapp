'use client';

import Link from 'next/link';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurDocumentationCenter } from '@/features/kangur/admin/components/KangurDocumentationCenter';
import { Button, SkipToContentLink } from '@/shared/ui';

const DOCUMENTATION_CONTENT_ID = 'kangur-documentation-content';
const DOCUMENTATION_WORKSPACE_TITLE_ID = 'kangur-documentation-workspace-title';
const DOCUMENTATION_WORKSPACE_DESCRIPTION_ID = 'kangur-documentation-workspace-description';

export function AdminKangurDocumentationPage(): React.JSX.Element {
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
          className='space-y-6 outline-none'
        >
          <section
            aria-labelledby={DOCUMENTATION_WORKSPACE_TITLE_ID}
            aria-describedby={DOCUMENTATION_WORKSPACE_DESCRIPTION_ID}
            className='rounded-2xl border border-border/60 bg-card/55 px-5 py-5 text-sm text-muted-foreground shadow-sm'
          >
            <h2
              id={DOCUMENTATION_WORKSPACE_TITLE_ID}
              className='text-base font-semibold text-foreground'
            >
              Documentation workspace
            </h2>
            <p id={DOCUMENTATION_WORKSPACE_DESCRIPTION_ID} className='mt-1 max-w-3xl'>
              Use this page to review the source guides behind Kangur tooltip content without
              mixing the documentation browser into the settings form.
            </p>
          </section>
          <KangurDocumentationCenter />
        </main>
      </KangurAdminContentShell>
    </>
  );
}
