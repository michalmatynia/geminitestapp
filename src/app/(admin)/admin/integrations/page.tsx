import { Suspense } from "react";
import { ConnectionsPage } from "@/features/integrations";
import type { JSX } from "react";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <ConnectionsPage />
    </Suspense>
  );
}
