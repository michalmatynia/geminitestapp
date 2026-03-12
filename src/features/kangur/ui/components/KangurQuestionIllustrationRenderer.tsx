import React from 'react';

import { KangurMediaFrame, KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import type { KangurQuestionIllustration } from '@/shared/contracts/kangur-tests';
import { cn, sanitizeSvg } from '@/shared/utils';

/**
 * Renders a KangurQuestionIllustration (none | single | panels).
 * SVG content is sanitized before injection so only safe vector markup renders.
 */
type Props = {
  illustration: KangurQuestionIllustration;
  className?: string;
};

export function renderKangurQuestionIllustration(
  illustration: KangurQuestionIllustration,
  className?: string
): React.JSX.Element | null {
  if (illustration.type === 'none') return null;

  if (illustration.type === 'single') {
    if (!illustration.svgContent?.trim()) return null;
    return (
      <KangurMediaFrame
        className={cn('mx-auto max-w-sm', className)}
        data-testid='kangur-illustration-single-frame'
        mediaType='svg'
        padding='sm'
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(illustration.svgContent) }}
      />
    );
  }

  // panels
  const { layout, panels } = illustration;

  const containerClass =
    layout === 'grid-2x2'
      ? 'grid grid-cols-1 gap-3 min-[360px]:grid-cols-2'
      : layout === 'grid-3x2'
        ? 'grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3'
        : 'flex flex-wrap justify-center gap-3';

  return (
    <div className={cn(containerClass, className)}>
      {panels.map((panel) => (
        <figure key={panel.id} className='flex flex-col items-center gap-1'>
          {panel.label ? (
            <figcaption>
              <KangurStatusChip
                accent='slate'
                className='min-w-[1.75rem] justify-center px-2'
                data-testid={`kangur-illustration-panel-label-${panel.id}`}
                size='sm'
              >
                {panel.label}
              </KangurStatusChip>
            </figcaption>
          ) : null}
          {panel.svgContent.trim() ? (
            <KangurMediaFrame
              className='h-20 w-20'
              data-testid={`kangur-illustration-panel-frame-${panel.id}`}
              mediaType='svg'
              padding='sm'
              title={panel.description}
              aria-label={panel.description || `Panel ${panel.label}`}
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(panel.svgContent) }}
            />
          ) : (
            <KangurMediaFrame
              className='flex h-20 w-20 items-center justify-center text-slate-400'
              data-testid={`kangur-illustration-panel-placeholder-${panel.id}`}
              dashed
              padding='sm'
              accent='slate'
            >
              ?
            </KangurMediaFrame>
          )}
        </figure>
      ))}
    </div>
  );
}

export function KangurQuestionIllustrationRenderer({
  illustration,
  className,
}: Props): React.JSX.Element | null {
  return renderKangurQuestionIllustration(illustration, className);
}
