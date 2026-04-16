import { Suspense } from 'react';

import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server/alias-shell-page';

type LocalizedKangurAliasPageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

async function LocalizedKangurAliasPageRuntime({
  params,
}: LocalizedKangurAliasPageProps): Promise<React.JSX.Element> {
  const { slug = [] } = await params;
  return renderAccessibleKangurAliasRoute(slug);
}

export default function LocalizedKangurAliasPage(
  props: LocalizedKangurAliasPageProps
): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <LocalizedKangurAliasPageRuntime {...props} />
    </Suspense>
  );
}
