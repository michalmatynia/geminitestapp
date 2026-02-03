import { JSX, Suspense } from "react";

import { SystemLogsPage } from "@/features/observability";

export const dynamic = "force-dynamic";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <SystemLogsPage />
    </Suspense>
  );
}
