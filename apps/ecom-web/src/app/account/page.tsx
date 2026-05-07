import type { Metadata } from 'next';
import type { JSX } from 'react';
import { AccountPageClient } from '@/app/account/AccountPageClient';
import { getAccountContent } from '@/lib/cms';

export const metadata: Metadata = {
  title: 'Account - ARCANA',
  description: 'View your ARCANA account, saved items, orders, and settings.',
};

export default async function AccountPage(): Promise<JSX.Element> {
  const content = await getAccountContent();
  return <AccountPageClient content={content} />;
}
