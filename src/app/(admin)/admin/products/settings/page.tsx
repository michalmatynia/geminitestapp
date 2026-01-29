import { ProductSettingsPage } from "@/features/products";
import type { JSX } from "react";

export default function Page(): JSX.Element {
  return (
    <div className="container mx-auto py-10">
      <ProductSettingsPage />
    </div>
  );
}
