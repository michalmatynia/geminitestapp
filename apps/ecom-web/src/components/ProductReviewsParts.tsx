import type { JSX } from 'react';

type ReviewMetadata = {
  id: string;
  author: string;
  location: string;
  date: string;
  rating: number;
  title: string;
  verified?: boolean;
  body: string;
};

export type ReviewItem = ReviewMetadata;

function Stars({ rating, size = 14 }: { rating: number; size?: number }): JSX.Element {
  return (
    <div className='flex items-center gap-0.5'>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox='0 0 24 24'
          fill={i <= rating ? 'currentColor' : 'none'}
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          strokeLinejoin='round'
          style={{ color: i <= rating ? 'var(--accent)' : 'var(--border)' }}
        >
          <polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' />
        </svg>
      ))}
    </div>
  );
}

function ReviewCountLabel({
  count,
  singularLabel,
  pluralLabel,
}: {
  count: number;
  singularLabel: string;
  pluralLabel: string;
}): JSX.Element {
  return (
    <span className='type-label mt-2' style={{ color: 'var(--muted)' }}>
      {count} {count === 1 ? singularLabel : pluralLabel}
    </span>
  );
}

function RatingBar({
  star,
  count,
  total,
}: {
  star: number;
  count: number;
  total: number;
}): JSX.Element {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className='flex items-center gap-3'>
      <span className='type-label flex-shrink-0 w-5 text-right' style={{ color: 'var(--muted)' }}>
        {star}
      </span>
      <div className='flex-1 h-1.5' style={{ background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
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
      <span className='type-label flex-shrink-0 w-4' style={{ color: 'var(--muted)' }}>
        {count}
      </span>
    </div>
  );
}

function VerifiedBadge({
  label,
}: {
  label: string;
}): JSX.Element {
  return (
    <span className='type-label flex items-center gap-1' style={{ color: '#4A7C5A', fontSize: '0.6rem' }}>
      <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
        <path d='M20 6L9 17l-5-5' />
      </svg>
      {label}
    </span>
  );
}

function ReviewHeader({
  author,
  location,
  date,
  rating,
  title,
  verified,
  verifiedPurchaseLabel,
}: {
  author: string;
  location: string;
  date: string;
  rating: number;
  title: string;
  verified: boolean;
  verifiedPurchaseLabel: string;
}): JSX.Element {
  return (
    <div className='flex items-start justify-between gap-4 mb-4'>
      <div>
        <div className='flex items-center gap-3 mb-1'>
          <Stars rating={rating} size={13} />
          {verified && <VerifiedBadge label={verifiedPurchaseLabel} />}
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
          {title}
        </div>
      </div>
      <div className='text-right flex-shrink-0'>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.8rem',
          fontWeight: 300,
          color: 'var(--fg)',
        }}>
          {author}
        </div>
        <div className='type-label' style={{ color: 'var(--muted)' }}>
          {location}
        </div>
        <div className='type-label mt-0.5' style={{ color: 'var(--muted)' }}>
          {date}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({
  review,
  verifiedPurchaseLabel,
}: {
  review: ReviewMetadata;
  verifiedPurchaseLabel: string;
}): JSX.Element {
  const isVerified = review.verified === true;

  return (
    <div key={review.id} className='pb-8' style={{ borderBottom: '1px solid var(--border)' }}>
      <ReviewHeader
        author={review.author}
        location={review.location}
        date={review.date}
        rating={review.rating}
        title={review.title}
        verified={isVerified}
        verifiedPurchaseLabel={verifiedPurchaseLabel}
      />
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
  );
}

export function ReviewCards({
  reviews,
  writeReviewHref,
  writeReviewLabel,
  verifiedPurchaseLabel,
}: {
  reviews: ReviewItem[];
  writeReviewHref?: string;
  writeReviewLabel: string;
  verifiedPurchaseLabel: string;
}): JSX.Element {
  return (
    <div className='flex flex-col gap-8'>
      {reviews.map((review) => (
        <ReviewRow key={review.id} review={review} verifiedPurchaseLabel={verifiedPurchaseLabel} />
      ))}

      <div>
        <a
          href={writeReviewHref}
          className='type-label flex items-center gap-2 hover:text-[var(--fg)] transition-colors'
          style={{ color: 'var(--muted)' }}
        >
          {writeReviewLabel}
          <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
            <path d='M5 12h14M12 5l7 7-7 7' />
          </svg>
        </a>
      </div>
    </div>
  );
}

export function RatingSummary({
  avg,
  reviewsLength,
  distribution,
  reviewsLabelSingular,
  reviewsLabelPlural,
}: {
  avg: number;
  reviewsLength: number;
  distribution: Record<number, number>;
  reviewsLabelSingular: string;
  reviewsLabelPlural: string;
}): JSX.Element {
  return (
    <div>
      <div className='mb-6'>
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
        <ReviewCountLabel
          count={reviewsLength}
          singularLabel={reviewsLabelSingular}
          pluralLabel={reviewsLabelPlural}
        />
      </div>
      <div className='flex flex-col gap-2'>
        {[5, 4, 3, 2, 1].map((star) => (
          <RatingBar
            key={star}
            star={star}
            count={distribution[star] ?? 0}
            total={reviewsLength}
          />
        ))}
      </div>
    </div>
  );
}
