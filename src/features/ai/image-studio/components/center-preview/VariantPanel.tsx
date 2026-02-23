import { Eye, Trash2 } from 'lucide-react';
import React from 'react';

import { Button, Input, Card, Badge, Alert, LoadingState } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useVariantPanelContext } from './VariantPanelContext';

export function VariantPanel(): React.JSX.Element {
  const {
    activeRunError,
    activeVariantId,
    compareVariantA,
    compareVariantB,
    compareVariantIds,
    deletePending,
    filteredVariantThumbnails,
    variantLoadingId,
    variantTimestampQuery,
    visibleVariantThumbnails,
    onClearCompare,
    onDeleteVariant,
    onDismissRunError,
    onLoadVariantToCanvas,
    onOpenVariantDetails,
    onSetCompareVariantA,
    onSetCompareVariantB,
    onVariantTimestampQueryChange,
    onVariantTooltipLeave,
    onVariantTooltipMove,
  } = useVariantPanelContext();

  return (
    <Card variant='subtle-compact' padding='sm' className='h-full shrink-0 overflow-hidden bg-card/40'>
      <div className='mb-2 flex items-center gap-2'>
        <Input size='sm'
          value={variantTimestampQuery}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onVariantTimestampQueryChange(event.target.value);
          }}
          placeholder='Search variants by timestamp'
          className='h-8 text-xs'
          aria-label='Search generated variants by timestamp'
        />
        <span className='shrink-0 text-[11px] text-gray-400'>
          {filteredVariantThumbnails.length}/{visibleVariantThumbnails.length}
        </span>
      </div>
      <div className='mb-2 flex items-center gap-2 text-[11px] text-gray-400'>
        <span>Compare in canvas:</span>
        <Badge
          variant={compareVariantA ? 'active' : 'neutral'}
          className={cn('px-1.5 py-0.5 text-[10px]', compareVariantA ? 'border-cyan-400/60 text-cyan-200' : 'border-border/60')}
        >
          1 {compareVariantA ? `#${compareVariantA.index}` : 'unset'}
        </Badge>
        <Badge
          variant={compareVariantB ? 'warning' : 'neutral'}
          className={cn('px-1.5 py-0.5 text-[10px]', compareVariantB ? 'border-amber-400/60 text-amber-200' : 'border-border/60')}
        >
          2 {compareVariantB ? `#${compareVariantB.index}` : 'unset'}
        </Badge>
        <Button
          size='xs'
          type='button'
          variant='ghost'
          onClick={onClearCompare}
          className='h-6 px-2 text-[10px] text-gray-300'
        >
          Clear
        </Button>
      </div>
      <div className='overflow-x-auto overflow-y-hidden pb-1 pr-1'>
        {filteredVariantThumbnails.length > 0 ? (
          <div className='flex w-max min-w-full gap-2'>
            {filteredVariantThumbnails.map((variant) => {
              const isActive = activeVariantId === variant.id;
              const canDeleteVariant =
                variant.status !== 'pending' &&
                (variant.status === 'failed' || Boolean(variant.output) || Boolean(variant.slotId));
              const statusClasses =
                variant.status === 'completed'
                  ? 'border-border/60 bg-card/30'
                  : variant.status === 'failed'
                    ? 'border-red-400/40 bg-red-500/5'
                    : 'border-border/60 bg-card/30';
              const activeClasses = isActive
                ? 'border-sky-400/80 bg-sky-500/15 ring-2 ring-sky-400/70'
                : '';
              const isCompareA = compareVariantIds[0] === variant.id;
              const isCompareB = compareVariantIds[1] === variant.id;
              const compareClasses = isCompareA
                ? 'ring-2 ring-cyan-400/70'
                : isCompareB
                  ? 'ring-2 ring-amber-400/70'
                  : '';

              return (
                <div key={variant.id} className='w-28 shrink-0'>
                  <button
                    type='button'
                    onClick={(): void => {
                      void onLoadVariantToCanvas(variant);
                    }}
                    onMouseEnter={(event): void => onVariantTooltipMove(event, variant)}
                    onMouseMove={(event): void => onVariantTooltipMove(event, variant)}
                    onMouseLeave={onVariantTooltipLeave}
                    onBlur={onVariantTooltipLeave}
                    disabled={!variant.output || variantLoadingId === variant.id}
                    aria-pressed={isActive}
                    className={`group relative w-full overflow-hidden rounded border p-1 text-left transition ${statusClasses} ${activeClasses} ${compareClasses}`}
                  >
                    <div className='mb-1 text-[10px] text-gray-400'>Variant {variant.index}</div>
                    {variant.output ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={variant.imageSrc || variant.output.filepath}
                        alt={variant.output.filename || `Generated ${variant.index}`}
                        className='h-20 w-full rounded object-cover'
                      />
                    ) : (
                      <Card variant='subtle-compact' padding='none' className='flex h-20 w-full items-center justify-center border-dashed border-border/70 text-[10px] text-gray-500'>
                        {variant.status === 'pending' ? (
                          <LoadingState message='Waiting' size='xs' />
                        ) : (
                          <span>Failed</span>
                        )}
                      </Card>
                    )}
                  </button>
                  <div className='mt-1 flex items-center justify-between gap-1'>
                    <div className='flex items-center gap-1'>
                      <Button
                        size='xs'
                        type='button'
                        variant='ghost'
                        onClick={(): void => onSetCompareVariantA(variant.id)}
                        title='Set as compare thumbnail 1'
                        aria-pressed={isCompareA}
                        className={cn('size-5 rounded bg-black/65 px-0 text-[10px] text-cyan-200 hover:bg-cyan-500/20 hover:text-cyan-100', isCompareA && 'bg-cyan-500/30 text-cyan-100')}
                      >
                        1
                      </Button>
                      <Button
                        size='xs'
                        type='button'
                        variant='ghost'
                        onClick={(): void => onSetCompareVariantB(variant.id)}
                        title='Set as compare thumbnail 2'
                        aria-pressed={isCompareB}
                        className={cn('size-5 rounded bg-black/65 px-0 text-[10px] text-amber-200 hover:bg-amber-500/20 hover:text-amber-100', isCompareB && 'bg-amber-500/30 text-amber-100')}
                      >
                        2
                      </Button>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Button
                        size='xs'
                        type='button'
                        variant='ghost'
                        onClick={(): void => onOpenVariantDetails(variant)}
                        aria-label={`View variant ${variant.index} details`}
                        title='View variant details'
                        className='size-6 rounded bg-black/65 hover:bg-blue-500/20'
                      >
                        <Eye className='size-4 shrink-0 stroke-[2.25] text-blue-200' />
                      </Button>
                      {canDeleteVariant ? (
                        <Button
                          size='xs'
                          type='button'
                          variant='ghost'
                          onClick={(): void => onDeleteVariant(variant)}
                          disabled={deletePending}
                          aria-label={`Delete variant ${variant.index}`}
                          title='Delete variant'
                          className='size-6 rounded bg-black/65 hover:bg-red-500/20'
                        >
                          <Trash2 className='size-4 shrink-0 stroke-[2.25] text-red-200' />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : visibleVariantThumbnails.length > 0 ? (
          <div className='px-2 py-3 text-xs text-gray-500'>
            No variants match this timestamp search.
          </div>
        ) : (
          <div className='px-2 py-3 text-xs text-gray-500'>
            Start generation to prepare output slots under the canvas.
          </div>
        )}
        {activeRunError ? (
          <Alert variant='error' className='mt-2 p-2'>
            <div className='flex items-start justify-between gap-2'>
              <div className='text-[11px]'>{activeRunError}</div>
              <Button
                type='button'
                size='xs'
                variant='ghost'
                className='h-6 shrink-0 px-2 text-[10px] text-red-200 hover:text-red-100'
                onClick={onDismissRunError}
              >
                Dismiss
              </Button>
            </div>
          </Alert>
        ) : null}
      </div>
    </Card>
  );
}
