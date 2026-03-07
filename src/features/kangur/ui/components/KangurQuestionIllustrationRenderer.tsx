import React from 'react';
import { cn } from '@/shared/utils';
import type { KangurQuestionIllustration } from '@/shared/contracts/kangur-tests';

/**
 * Renders a KangurQuestionIllustration (none | single | panels).
 * SVG content is injected via dangerouslySetInnerHTML.
 * In production, pipe content through DOMPurify before storage
 * so it is safe to render here without additional sanitization.
 */
type Props = {
  illustration: KangurQuestionIllustration;
  className?: string;
};

export function KangurQuestionIllustrationRenderer({
  illustration,
  className,
}: Props): React.JSX.Element | null {
  if (illustration.type === 'none') return null;

  if (illustration.type === 'single') {
    if (!illustration.svgContent?.trim()) return null;
    return (
      <div
        className={cn('w-full max-w-sm mx-auto', className)}
        dangerouslySetInnerHTML={{ __html: illustration.svgContent }}
      />
    );
  }

  // panels
  const { layout, panels } = illustration;

  const containerClass =
    layout === 'grid-2x2'
      ? 'grid grid-cols-2 gap-3'
      : layout === 'grid-3x2'
        ? 'grid grid-cols-3 gap-3'
        : 'flex flex-wrap justify-center gap-3';

  return (
    <div className={cn(containerClass, className)}>
      {panels.map((panel) => (
        <figure key={panel.id} className='flex flex-col items-center gap-1'>
          {panel.label ? (
            <figcaption className='text-xs font-bold text-gray-600'>{panel.label})</figcaption>
          ) : null}
          {panel.svgContent.trim() ? (
            <div
              className='w-20 h-20'
              title={panel.description}
              aria-label={panel.description || `Panel ${panel.label}`}
              dangerouslySetInnerHTML={{ __html: panel.svgContent }}
            />
          ) : (
            <div className='w-20 h-20 rounded border border-dashed border-gray-200 bg-gray-50' />
          )}
        </figure>
      ))}
    </div>
  );
}
