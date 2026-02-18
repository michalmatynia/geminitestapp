'use client';

import { ActivityIcon, ExternalLinkIcon, ImageIcon, UploadCloudIcon } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { FileUploadEventsPanel } from '@/features/files/components/FileUploadEventsPanel';
import ProductListingJobsPanel from '@/features/jobs/components/ProductListingJobsPanel';
import { Badge, Button, ListPanel, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

import { ImageStudioRunsQueuePanel } from '../components/ImageStudioRunsQueuePanel';
import { JobQueuePanel } from '../components/job-queue-panel';

type QueueTab = 'paths' | 'paths-external' | 'file-uploads' | 'image-studio';

const QUEUE_TABS: Array<{
  id: QueueTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'paths', label: 'Node Runs', icon: ActivityIcon },
  { id: 'paths-external', label: 'External Runs', icon: ExternalLinkIcon },
  { id: 'file-uploads', label: 'File Uploads', icon: UploadCloudIcon },
  { id: 'image-studio', label: 'Image Studio', icon: ImageIcon },
];

const toQueueTab = (value: string): QueueTab => {
  if (value === 'paths-external') return 'paths-external';
  if (value === 'file-uploads') return 'file-uploads';
  if (value === 'image-studio') return 'image-studio';
  return 'paths';
};

export function AdminAiPathsQueuePage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get('tab') ?? 'paths';
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
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className='mx-auto w-full max-w-none pb-10'>
      <Tabs
        value={activeTab}
        onValueChange={(next: string): void => setActiveTab(toQueueTab(next))}
        className='space-y-6'
      >
        <ListPanel
          header={
            <div className='space-y-3'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <h1 className='text-3xl font-bold tracking-tight text-white'>Job Queue</h1>
                  <nav aria-label='Breadcrumb' className='flex flex-wrap items-center gap-1 text-xs text-gray-400'>
                    <Link href='/admin' className='transition-colors hover:text-gray-200'>
                      Admin
                    </Link>
                    <span>/</span>
                    <Link href='/admin/ai-paths/queue' className='transition-colors hover:text-gray-200'>
                      AI Paths
                    </Link>
                    <span>/</span>
                    <span className='text-gray-300'>{activeTabMeta.label}</span>
                  </nav>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='processing' className='gap-1.5'>
                    <ActiveTabIcon className='size-3.5' />
                    {activeTabMeta.label}
                  </Badge>
                  <Badge variant='outline' className='border-white/10 text-gray-300'>
                    {QUEUE_TABS.length} views
                  </Badge>
                </div>
              </div>
            </div>
          }
          filters={
            <TabsList className='grid h-auto w-full grid-cols-2 gap-2 border border-border/60 bg-card/30 p-2 lg:grid-cols-4'>
              {QUEUE_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.id} value={tab.id} className='h-11 justify-start gap-2 px-3 text-left'>
                    <Icon className='size-3.5' />
                    <span className='text-xs font-semibold uppercase tracking-wide'>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          }
          actions={
            activeTab === 'paths-external' ? (
              <div className='flex flex-wrap items-center gap-2'>
                <Button size='xs' variant='outline' onClick={() => scrollToSection('export-jobs')}>
                  Jump to Export Jobs
                </Button>
                <Button size='xs' variant='outline' onClick={() => scrollToSection('image-studio-jobs')}>
                  Jump to Image Studio Jobs
                </Button>
              </div>
            ) : null
          }
        >
          <TabsContent value='paths' className='space-y-4'>
            {activeTab === 'paths' ? <JobQueuePanel sourceFilter='ai_paths_ui' isActive /> : null}
          </TabsContent>

          <TabsContent value='paths-external' className='space-y-4'>
            {activeTab === 'paths-external' ? (
              <JobQueuePanel sourceFilter='ai_paths_ui' sourceMode='exclude' isActive />
            ) : null}
            <div id='export-jobs'>
              <ProductListingJobsPanel showBackToProducts={false} />
            </div>
            {activeTab === 'paths-external' ? (
              <div id='image-studio-jobs'>
                <ImageStudioRunsQueuePanel />
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value='file-uploads' className='space-y-4'>
            <FileUploadEventsPanel />
          </TabsContent>

          <TabsContent value='image-studio' className='space-y-4'>
            {activeTab === 'image-studio' ? <ImageStudioRunsQueuePanel /> : null}
          </TabsContent>
        </ListPanel>
      </Tabs>
    </div>
  );
}
