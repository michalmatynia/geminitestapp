import { Suspense } from "react";
import { DatabasePreviewPage } from "@/features/database";
import type { JSX } from "react";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <DatabasePreviewPage />
    </Suspense>
  );
}
