import { ProductPublicPage } from "@/features/products";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <ProductPublicPage params={resolvedParams} />;
}