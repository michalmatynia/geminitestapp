import { Suspense } from 'react';

import { requireAccessibleKangurSlugRoute } from './route-access';

async function KangurAccessibleAliasRouteGuard({
  slugSegments,
}: {
  slugSegments: readonly string[];
}): Promise<null> {
  await requireAccessibleKangurSlugRoute(slugSegments);
  return null;
}

export const renderAccessibleKangurAliasRoute = (
  slugSegments: readonly string[]
): React.JSX.Element => (
  <Suspense fallback={null}>
    <KangurAccessibleAliasRouteGuard slugSegments={slugSegments} />
  </Suspense>
);
