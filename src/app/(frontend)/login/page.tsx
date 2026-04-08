import { renderCanonicalLoginRoute, generateCanonicalLoginMetadata } from '@/app/(frontend)/route-helpers/login-route-helpers';

import type { Metadata } from 'next';
import type { JSX } from 'react';

export async function generateMetadata(): Promise<Metadata> {
  return generateCanonicalLoginMetadata();
}

export default async function LoginPage(): Promise<JSX.Element> {
  return renderCanonicalLoginRoute();
}
