import KangurAppLayout from '../../../../(frontend)/kangur/(app)/layout';

type LocalizedKangurAppLayoutProps = {
  children: React.ReactNode;
};

export default function LocalizedKangurAppLayout({
  children,
}: LocalizedKangurAppLayoutProps): React.JSX.Element {
  return <KangurAppLayout>{children}</KangurAppLayout>;
}
