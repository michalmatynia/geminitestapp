import { requireAccessibleKangurSlugRoute } from './route-access';

export const renderAccessibleKangurAliasRoute = async (
  slugSegments: readonly string[]
): Promise<null> => {
  await requireAccessibleKangurSlugRoute(slugSegments);
  return null;
};
