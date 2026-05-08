import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { JSX } from 'react';
import { AdminCmsEditor } from '@/components/AdminCmsEditor';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { getSession } from '@/lib/auth';
import { localizeHref } from '@/lib/locales';
import { getRequestLocale } from '@/lib/request-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: locale === 'pl' ? 'Panel CMS - ARCANA' : 'CMS Console - ARCANA',
    description: locale === 'pl'
      ? 'Panel zarządzania treścią sklepu ARCANA.'
      : 'Content management console for the ARCANA storefront.',
  };
}

export default async function CmsPage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    redirect(localizeHref('/account', locale));
  }

  const title = locale === 'pl' ? 'Panel CMS' : 'CMS Console';
  const eyebrow = locale === 'pl' ? 'Super Admin' : 'Super Admin';
  const description = locale === 'pl'
    ? 'Edytuj treści sklepu, strony, stories, lookbook i globalne elementy interfejsu.'
    : 'Edit storefront copy, pages, stories, lookbook entries, and global interface content.';

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh' }}>
        <section
          className="px-8 md:px-16 py-14"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="max-w-screen-2xl mx-auto">
            <div className="type-label mb-3" style={{ color: 'var(--coral-red)' }}>
              {eyebrow}
            </div>
            <h1 className="type-display-lg" style={{ color: 'var(--fg)' }}>
              {title}
            </h1>
            <p
              className="mt-4 max-w-2xl"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                fontWeight: 300,
                color: 'var(--muted)',
                lineHeight: 1.8,
              }}
            >
              {description}
            </p>
          </div>
        </section>
        <section className="max-w-screen-2xl mx-auto px-8 md:px-16 py-12">
          <AdminCmsEditor />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
