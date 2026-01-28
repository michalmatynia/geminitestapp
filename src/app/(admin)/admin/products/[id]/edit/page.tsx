import { ProductEditPage } from "@/features/products/server";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <ProductEditPage params={Promise.resolve(resolvedParams)} />;
}
