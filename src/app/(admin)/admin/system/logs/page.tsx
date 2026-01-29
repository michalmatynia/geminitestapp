import { JSX, Suspense } from "react";

import { SystemLogsPage } from "@/features/observability";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <SystemLogsPage />
    </Suspense>
  );
}
