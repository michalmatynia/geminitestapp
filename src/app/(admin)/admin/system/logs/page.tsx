import { Suspense } from "react";
import { SystemLogsPage } from "@/features/observability";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SystemLogsPage />
    </Suspense>
  );
}
