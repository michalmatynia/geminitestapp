import KangurLayout from '@/app/(frontend)/kangur/layout';

type LocalizedKangurLayoutProps = {
  children: React.ReactNode;
};

export default function LocalizedKangurLayout({
  children,
}: LocalizedKangurLayoutProps): React.JSX.Element {
  return <KangurLayout>{children}</KangurLayout>;
}
