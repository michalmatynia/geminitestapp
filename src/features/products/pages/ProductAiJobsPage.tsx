import { ProductAiJobsPanelSuspense } from "@/features/products/components/jobs/ProductAiJobsPanel";

export function ProductAiJobsPage() {
  return (
    <ProductAiJobsPanelSuspense
      title="Product Jobs"
      description="Monitor AI, import, and export jobs for your products."
      showTabs
    />
  );
}
