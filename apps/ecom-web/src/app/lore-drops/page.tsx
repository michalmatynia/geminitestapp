import type { Metadata } from 'next';
import type { JSX } from 'react';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { getLoreDropsArticles } from '@/lib/loreDrops';
import { localizeHref } from '@/lib/locales';
import { getRequestLocale } from '@/lib/request-locale';

export const revalidate = 120;

const CARD_VISUALS = [
  {
    accent: 'var(--soft-gold)',
    background:
      'radial-gradient(circle at 48% 18%, rgba(229,183,94,0.22) 0%, transparent 30%), linear-gradient(145deg, #020205 0%, #060913 58%, #120708 100%)',
  },
  {
    accent: 'var(--peach-orange)',
    background:
      'radial-gradient(circle at 28% 22%, rgba(216,116,50,0.2) 0%, transparent 32%), linear-gradient(145deg, #020205 0%, #120708 56%, #2A0A07 100%)',
  },
  {
    accent: 'var(--cyan-teal)',
    background:
      'radial-gradient(circle at 70% 22%, rgba(126,202,216,0.18) 0%, transparent 32%), linear-gradient(145deg, #020205 0%, #050812 56%, #0D1538 100%)',
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const { editorial } = await getLoreDropsArticles(locale);
  const title = `${editorial.title} - ARCANA`;
  const description = editorial.eyebrow;
  return {
    title,
    description,
    openGraph: { type: 'website', title, description },
    twitter: { card: 'summary', title, description },
  };
}

export default async function LoreDropsPage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const { articles, editorial } = await getLoreDropsArticles(locale);

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>
        <header className='px-8 py-16 md:px-16 md:py-20' style={{ borderBottom: '1px solid var(--border)' }}>
          <div className='type-label mb-4' style={{ color: 'var(--accent)' }}>
            {editorial.eyebrow}
          </div>
          <h1 className='type-display-lg' style={{ color: 'var(--fg)' }}>
            {editorial.title}
          </h1>
        </header>

        <section className='mx-auto grid max-w-screen-2xl gap-6 px-8 py-16 md:grid-cols-3 md:px-16'>
          {articles.map((article, index) => {
            const visual = CARD_VISUALS[index % CARD_VISUALS.length] ?? CARD_VISUALS[0];
            return (
              <a
                key={article.id}
                href={localizeHref(article.href, locale)}
                className='group relative block overflow-hidden'
                style={{ aspectRatio: '3/4', border: '1px solid rgba(var(--accent-rgb),0.12)' }}
              >
                <div className='absolute inset-0 transition-transform duration-700 group-hover:scale-105'
                  style={{ background: visual.background }} />
                <div className='absolute inset-0 dot-grid opacity-20' />
                <div className='absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/70' />
                <div className='absolute inset-0 flex flex-col justify-end p-7'>
                  <span className='type-label mb-4 w-fit px-2 py-1'
                    style={{ color: visual.accent, border: `1px solid ${visual.accent}` }}>
                    {article.tag}
                  </span>
                  <h2 className='mb-3'
                    style={{
                      color: 'var(--on-media)',
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.2rem, 2vw, 1.7rem)',
                      fontWeight: 700,
                      lineHeight: 1.12,
                    }}>
                    {article.title}
                  </h2>
                  <p className='text-sm leading-7' style={{ color: 'var(--on-media-muted)' }}>
                    {article.excerpt}
                  </p>
                </div>
              </a>
            );
          })}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
