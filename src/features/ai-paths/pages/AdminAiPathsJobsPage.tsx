import { ProductAiJobsPanelSuspense } from "@/features/jobs/components/ProductAiJobsPanel";

export function AdminAiPathsJobsPage() {
  return (
    <ProductAiJobsPanelSuspense
      title="Jobs"
      description="Monitor AI, import, and export jobs."
      showTabs
    />
  );
}
