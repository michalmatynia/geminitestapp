import { KangurAliasAppLayout } from '@/features/kangur/server';

type LocalizedKangurAppLayoutProps = {
  children: React.ReactNode;
};

export default async function LocalizedKangurAppLayout({
  children,
}: LocalizedKangurAppLayoutProps): Promise<React.ReactNode> {
  return await KangurAliasAppLayout({ children });
}
