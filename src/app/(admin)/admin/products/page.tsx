import { Suspense } from "react";
import { AdminProductsPage } from "@/features/products";
import type { JSX } from "react";

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <AdminProductsPage />
    </Suspense>
  );
}