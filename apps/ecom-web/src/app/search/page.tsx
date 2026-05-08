import { redirect } from 'next/navigation';
import type { JSX } from 'react';
import { getRequestLocale } from '@/lib/request-locale';
import { localizeHref } from '@/lib/locales';

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}): Promise<JSX.Element> {
  const params: { q?: string } = await (searchParams ?? Promise.resolve({}));
  const locale = await getRequestLocale();
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const target = localizeHref(q ? `/products?q=${encodeURIComponent(q)}` : '/products', locale);
  redirect(target);
}
