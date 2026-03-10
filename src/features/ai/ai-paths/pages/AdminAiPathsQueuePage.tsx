'use client';

import { ActivityIcon, ExternalLinkIcon, ImageIcon, UploadCloudIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import ProductListingJobsPanel from '@/shared/lib/jobs/components/ProductListingJobsPanel';
import { Badge, Button, ListPanel, Breadcrumbs, Hint } from '@/shared/ui';
import { FileUploadEventsPanel } from '@/shared/ui/files';
import { getMotionSafeScrollBehavior } from '@/shared/utils';

import { ImageStudioRunsQueuePanel } from '../components/ImageStudioRunsQueuePanel';
import { JobQueuePanel } from '../components/job-queue-panel';

type QueueTab = 'paths-all' | 'paths' | 'paths-external' | 'file-uploads' | 'image-studio';

const QUEUE_TABS: Array<{
  id: QueueTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'paths-all', label: 'All Runs', icon: ActivityIcon },
  { id: 'paths', label: 'Node Runs', icon: ActivityIcon },
  { id: 'paths-external', label: 'External Runs', icon: ExternalLinkIcon },
  { id: 'file-uploads', label: 'File Uploads', icon: UploadCloudIcon },
  { id: 'image-studio', label: 'Image Studio', icon: ImageIcon },
];

const toQueueTab = (value: string): QueueTab => {
  if (value === 'paths-all' || value === 'all') return 'paths-all';
  if (value === 'paths-external') return 'paths-external';
  if (value === 'file-uploads') return 'file-uploads';
  if (value === 'image-studio') return 'image-studio';
  if (value === 'paths') return 'paths';
  return 'paths-all';
};

const TABS_ID_PREFIX = 'ai-paths-queue-tabs';
const getTriggerId = (tab: QueueTab): string => `${TABS_ID_PREFIX}-trigger-${tab}`;
const getContentId = (tab: QueueTab): string => `${TABS_ID_PREFIX}-content-${tab}`;

export function AdminAiPathsQueuePage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get('tab') ?? 'paths-all';
  const requestedQuery = searchParams?.get('query')?.trim() ?? '';
  const requestedRunId = searchParams?.get('runId')?.trim() ?? '';
  const defaultTab = toQueueTab(requestedTab);
  const [activeTab, setActiveTab] = useState<QueueTab>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const activeTabMeta = QUEUE_TABS.find((tab) => tab.id === activeTab) || QUEUE_TABS[0]!;
  const ActiveTabIcon = activeTabMeta.icon;

  const scrollToSection = (sectionId: string): void => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({
      behavior: getMotionSafeScrollBehavior('smooth'),
      block: 'start',
    });
  };

  return (
    <div className='mx-auto w-full max-w-none pb-10'>
      <ListPanel
        title='Job Queue'
        eyebrow={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'AI Paths', href: '/admin/ai-paths/queue' },
              { label: activeTabMeta.label },
            ]}
            className='mb-2'
          />
        }
        headerActions={
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='processing' className='gap-1.5'>
              <ActiveTabIcon className='size-3.5' />
              {activeTabMeta.label}
            </Badge>
            <Badge variant='outline' className='border-white/10 text-gray-300'>
              {QUEUE_TABS.length} views
            </Badge>
          </div>
        }
        filters={
          <div
            role='tablist'
            aria-label='Queue views'
            className='grid h-auto w-full grid-cols-2 gap-2 border border-border/60 bg-card/30 p-2 lg:grid-cols-5'
          >
            {QUEUE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type='button'
                  role='tab'
                  id={getTriggerId(tab.id)}
                  aria-controls={getContentId(tab.id)}
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex h-11 items-center justify-start gap-2 rounded-md px-3 text-left transition-colors ${
                    isActive
                      ? 'border border-white/20 bg-white/10 text-white'
                      : 'border border-transparent text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <Icon className='size-3.5' />
                  <Hint size='xs' uppercase className='font-semibold'>
                    {tab.label}
                  </Hint>
                </button>
              );
            })}
          </div>
        }
        actions={
          activeTab === 'paths-external' ? (
            <div className='flex flex-wrap items-center gap-2'>
              <Button size='xs' variant='outline' onClick={() => scrollToSection('export-jobs')}>
                Jump to Export Jobs
              </Button>
              <Button
                size='xs'
                variant='outline'
                onClick={() => scrollToSection('image-studio-jobs')}
              >
                Jump to Image Studio Jobs
              </Button>
            </div>
          ) : null
        }
      >
        {activeTab === 'paths-all' ? (
          <section
            role='tabpanel'
            id={getContentId('paths-all')}
            aria-labelledby={getTriggerId('paths-all')}
            className='space-y-4'
          >
            <JobQueuePanel
              visibility='global'
              initialSearchQuery={requestedQuery}
              initialExpandedRunId={requestedRunId}
              isActive
            />
          </section>
        ) : null}

        {activeTab === 'paths' ? (
          <section
            role='tabpanel'
            id={getContentId('paths')}
            aria-labelledby={getTriggerId('paths')}
            className='space-y-4'
          >
            <JobQueuePanel
              sourceFilter='ai_paths_ui'
              visibility='global'
              initialSearchQuery={requestedQuery}
              initialExpandedRunId={requestedRunId}
              isActive
            />
          </section>
        ) : null}

        {activeTab === 'paths-external' ? (
          <section
            role='tabpanel'
            id={getContentId('paths-external')}
            aria-labelledby={getTriggerId('paths-external')}
            className='space-y-4'
          >
            <JobQueuePanel
              sourceFilter='ai_paths_ui'
              sourceMode='exclude'
              visibility='global'
              initialSearchQuery={requestedQuery}
              initialExpandedRunId={requestedRunId}
              isActive
            />
            <div id='export-jobs'>
              <ProductListingJobsPanel showBackToProducts={false} />
            </div>
            <div id='image-studio-jobs'>
              <ImageStudioRunsQueuePanel />
            </div>
          </section>
        ) : null}

        {activeTab === 'file-uploads' ? (
          <section
            role='tabpanel'
            id={getContentId('file-uploads')}
            aria-labelledby={getTriggerId('file-uploads')}
            className='space-y-4'
          >
            <FileUploadEventsPanel />
          </section>
        ) : null}

        {activeTab === 'image-studio' ? (
          <section
            role='tabpanel'
            id={getContentId('image-studio')}
            aria-labelledby={getTriggerId('image-studio')}
            className='space-y-4'
          >
            <ImageStudioRunsQueuePanel />
          </section>
        ) : null}
      </ListPanel>
    </div>
  );
}
