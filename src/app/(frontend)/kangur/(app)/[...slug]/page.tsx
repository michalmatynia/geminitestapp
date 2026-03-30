import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server';

type KangurAliasPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function Page({
  params,
}: KangurAliasPageProps): Promise<null> {
  const { slug = [] } = await params;
  return renderAccessibleKangurAliasRoute(slug);
}
