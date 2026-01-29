import { Suspense } from "react";
import { SignInPage } from "@/features/auth";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <SignInPage />
    </Suspense>
  );
}
