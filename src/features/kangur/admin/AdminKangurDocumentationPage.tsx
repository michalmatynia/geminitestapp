'use client';

import Link from 'next/link';

import { KangurDocumentationCenter } from '@/features/kangur/admin/components/KangurDocumentationCenter';
import { PageLayout, SkipToContentLink } from '@/shared/ui';

const DOCUMENTATION_CONTENT_ID = 'kangur-documentation-content';
const DOCUMENTATION_WORKSPACE_TITLE_ID = 'kangur-documentation-workspace-title';
const DOCUMENTATION_WORKSPACE_DESCRIPTION_ID = 'kangur-documentation-workspace-description';

export function AdminKangurDocumentationPage(): React.JSX.Element {
  return (
    <PageLayout
      title='Kangur Documentation'
      description='Browse the central Kangur guide library and the tooltip catalog used across learner, parent, and admin surfaces.'
      eyebrow={
        <Link href='/admin/kangur/settings' className='text-blue-300 hover:text-blue-200'>
          ← Back to Kangur settings
        </Link>
      }
      containerClassName='container mx-auto py-10'
    >
      <SkipToContentLink targetId={DOCUMENTATION_CONTENT_ID}>
        Skip to documentation content
      </SkipToContentLink>
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
          className='rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground'
        >
          <h2
            id={DOCUMENTATION_WORKSPACE_TITLE_ID}
            className='text-base font-semibold text-foreground'
          >
            Documentation workspace
          </h2>
          <p id={DOCUMENTATION_WORKSPACE_DESCRIPTION_ID} className='mt-1'>
            Use this page to review the source guides behind Kangur tooltip content without mixing
            the documentation browser into the settings form.
          </p>
        </section>
        <KangurDocumentationCenter />
      </main>
    </PageLayout>
  );
}
