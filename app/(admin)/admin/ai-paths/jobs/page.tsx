import { ProductAiJobsPanelSuspense } from "@/components/products/jobs/ProductAiJobsPanel";

export default function AiPathsJobsPage() {
  return (
    <ProductAiJobsPanelSuspense
      title="Jobs"
      description="Monitor AI, import, and export jobs."
      showTabs
    />
  );
}
