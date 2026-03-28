import { renderAccessibleKangurAliasRoute } from '@/features/kangur/server';

export default async function Page(): Promise<null> {
  return renderAccessibleKangurAliasRoute([]);
}
