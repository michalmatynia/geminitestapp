import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server/alias-shell-page';

type KangurAliasPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function Page({
  params,
}: KangurAliasPageProps): Promise<null> {
  const { slug = [] } = await params;
  return renderAccessibleKangurAliasRoute(slug);
}
