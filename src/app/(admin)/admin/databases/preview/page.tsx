import { Suspense } from "react";
import { DatabasePreviewPage } from "@/features/database";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DatabasePreviewPage />
    </Suspense>
  );
}
