"use client";

import { SectionHeader, SectionPanel, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { JobQueuePanel } from "../components/job-queue-panel";
import ProductAiJobsPanel from "@/features/jobs/components/ProductAiJobsPanel";

export function AdminAiPathsQueuePage(): React.JSX.Element {
  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="AI Queue"
          description="Monitor AI Paths runs and AI Jobs in one place."
        />
        <div className="mt-6">
          <Tabs defaultValue="paths" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paths">AI Paths Runs</TabsTrigger>
              <TabsTrigger value="jobs">AI Jobs</TabsTrigger>
            </TabsList>

            <TabsContent value="paths" className="space-y-4">
              <JobQueuePanel />
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
