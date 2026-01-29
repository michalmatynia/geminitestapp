import { Suspense } from "react";
import { DatabasePreviewPage } from "@/features/database";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <DatabasePreviewPage />
    </Suspense>
  );
}
