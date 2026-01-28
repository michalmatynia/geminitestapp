import { Suspense } from "react";
import { AdminProductsPage } from "@/features/products";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminProductsPage />
    </Suspense>
  );
}