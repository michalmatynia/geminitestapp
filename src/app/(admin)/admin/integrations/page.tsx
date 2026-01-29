import { Suspense } from "react";
import { ConnectionsPage } from "@/features/integrations";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <ConnectionsPage />
    </Suspense>
  );
}
