import React from "react";
import { ProductAiJobsPanelSuspense } from "@/features/jobs";

export function AdminAiPathsJobsPage(): React.JSX.Element {
  return (
    <ProductAiJobsPanelSuspense
      title="Jobs"
      description="Monitor AI, import, and export jobs."
      showTabs
    />
  );
}
