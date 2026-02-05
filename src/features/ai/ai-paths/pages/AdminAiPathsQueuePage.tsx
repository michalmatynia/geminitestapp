"use client";

import { SectionHeader, SectionPanel, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { JobQueuePanel } from "../components/job-queue-panel";
import { LocalRunsPanel } from "../components/local-runs-panel";
import ProductAiJobsPanel from "@/features/jobs/components/ProductAiJobsPanel";

export function AdminAiPathsQueuePage(): React.JSX.Element {
  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="Job Queue"
          description="Monitor AI Paths runs, AI Jobs, and local executions."
        />
        <div className="mt-6">
          <Tabs defaultValue="paths" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="paths">AI Paths Runs</TabsTrigger>
              <TabsTrigger value="paths-external">External Server Runs</TabsTrigger>
              <TabsTrigger value="local">Local Runs</TabsTrigger>
              <TabsTrigger value="local-external">External Local Runs</TabsTrigger>
              <TabsTrigger value="jobs">AI Jobs</TabsTrigger>
            </TabsList>

            <TabsContent value="paths" className="space-y-4">
              <JobQueuePanel sourceFilter="ai_paths_ui" />
            </TabsContent>

            <TabsContent value="paths-external" className="space-y-4">
              <JobQueuePanel sourceFilter="ai_paths_ui" sourceMode="exclude" />
            </TabsContent>

            <TabsContent value="local" className="space-y-4">
              <LocalRunsPanel sourceFilter="ai_paths_ui" />
            </TabsContent>

            <TabsContent value="local-external" className="space-y-4">
              <LocalRunsPanel sourceFilter="ai_paths_ui" sourceMode="exclude" />
            </TabsContent>

            <TabsContent value="jobs" className="space-y-4">
              <ProductAiJobsPanel embedded showTabs={false} />
            </TabsContent>
          </Tabs>
        </div>
      </SectionPanel>
    </div>
  );
}
