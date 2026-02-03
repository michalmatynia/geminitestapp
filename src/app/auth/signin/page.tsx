import { JSX, Suspense } from "react";

import { SignInPage } from "@/features/auth";

export const dynamic = "force-dynamic";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <SignInPage />
    </Suspense>
  );
}
