import { requireAccessibleKangurSlugRoute } from '@/features/kangur/server/route-access';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';

type LocalizedKangurAliasPageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

export default async function LocalizedKangurAliasPage({
  params,
}: LocalizedKangurAliasPageProps): Promise<React.JSX.Element> {
  const { slug = [] } = await params;
  await requireAccessibleKangurSlugRoute(slug);
  return <KangurServerShell />;
}
