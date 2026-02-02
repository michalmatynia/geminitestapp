"use client";

import { SectionHeader, SectionPanel } from "@/shared/ui";
import { JobQueuePanel } from "../components/job-queue-panel";

export function AdminAiPathsQueuePage(): React.JSX.Element {
  return (
    <div className="container mx-auto py-10">
      <SectionPanel className="p-6">
        <SectionHeader
          title="AI Paths Job Queue"
          description="Monitor queued and running AI Path runs."
        />
        <div className="mt-6">
          <JobQueuePanel />
        </div>
      </SectionPanel>
    </div>
  );
}

