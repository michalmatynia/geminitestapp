'use client';

import { SectionHeader, SectionPanel, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';

import { JobQueuePanel } from '../components/job-queue-panel';

export function AdminAiPathsQueuePage(): React.JSX.Element {
  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Job Queue"
          description="Monitor node-system runs and external runs."
        />
        <div className="mt-6">
          <Tabs defaultValue="paths" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paths">Node Runs</TabsTrigger>
              <TabsTrigger value="paths-external">External Runs</TabsTrigger>
            </TabsList>

            <TabsContent value="paths" className="space-y-4">
              <JobQueuePanel sourceFilter="ai_paths_ui" />
            </TabsContent>

            <TabsContent value="paths-external" className="space-y-4">
              <JobQueuePanel sourceFilter="ai_paths_ui" sourceMode="exclude" />
            </TabsContent>

          </Tabs>
        </div>
      </SectionPanel>
    </div>
  );
}
