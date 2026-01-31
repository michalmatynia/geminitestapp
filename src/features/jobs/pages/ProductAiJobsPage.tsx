import React from "react";
import { ProductAiJobsPanelSuspense } from "@/features/jobs/components/ProductAiJobsPanel";

export function ProductAiJobsPage(): React.JSX.Element {
  return (
    <ProductAiJobsPanelSuspense
      title="Product Jobs"
      description="Monitor AI, import, and export jobs for your products."
      showTabs
    />
  );
}
