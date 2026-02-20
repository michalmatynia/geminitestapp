'use client';

import React from 'react';
import { Button, Alert } from '@/shared/ui';
import { useProductImageManagerUI } from './ProductImageManagerUIContext';

export function ProductImageManagerHeader({ minimalUi }: { minimalUi: boolean }) {
  const { 
    showDebug, 
    setShowDebug, 
    debugInfo, 
    controller, 
    convertAllSlotsToBase64 
  } = useProductImageManagerUI();
  
  const { imageSlots, uploadError } = controller;

  if (minimalUi) {
    return uploadError ? (
      <Alert variant='error' className='mb-2 p-2 text-[11px]'>
        {uploadError}
      </Alert>
    ) : null;
  }

  return (
    <>
      <div className='mb-3 flex items-center justify-between'>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-400'>Image slots</span>
            {imageSlots.length > 1 && (
              <span className='text-xs text-gray-500'>(drag to reorder)</span>
            )}
          </div>
          <span className='text-[11px] text-gray-500'>
            Image host is configured globally in Product Settings - Images.
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {imageSlots.length > 1 && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void convertAllSlotsToBase64()}
              className='h-7 px-2 text-xs'
            >
              Convert All to Base64
            </Button>
          )}
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => setShowDebug(!showDebug)}
            className='h-7 px-2 text-xs'
          >
            {showDebug ? 'Hide debug' : 'Show debug'}
          </Button>
        </div>
      </div>

      {showDebug && (uploadError || debugInfo) && (
        <Alert variant='error' className='mb-3 p-3 text-xs'>
          {uploadError && <div>Upload error: {uploadError}</div>}
          {debugInfo && (
            <div className='space-y-1 mt-2'>
              <div>Debug: {debugInfo.action} — {debugInfo.message}</div>
              <div className='text-[11px] text-red-300/80'>
                {debugInfo.timestamp}
                {debugInfo.slotIndex !== undefined ? ` · slot ${debugInfo.slotIndex + 1}` : ''}
                {debugInfo.filename ? ` · ${debugInfo.filename}` : ''}
              </div>
            </div>
          )}
        </Alert>
      )}
    </>
  );
}
