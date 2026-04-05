'use client';

import { Download, RotateCcw, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';
import { useState } from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui/ui/modals';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Button } from '@/shared/ui/primitives.public';
import { DetailModal } from '@/shared/ui/templates/modals';
import { cn } from '@/shared/utils/ui-utils';
import { formatFileSize } from '@/shared/utils/formatting';

import {
  Asset3DPreviewModalViewProvider,
  useAsset3DPreviewModalViewContext,
} from './context/Asset3DPreviewModalViewContext';
import { Viewer3D } from './Viewer3D';
import { Viewer3DSettingsPanel } from './Viewer3DSettingsPanel';
import { Viewer3DStatusInfo } from './Viewer3DStatusInfo';
import { Viewer3DProvider, useViewer3DActions } from '../context/Viewer3DContext';

interface Asset3DPreviewModalProps extends EntityModalProps<Asset3DRecord> {}

function Asset3DPreviewModalContent(): React.JSX.Element {
  const { asset } = useAsset3DPreviewModalViewContext();
  const { resetSettings } = useViewer3DActions();

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // Validate asset exists and has valid file path
  const isValidAsset = !!asset?.filepath && !!asset?.id;
  const modelUrl = isValidAsset ? `/api/assets3d/${asset.id}/file` : null;

  return (
    <div className='flex flex-col min-h-0 h-[600px]'>
      {/* Main Content */}
      <div className='flex flex-1 min-h-0 relative'>
        {/* Viewer */}
        <div className={cn('flex-1 bg-black/40', showSettings ? 'lg:w-2/3' : 'w-full')}>
          {!isValidAsset ? (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center text-gray-400'>
                <p>Invalid asset</p>
                <p className='text-sm mt-2'>The 3D asset is missing or corrupted</p>
              </div>
            </div>
          ) : modelError ? (
            <div className='flex items-center justify-center h-full'>
              <div className='text-center text-red-400'>
                <p>Failed to load 3D model</p>
                <p className='text-sm mt-2 text-gray-400'>{modelError}</p>
              </div>
            </div>
          ) : (
            <Viewer3D
              modelUrl={modelUrl!}
              onLoad={() => {}}
              onError={(error: Error) => {
                setModelError(error.message);
              }}
              className='w-full h-full'
            />
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className='w-full lg:w-1/3 border-l border-border/60 bg-card/30 absolute right-0 top-0 bottom-0 z-10 lg:static'>
            <Viewer3DSettingsPanel />
          </div>
        )}
      </div>

      {/* Footer / Status */}
      <div className='border-t border-border/60 bg-muted/10 p-2 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={resetSettings}
            title='Reset settings'
            className='h-8 w-8 p-0'
            aria-label={'Reset settings'}>
            <RotateCcw className='h-4 w-4' />
          </Button>
          <Button
            variant={showSettings ? 'secondary' : 'ghost'}
            size='sm'
            onClick={() => setShowSettings(!showSettings)}
            className='h-8 text-xs'
          >
            <Settings2 className='h-3.5 w-3.5 mr-1.5' />
            Settings
            {showSettings ? (
              <ChevronUp className='h-3.5 w-3.5 ml-1.5' />
            ) : (
              <ChevronDown className='h-3.5 w-3.5 ml-1.5' />
            )}
          </Button>
        </div>
        <div className='flex items-center gap-2'>
          <a href={`/api/assets3d/${asset.id}/file`} download={asset.filename}>
            <Button variant='outline' size='sm' className='h-8 text-xs'>
              <Download className='h-3.5 w-3.5 mr-1.5' />
              Download
            </Button>
          </a>
        </div>
      </div>
      <Viewer3DStatusInfo />
    </div>
  );
}

export function Asset3DPreviewModal(props: Asset3DPreviewModalProps): React.JSX.Element | null {
  const { isOpen, onClose, item: asset } = props;

  if (!asset) return null;

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={asset.name || asset.filename}
      subtitle={formatFileSize(asset.size || 0)}
      size='xl'
    >
      {' '}
      <Viewer3DProvider>
        <Asset3DPreviewModalViewProvider value={{ asset }}>
          <Asset3DPreviewModalContent />
        </Asset3DPreviewModalViewProvider>
      </Viewer3DProvider>
    </DetailModal>
  );
}
