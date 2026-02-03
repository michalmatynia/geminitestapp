import { JSX, Suspense } from "react";
import { PlaywrightPersonasPage } from "@/features/playwright";

export const dynamic = "force-dynamic";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <PlaywrightPersonasPage />
    </Suspense>
  );
}
