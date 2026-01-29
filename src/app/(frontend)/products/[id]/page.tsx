import { ProductPublicPage } from "@/features/products/server";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const resolvedParams = await params;
  return <ProductPublicPage params={resolvedParams} />;
}