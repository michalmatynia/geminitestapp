import { ProductEditPage } from "@/features/products/server";
import type { JSX } from "react";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  return <ProductEditPage params={Promise.resolve(resolvedParams)} />;
}
