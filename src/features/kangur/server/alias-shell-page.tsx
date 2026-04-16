/*
 * Kangur alias shell page helper
 *
 * Purpose: Lightweight wrapper that guards accessibility and routing for
 * alias-based Kangur entries. It defers to the route access guard which may
 * redirect or throw if the requested slug is not accessible.
 *
 * Accessibility notes:
 * - Keep the Suspense fallback minimal (null) to avoid focus traps. The
 *   guarded shell should provide a clear focus target as soon as it mounts.
 */
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
