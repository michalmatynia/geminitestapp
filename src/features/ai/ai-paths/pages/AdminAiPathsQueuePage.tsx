'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { FileUploadEventsPanel } from '@/features/files/components/FileUploadEventsPanel';
import ProductListingJobsPanel from '@/features/jobs/components/ProductListingJobsPanel';
import { SectionHeader, SectionPanel, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

import { JobQueuePanel } from '../components/job-queue-panel';

export function AdminAiPathsQueuePage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get('tab') ?? 'paths';
  const defaultTab =
    requestedTab === 'paths-external'
      ? 'paths-external'
      : requestedTab === 'file-uploads'
        ? 'file-uploads'
        : 'paths';
  const [activeTab, setActiveTab] = useState<'paths' | 'paths-external' | 'file-uploads'>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Job Queue"
          description="Monitor node-system runs, external runs, export jobs, and file uploads."
        />
        <div className="mt-6">
          <Tabs
            value={activeTab}
            onValueChange={(next: string): void =>
              setActiveTab(
                next === 'paths-external'
                  ? 'paths-external'
                  : next === 'file-uploads'
                    ? 'file-uploads'
                    : 'paths'
              )
            }
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="paths">Node Runs</TabsTrigger>
              <TabsTrigger value="paths-external">External Runs</TabsTrigger>
              <TabsTrigger value="file-uploads">File Uploads</TabsTrigger>
            </TabsList>

            <TabsContent value="paths" className="space-y-4">
              <JobQueuePanel sourceFilter="ai_paths_ui" />
            </TabsContent>

            <TabsContent value="paths-external" className="space-y-4">
              <JobQueuePanel sourceFilter="ai_paths_ui" sourceMode="exclude" />
              <div id="export-jobs">
                <ProductListingJobsPanel showBackToProducts={false} />
              </div>
            </TabsContent>

            <TabsContent value="file-uploads" className="space-y-4">
              <FileUploadEventsPanel />
            </TabsContent>

          </Tabs>
        </div>
      </SectionPanel>
    </div>
  );
}
