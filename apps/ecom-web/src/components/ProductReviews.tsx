import type { JSX } from 'react';
import { getReviews, getAverageRating, getRatingDistribution } from '@/data/reviews';
import type { ProductsDetailContent } from '@/data/productsContent';
import {
  RatingSummary,
  ReviewCards,
  type ReviewItem,
} from '@/components/ProductReviewsParts';

export function ProductReviews({
  slug,
  content,
  writeReviewHref = content.writeReviewHref,
}: {
  slug: string;
  content: ProductsDetailContent;
  writeReviewHref?: string;
}): JSX.Element | null {
  const reviews: ReviewItem[] = getReviews(slug);
  if (reviews.length === 0) return null;

  const avg = getAverageRating(slug);
  const dist = getRatingDistribution(slug);

  return (
    <section
      className='px-8 md:px-16 py-20'
      style={{ borderTop: '1px solid var(--border)' }}
    >
      <div className='max-w-screen-2xl mx-auto'>
        <div className='mb-12'>
          <div className='type-label mb-3' style={{ color: 'var(--accent)' }}>
            {content.reviewsEyebrow}
          </div>
          <h2 className='type-display-md' style={{ color: 'var(--fg)' }}>
            {content.reviewsTitle}
          </h2>
        </div>
        <div className='grid md:grid-cols-[280px_1fr] gap-12 md:gap-20'>
          <RatingSummary
            avg={avg}
            reviewsLength={reviews.length}
            distribution={dist}
            reviewsLabelSingular={content.reviewSingularLabel}
            reviewsLabelPlural={content.reviewPluralLabel}
          />
          <ReviewCards
            reviews={reviews}
            writeReviewHref={writeReviewHref}
            writeReviewLabel={content.writeReviewLabel}
            verifiedPurchaseLabel={content.verifiedPurchaseLabel}
          />
        </div>
      </div>
    </section>
  );
}
