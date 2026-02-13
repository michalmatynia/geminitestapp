'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { FileUploadEventsPanel } from '@/features/files/components/FileUploadEventsPanel';
import ProductListingJobsPanel from '@/features/jobs/components/ProductListingJobsPanel';
import { SectionHeader,  Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

import { ImageStudioRunsQueuePanel } from '../components/ImageStudioRunsQueuePanel';
import { JobQueuePanel } from '../components/job-queue-panel';

export function AdminAiPathsQueuePage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get('tab') ?? 'paths';
  const defaultTab =
    requestedTab === 'paths-external'
      ? 'paths-external'
      : requestedTab === 'file-uploads'
        ? 'file-uploads'
        : requestedTab === 'image-studio'
          ? 'image-studio'
          : 'paths';
  const [activeTab, setActiveTab] = useState<'paths' | 'paths-external' | 'file-uploads' | 'image-studio'>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <div className='rounded-lg border border-border/60 bg-card/40 p-6'>
        <SectionHeader
          title='Job Queue'
          description='Monitor node-system runs, external runs, image studio runs, export jobs, and file uploads.'
        />
        <div className='mt-6'>
          <Tabs
            value={activeTab}
            onValueChange={(next: string): void =>
              setActiveTab(
                next === 'paths-external'
                  ? 'paths-external'
                  : next === 'file-uploads'
                    ? 'file-uploads'
                    : next === 'image-studio'
                      ? 'image-studio'
                      : 'paths'
              )
            }
            className='space-y-6'
          >
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='paths'>Node Runs</TabsTrigger>
              <TabsTrigger value='paths-external'>External Runs</TabsTrigger>
              <TabsTrigger value='file-uploads'>File Uploads</TabsTrigger>
              <TabsTrigger value='image-studio'>Image Studio</TabsTrigger>
            </TabsList>

            <TabsContent value='paths' className='space-y-4'>
              <JobQueuePanel sourceFilter='ai_paths_ui' />
            </TabsContent>

            <TabsContent value='paths-external' className='space-y-4'>
              <JobQueuePanel sourceFilter='ai_paths_ui' sourceMode='exclude' />
              <div id='export-jobs'>
                <ProductListingJobsPanel showBackToProducts={false} />
              </div>
            </TabsContent>

            <TabsContent value='file-uploads' className='space-y-4'>
              <FileUploadEventsPanel />
            </TabsContent>

            <TabsContent value='image-studio' className='space-y-4'>
              <ImageStudioRunsQueuePanel />
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}
