import { KangurAliasAppLayout } from '@/features/kangur/server';

type LocalizedKangurAppLayoutProps = {
  children: React.ReactNode;
};

export default function LocalizedKangurAppLayout({
  children,
}: LocalizedKangurAppLayoutProps): React.JSX.Element {
  return <KangurAliasAppLayout>{children}</KangurAliasAppLayout>;
}
