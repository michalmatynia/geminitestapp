import type { Metadata } from 'next';
import type { JSX } from 'react';
import { AccountPageClient } from '@/app/account/AccountPageClient';
import { getAccountContent } from '@/lib/cms';
import { getMentiosCatalogLocales } from '@/lib/mentios';
import { getRequestLocale } from '@/lib/request-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getAccountContent(locale);
  return {
    title: `${content.signedOut.title} - ARCANA`,
    description: locale === 'pl'
      ? 'Zobacz konto ARCANA, zapisane produkty, zamówienia i ustawienia.'
      : 'View your ARCANA account, saved items, orders, and settings.',
  };
}

export default async function AccountPage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const [content, availableLocales] = await Promise.all([
    getAccountContent(locale),
    getMentiosCatalogLocales(),
  ]);
  return <AccountPageClient content={content} availableLocales={availableLocales} />;
}
