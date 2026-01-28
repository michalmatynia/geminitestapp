import { Suspense } from "react";
import { SignInPage } from "@/features/auth";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignInPage />
    </Suspense>
  );
}
