import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server/alias-shell-page';

type LocalizedKangurAliasPageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

export default async function LocalizedKangurAliasPage({
  params,
}: LocalizedKangurAliasPageProps): Promise<null> {
  const { slug = [] } = await params;
  return renderAccessibleKangurAliasRoute(slug);
}
