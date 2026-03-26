import {
  generateCanonicalLoginMetadata,
  renderCanonicalLoginRoute,
} from '@/app/(frontend)/login-route-helpers';

import type { Metadata } from 'next';
import type { JSX } from 'react';

type LocalizedLoginPageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
}: LocalizedLoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  return generateCanonicalLoginMetadata({ locale });
}

export default async function LocalizedLoginPage({
  params,
}: LocalizedLoginPageProps): Promise<JSX.Element> {
  const { locale } = await params;
  return renderCanonicalLoginRoute({ locale });
}
