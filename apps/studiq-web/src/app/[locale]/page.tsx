import { redirect } from 'next/navigation';

type LocalizedRootPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedRootPage({
  params,
}: LocalizedRootPageProps): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/kangur`);
}
