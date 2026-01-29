import { Suspense } from "react";
import { SystemLogsPage } from "@/features/observability";
import type { JSX } from "react";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <SystemLogsPage />
    </Suspense>
  );
}
