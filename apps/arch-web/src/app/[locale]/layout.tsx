import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { isArchLocale } from '@/lib/types';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isArchLocale(locale)) notFound();
  return <>{children}</>;
}
