'use client';

import { RotateCcw, RotateCw, ExternalLink, Monitor, Check } from 'lucide-react';
import React from 'react';

import { useProductStudioContext } from '@/features/products/context/ProductStudioContext';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { StatusBadge } from '@/shared/ui/status-badge';

export function StudioActionsBar(): React.JSX.Element {
  const {
    handleRotateImageSlot,
    handleOpenInImageStudio,
    handleSendToStudio,
    handleAcceptVariant,
    refreshVariants,
    sending,
    accepting,
    openingInImageStudio,
    rotatingDirection,
    selectedImageIndex,
    selectedSourcePreview,
    selectedVariant,
    variantsLoading,
    runStatus,
    studioActionError,
    sequenceReadinessMessage,
    blockSendForSequenceReadiness,
  } = useProductStudioContext();

  const isDisabled =
    sending ||
    accepting ||
    rotatingDirection !== null ||
    selectedImageIndex === null ||
    !selectedSourcePreview;

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          size='xs'
          variant='outline'
          onClick={() => void handleRotateImageSlot('left')}
          disabled={isDisabled}
          loading={rotatingDirection === 'left'}
        >
          <RotateCcw className='mr-2 size-4' /> Rotate Left
        </Button>

        <Button
          size='xs'
          variant='outline'
          onClick={() => void handleRotateImageSlot('right')}
          disabled={isDisabled}
          loading={rotatingDirection === 'right'}
        >
          <RotateCw className='mr-2 size-4' /> Rotate Right
        </Button>

        <Button
          size='xs'
          variant='outline'
          onClick={() => void handleOpenInImageStudio()}
          disabled={openingInImageStudio || isDisabled}
          loading={openingInImageStudio}
        >
          <ExternalLink className='mr-2 size-4' /> Open In Image Studio
        </Button>

        <Button
          size='xs'
          onClick={() => void handleSendToStudio()}
          disabled={openingInImageStudio || blockSendForSequenceReadiness || isDisabled}
          loading={sending}
        >
          <Monitor className='mr-2 size-4' /> Send To Studio
        </Button>

        <Button
          size='xs'
          onClick={() => void handleAcceptVariant()}
          disabled={!selectedVariant || accepting || sending || openingInImageStudio}
          variant='outline'
          className='border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
          loading={accepting}
        >
          <Check className='mr-2 size-4' /> Accept Variant
        </Button>

        <Button
          size='xs'
          variant='outline'
          onClick={() => void refreshVariants()}
          disabled={variantsLoading || sending || accepting}
          loading={variantsLoading}
        >
          Refresh Variants
        </Button>

        {runStatus && (
          <StatusBadge status={`Run status: ${  runStatus}`} variant='processing' size='sm' />
        )}
        <StatusBadge status='Active' variant='success' size='sm' />
      </div>

      {studioActionError && (
        <Alert variant='error' className='py-2 text-xs'>
          {studioActionError}
        </Alert>
      )}
      {sequenceReadinessMessage && (
        <Alert variant='warning' className='py-2 text-xs'>
          {sequenceReadinessMessage}
        </Alert>
      )}
    </div>
  );
}
