import type { JSX } from 'react';
import { getReviews, getAverageRating, getRatingDistribution } from '@/data/reviews';
import type { ProductsDetailContent } from '@/data/productsContent';

function Stars({ rating, size = 14 }: { rating: number; size?: number }): JSX.Element {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: i <= rating ? 'var(--accent)' : 'var(--border)' }}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export function ProductReviews({
  slug,
  content,
  writeReviewHref = content.writeReviewHref,
}: {
  slug: string;
  content: ProductsDetailContent;
  writeReviewHref?: string;
}): JSX.Element | null {
  const reviews = getReviews(slug);
  if (reviews.length === 0) return null;

  const avg = getAverageRating(slug);
  const dist = getRatingDistribution(slug);

  return (
    <section
      className="px-8 md:px-16 py-20"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      <div className="max-w-screen-2xl mx-auto">
        <div className="mb-12">
          <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>
            {content.reviewsEyebrow}
          </div>
          <h2 className="type-display-md" style={{ color: 'var(--fg)' }}>
            {content.reviewsTitle}
          </h2>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-12 md:gap-20">
          {/* Rating summary */}
          <div>
            {/* Big average */}
            <div className="mb-6">
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '5rem',
                  fontWeight: 300,
                  color: 'var(--fg)',
                  lineHeight: 1,
                  marginBottom: '0.5rem',
                }}
              >
                {avg}
              </div>
              <Stars rating={Math.round(avg)} size={16} />
              <div className="type-label mt-2" style={{ color: 'var(--muted)' }}>
                {reviews.length} {reviews.length === 1 ? content.reviewSingularLabel : content.reviewPluralLabel}
              </div>
            </div>

            {/* Distribution bars */}
            <div className="flex flex-col gap-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = dist[star] ?? 0;
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span
                      className="type-label flex-shrink-0 w-5 text-right"
                      style={{ color: 'var(--muted)' }}
                    >
                      {star}
                    </span>
                    <div
                      className="flex-1 h-1.5"
                      style={{ background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'var(--accent)',
                          borderRadius: '2px',
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                    <span
                      className="type-label flex-shrink-0 w-4"
                      style={{ color: 'var(--muted)' }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review cards */}
          <div className="flex flex-col gap-8">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="pb-8"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <Stars rating={review.rating} size={13} />
                      {review.verified && (
                        <span
                          className="type-label flex items-center gap-1"
                          style={{ color: '#4A7C5A', fontSize: '0.6rem' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          {content.verifiedPurchaseLabel}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.05rem',
                        fontWeight: 300,
                        color: 'var(--fg)',
                        lineHeight: 1.2,
                      }}
                    >
                      {review.title}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        fontWeight: 300,
                        color: 'var(--fg)',
                      }}
                    >
                      {review.author}
                    </div>
                    <div className="type-label" style={{ color: 'var(--muted)' }}>{review.location}</div>
                    <div className="type-label mt-0.5" style={{ color: 'var(--muted)' }}>{review.date}</div>
                  </div>
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem',
                    fontWeight: 300,
                    color: 'var(--muted)',
                    lineHeight: 1.9,
                  }}
                >
                  {review.body}
                </p>
              </div>
            ))}

            {/* Write review CTA */}
            <div>
              <a
                href={writeReviewHref}
                className="type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors"
                style={{ color: 'var(--muted)' }}
              >
                {content.writeReviewLabel}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
