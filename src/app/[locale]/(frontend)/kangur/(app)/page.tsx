import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server/alias-shell-page';

export default async function Page(): Promise<null> {
  return renderAccessibleKangurAliasRoute([]);
}
