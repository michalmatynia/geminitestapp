import { Suspense } from 'react';

import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server';

type KangurAliasPageProps = {
  params: Promise<{ slug?: string[] }>;
};

async function KangurAliasPageRuntime({
  params,
}: KangurAliasPageProps) {
  const { slug = [] } = await params;
  return renderAccessibleKangurAliasRoute(slug);
}

export default function Page(props: KangurAliasPageProps): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <KangurAliasPageRuntime {...props} />
    </Suspense>
  );
}
