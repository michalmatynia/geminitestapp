import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { JSX } from 'react';
import { PatternOrderPanel } from '@/components/PatternOrderPanel';
import { PatternPreview } from '@/components/PatternPreview';
import { getPatternProductBySlug, getPatternProducts } from '@/lib/patternsRepository';
import type { PatternCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

const categoryLabels: Record<PatternCategory, string> = {
  architecture: 'Architecture',
  botanical: 'Botanical',
  editorial: 'Editorial',
  interior: 'Interior',
  textile: 'Textile',
};

const formatDate = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

function formatUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return formatDate.format(date);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPatternProductBySlug(slug);
  if (result === null) {
    return {
      title: 'Pattern Not Found - Milk Bar Patterns',
    };
  }

  return {
    title: `${result.pattern.name} - Milk Bar Patterns`,
    description: result.pattern.description,
    openGraph: {
      title: `${result.pattern.name} - Milk Bar Patterns`,
      description: result.pattern.description,
      type: 'website',
    },
  };
}

export default async function PatternDetailPage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const result = await getPatternProductBySlug(slug);
  if (result === null) notFound();

  const pattern = result.pattern;
  const related = (await getPatternProducts()).patterns
    .filter((entry) => entry.id !== pattern.id && entry.category === pattern.category)
    .slice(0, 3);

  return (
    <>
      <nav className="top patterns-top" id="topnav">
        <div className="nav-row">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">Milk Bar Patterns</span>
            <span className="brand-sub">/ vector archive</span>
          </Link>
          <div className="nav-links">
            <Link href="/#catalog">catalog</Link>
            <Link href="/#licenses">licenses</Link>
            <Link href="/#orders">orders</Link>
          </div>
          <div className="nav-end">
            <Link href="/#catalog" className="nav-cta-link">catalog</Link>
          </div>
        </div>
      </nav>

      <main className="detail-page wrap">
        <Link href="/#catalog" className="detail-back">back to catalog</Link>

        <section className="detail-layout">
          <div className="detail-preview-panel">
            <PatternPreview preview={pattern.preview} label={pattern.name} />
          </div>

          <div className="detail-copy">
            <div className="label">{pattern.collection} / {result.source}</div>
            <h1>{pattern.name}</h1>
            <p className="detail-description">{pattern.description}</p>

            <dl className="detail-specs">
              <div>
                <dt>Edition</dt>
                <dd>{pattern.edition}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{categoryLabels[pattern.category]}</dd>
              </div>
              <div>
                <dt>Repeat</dt>
                <dd>{pattern.repeatSize}</dd>
              </div>
              <div>
                <dt>Formats</dt>
                <dd>{pattern.formats.join(', ')}</dd>
              </div>
              <div>
                <dt>File size</dt>
                <dd>{pattern.fileSize}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatUpdated(pattern.updatedAt)}</dd>
              </div>
            </dl>

            <div className="detail-tags">
              {pattern.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>

            <PatternOrderPanel pattern={pattern} />
          </div>
        </section>

        {related.length > 0 ? (
          <section className="related-section">
            <div className="section-rule-head">
              <span className="label">related patterns</span>
            </div>
            <div className="related-grid">
              {related.map((entry) => (
                <Link key={entry.id} href={`/patterns/${entry.slug}`} className="related-card">
                  <PatternPreview preview={entry.preview} label={entry.name} />
                  <span>{entry.edition}</span>
                  <strong>{entry.name}</strong>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
