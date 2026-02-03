import { JSX, Suspense } from "react";

import { ConnectionsPage } from "@/features/integrations";

export const dynamic = "force-dynamic";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <ConnectionsPage />
    </Suspense>
  );
}
