import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { JSX } from 'react';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import {
  getLoreDropsArticleBySlug,
  getLoreDropsArticleParagraphs,
  getLoreDropsArticles,
} from '@/lib/loreDrops';
import { localizeHref } from '@/lib/locales';
import { getRequestLocale } from '@/lib/request-locale';

export const revalidate = 120;

type Props = { params: Promise<{ slug: string }> };

const HERO_BACKGROUNDS = [
  'radial-gradient(circle at 48% 18%, rgba(229,183,94,0.22) 0%, transparent 30%), radial-gradient(circle at 16% 76%, rgba(234,247,238,0.08) 0%, transparent 24%), linear-gradient(145deg, #020205 0%, #060913 58%, #120708 100%)',
  'radial-gradient(circle at 28% 22%, rgba(216,116,50,0.2) 0%, transparent 32%), radial-gradient(circle at 82% 78%, rgba(201,60,47,0.14) 0%, transparent 30%), linear-gradient(145deg, #020205 0%, #120708 56%, #2A0A07 100%)',
  'radial-gradient(circle at 70% 22%, rgba(126,202,216,0.18) 0%, transparent 32%), radial-gradient(circle at 26% 74%, rgba(44,70,216,0.14) 0%, transparent 30%), linear-gradient(145deg, #020205 0%, #050812 56%, #0D1538 100%)',
];

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const { articles } = await getLoreDropsArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const { article } = await getLoreDropsArticleBySlug(slug, locale);
  if (article === null) return {};
  const title = `${article.title} - ARCANA`;
  const description = article.excerpt.slice(0, 155);
  return {
    title,
    description,
    openGraph: { type: 'article', title, description, tags: [article.tag] },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function LoreDropsArticlePage({ params }: Props): Promise<JSX.Element> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const { article, editorial } = await getLoreDropsArticleBySlug(slug, locale);
  if (article === null) notFound();

  const paragraphs = getLoreDropsArticleParagraphs(article);
  const background = HERO_BACKGROUNDS[
    Math.abs(article.slug.split('').reduce((total, char) => total + char.charCodeAt(0), 0)) %
      HERO_BACKGROUNDS.length
  ];

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>
        <ArticleHero
          article={article}
          background={background}
          editorialTitle={editorial.title}
          locale={locale}
        />
        <ArticleBody articleSlug={article.slug} paragraphs={paragraphs} />
      </main>
      <SiteFooter />
    </>
  );
}

function ArticleHero({
  article,
  background,
  editorialTitle,
  locale,
}: {
  article: NonNullable<Awaited<ReturnType<typeof getLoreDropsArticleBySlug>>['article']>;
  background: string;
  editorialTitle: string;
  locale: Awaited<ReturnType<typeof getRequestLocale>>;
}): JSX.Element {
  return (
    <section className='relative min-h-[62vh] overflow-hidden grain' style={{ background }}>
      <div className='absolute inset-0 dot-grid opacity-20' />
      <div className='absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/70' />
      <div className='absolute inset-0 flex flex-col justify-end p-8 md:p-20'>
        <ArticleBreadcrumb articleTag={article.tag} editorialTitle={editorialTitle} locale={locale} />
        <div className='max-w-3xl'>
          <span className='type-label mb-6 inline-block px-3 py-1.5'
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
            {article.tag}
          </span>
          <h1
            style={{
              color: 'var(--on-media)',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 6vw, 5rem)',
              fontWeight: 300,
              lineHeight: 1.02,
              marginBottom: '1.25rem',
            }}
          >
            {article.title}
          </h1>
          <p
            style={{
              color: 'var(--on-media-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: '1.05rem',
              fontWeight: 300,
              lineHeight: 1.7,
              maxWidth: '560px',
            }}
          >
            {article.excerpt}
          </p>
        </div>
      </div>
    </section>
  );
}

function ArticleBreadcrumb({
  articleTag,
  editorialTitle,
  locale,
}: {
  articleTag: string;
  editorialTitle: string;
  locale: Awaited<ReturnType<typeof getRequestLocale>>;
}): JSX.Element {
  return (
    <div className='mb-8 flex items-center gap-2'>
      <a href={localizeHref('/lore-drops', locale)}
        className='type-label transition-opacity hover:opacity-80'
        style={{ color: 'rgba(255,255,255,0.45)' }}>
        {editorialTitle}
      </a>
      <span className='type-label' style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
      <span className='type-label' style={{ color: 'rgba(255,255,255,0.7)' }}>
        {articleTag}
      </span>
    </div>
  );
}

function ArticleBody({
  articleSlug,
  paragraphs,
}: {
  articleSlug: string;
  paragraphs: string[];
}): JSX.Element {
  return (
    <article className='mx-auto max-w-2xl px-8 py-16 md:py-24'>
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${articleSlug}-paragraph-${index}`}
          style={{
            color: 'var(--fg)',
            fontFamily: 'var(--font-body)',
            fontSize: '1.05rem',
            fontWeight: 300,
            lineHeight: 1.9,
            marginBottom: '1.75rem',
          }}
        >
          {paragraph}
        </p>
      ))}
    </article>
  );
}
