'use client';

import Link from 'next/link';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurAiTutorContentSettingsPanel } from '@/features/kangur/admin/components/KangurAiTutorContentSettingsPanel';
import { Badge, Button, Card, SkipToContentLink } from '@/features/kangur/shared/ui';

const AI_TUTOR_CONTENT_ID = 'kangur-ai-tutor-content';
const AI_TUTOR_CONTENT_TITLE_ID = 'kangur-ai-tutor-content-title';
const AI_TUTOR_CONTENT_DESCRIPTION_ID = 'kangur-ai-tutor-content-description';

export function AdminKangurAiTutorContentPage(): React.JSX.Element {
  return (
    <>
      <SkipToContentLink targetId={AI_TUTOR_CONTENT_ID}>
        Skip to AI Tutor content editor
      </SkipToContentLink>
      <KangurAdminContentShell
        title='Kangur AI Tutor Content'
        description='Edit the Mongo-backed tutor copy pack used by onboarding, helper prompts, labels, narrator controls, and tutor explanations.'
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Kangur', href: '/admin/kangur' },
          { label: 'Settings', href: '/admin/kangur/settings' },
          { label: 'AI Tutor Content' },
        ]}
        headerActions={
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/kangur/settings'>Back to settings</Link>
          </Button>
        }
      >
        <main
          id={AI_TUTOR_CONTENT_ID}
          tabIndex={-1}
          aria-labelledby={AI_TUTOR_CONTENT_TITLE_ID}
          aria-describedby={AI_TUTOR_CONTENT_DESCRIPTION_ID}
          className='space-y-8 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
        >
          <div className='grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]'>
            <div className='space-y-6'>
              <KangurAiTutorContentSettingsPanel />
            </div>
            <div className='space-y-4 xl:sticky xl:top-24 xl:self-start'>
              <Card
                aria-labelledby={AI_TUTOR_CONTENT_TITLE_ID}
                aria-describedby={AI_TUTOR_CONTENT_DESCRIPTION_ID}
                variant='subtle'
                padding='md'
                className='rounded-2xl border-border/60 bg-card/40 text-sm text-muted-foreground shadow-sm'
              >
                <div className='flex items-center gap-2'>
                  <h2
                    id={AI_TUTOR_CONTENT_TITLE_ID}
                    className='text-base font-semibold text-foreground'
                  >
                    AI Tutor content workspace
                  </h2>
                  <Badge variant='outline'>Dedicated editor</Badge>
                </div>
                <p
                  id={AI_TUTOR_CONTENT_DESCRIPTION_ID}
                  className='mt-2 max-w-3xl text-sm font-normal text-muted-foreground'
                >
                  Use this page to edit the AI Tutor content pack without mixing it into the rest of
                  the Kangur settings form.
                </p>
              </Card>

              <Card
                variant='subtle'
                padding='md'
                className='rounded-2xl border-border/60 bg-card/40 text-sm text-muted-foreground shadow-sm'
              >
                <div className='text-sm font-semibold text-foreground'>Quick links</div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Jump back to other Kangur admin surfaces that influence tutor content output.
                </p>
                <div className='mt-3 flex flex-col gap-2'>
                  <Button asChild variant='outline' size='sm' className='justify-between'>
                    <Link href='/admin/kangur/settings'>Kangur settings</Link>
                  </Button>
                  <Button asChild variant='outline' size='sm' className='justify-between'>
                    <Link href='/admin/kangur/documentation'>Documentation</Link>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </KangurAdminContentShell>
    </>
  );
}
