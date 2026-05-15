import type { ArchPageContent } from '@/lib/types';

export default function Quote({ content }: { content: ArchPageContent['quote'] }) {
  return (
    <div className="quote-sec">
      <div className="wrap">
        <div className="quote-grid">
          <span className="num rev">{content.eyebrow}</span>
          <div>
            <blockquote className="rev" data-delay="1">
              {content.text}
              <span><em>{content.emphasis}</em></span>
            </blockquote>
            <div className="q-attr rev" data-delay="2">
              {content.attribution}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
