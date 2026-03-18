import FrontendLayout from '../../(frontend)/layout';

type LocalizedFrontendLayoutProps = {
  children: React.ReactNode;
};

export default async function LocalizedFrontendLayout({
  children,
}: LocalizedFrontendLayoutProps): Promise<React.JSX.Element> {
  return <FrontendLayout>{children}</FrontendLayout>;
}
