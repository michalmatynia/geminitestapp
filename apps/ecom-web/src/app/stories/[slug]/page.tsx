import { notFound } from 'next/navigation';
import type { Metadata, JSX } from 'next';
import { STORIES, getStory } from '@/data/stories';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return STORIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) return {};
  return {
    title: `${story.title} — ARCANA Stories`,
    description: story.excerpt.slice(0, 155),
  };
}

export default async function StoryPage({ params }: Props): Promise<JSX.Element> {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();

  const related = STORIES.filter(
    (s) => story.relatedSlugs.includes(s.slug),
  );

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>
        {/* Hero */}
        <div
          className="relative overflow-hidden grain"
          style={{ minHeight: '65vh', background: story.gradient }}
        >
          <div className="absolute inset-0 p-8 md:p-20 flex flex-col justify-end" style={{ zIndex: 2 }}>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-8">
              <a href="/stories" className="type-label hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Stories
              </a>
              <span className="type-label" style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
              <span className="type-label" style={{ color: 'rgba(255,255,255,0.7)' }}>{story.category}</span>
            </div>

            <div className="max-w-3xl">
              {/* Category badge */}
              <span
                className="type-label px-3 py-1.5 inline-block mb-6"
                style={{ background: story.accentColor, color: '#fff' }}
              >
                {story.category}
              </span>

              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.2rem, 6vw, 5rem)',
                  fontWeight: 300,
                  lineHeight: 1.02,
                  color: story.textColor,
                  marginBottom: '1.25rem',
                }}
              >
                {story.title}
              </h1>

              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '1.05rem',
                  fontWeight: 300,
                  color: story.textColor,
                  opacity: 0.7,
                  lineHeight: 1.7,
                  marginBottom: '2rem',
                  maxWidth: '520px',
                }}
              >
                {story.subtitle}
              </p>

              <div className="flex items-center gap-6">
                <span className="type-label" style={{ color: 'rgba(255,255,255,0.5)' }}>{story.date}</span>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
                <span className="type-label" style={{ color: 'rgba(255,255,255,0.5)' }}>{story.readTime} read</span>
              </div>
            </div>
          </div>

          {/* Rotated issue label */}
          <div
            className="absolute right-10 top-1/2 -translate-y-1/2 rotate-90 hidden md:block"
            style={{ color: 'rgba(255,255,255,0.12)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}
          >
            ARCANA Stories · {story.date}
          </div>
        </div>

        {/* Article body */}
        <div className="max-w-2xl mx-auto px-8 py-16 md:py-24">
          {story.body.map((block, i) => {
            if (block.type === 'paragraph') {
              return (
                <p
                  key={i}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '1.05rem',
                    fontWeight: 300,
                    color: 'var(--fg)',
                    lineHeight: 1.9,
                    marginBottom: '1.75rem',
                  }}
                >
                  {block.text}
                </p>
              );
            }
            if (block.type === 'pull-quote') {
              return (
                <blockquote
                  key={i}
                  className="my-12 pl-8"
                  style={{ borderLeft: `3px solid ${story.accentColor}` }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.3rem, 2.5vw, 2rem)',
                      fontWeight: 300,
                      color: 'var(--fg)',
                      lineHeight: 1.3,
                      fontStyle: 'italic',
                    }}
                  >
                    {block.text}
                  </p>
                </blockquote>
              );
            }
            if (block.type === 'heading') {
              return (
                <h2
                  key={i}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.4rem, 2.5vw, 2.2rem)',
                    fontWeight: 300,
                    color: 'var(--fg)',
                    lineHeight: 1.15,
                    marginTop: '3rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {block.text}
                </h2>
              );
            }
            if (block.type === 'caption') {
              return (
                <p
                  key={i}
                  className="mt-12 pt-6"
                  style={{
                    borderTop: '1px solid var(--border)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.1em',
                    color: 'var(--muted)',
                    lineHeight: 1.65,
                  }}
                >
                  {block.text}
                </p>
              );
            }
            return null;
          })}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
            {story.tags.map((tag) => (
              <span
                key={tag}
                className="type-label px-3 py-1.5"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Related stories */}
        {related.length > 0 && (
          <section
            className="px-8 md:px-16 py-16"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="max-w-screen-2xl mx-auto">
              <div className="type-label mb-10" style={{ color: 'var(--accent)' }}>
                Continue reading
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {related.map((s) => (
                  <a key={s.id} href={`/stories/${s.slug}`} className="group flex gap-6 items-start">
                    <div
                      className="flex-shrink-0 transition-transform duration-500 group-hover:scale-105"
                      style={{ width: '120px', aspectRatio: '4/3', background: s.gradient }}
                    />
                    <div>
                      <span
                        className="type-label px-2 py-0.5 inline-block mb-2"
                        style={{ background: s.accentColor, color: '#fff' }}
                      >
                        {s.category}
                      </span>
                      <h3
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.2rem',
                          fontWeight: 300,
                          color: 'var(--fg)',
                          lineHeight: 1.2,
                          marginBottom: '0.5rem',
                        }}
                      >
                        {s.title}
                      </h3>
                      <span className="type-label" style={{ color: 'var(--muted)' }}>
                        {s.readTime} read
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
