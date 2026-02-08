'use client';

import {
  Download,
  X,
  RotateCcw,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';

import { AppModal, Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { Viewer3D } from './Viewer3D';
import { Viewer3DSettingsPanel } from './Viewer3DSettingsPanel';
import { Viewer3DStatusInfo } from './Viewer3DStatusInfo';
import { Viewer3DProvider, useViewer3D } from '../context/Viewer3DContext';

import type { Asset3DRecord } from '../types';

interface Asset3DPreviewModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset3DRecord;
}

function Asset3DPreviewModalContent({
  onClose,
  asset,
}: {
  onClose: () => void;
  asset: Asset3DRecord;
}): React.JSX.Element {
  const { resetSettings } = useViewer3D();

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // Validate asset exists and has valid file path
  const isValidAsset = asset && asset.filepath && asset.id;
  const modelUrl = isValidAsset ? `/api/assets3d/${asset.id}/file` : null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className='bg-gray-900 rounded-lg shadow-2xl w-[95vw] max-w-6xl border border-gray-700 flex flex-col max-h-[90vh]'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0'>
        <div className='flex-1 min-w-0'>
          <h2 className='text-lg font-semibold text-white truncate'>
            {asset.name || asset.filename}
          </h2>
          <p className='text-xs text-gray-400'>{formatFileSize(asset.size)}</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={resetSettings}
            title='Reset settings'
          >
            <RotateCcw className='h-4 w-4' />
          </Button>
          <Button
            variant={showSettings ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 className='h-4 w-4 mr-1' />
            Settings
            {showSettings ? (
              <ChevronUp className='h-4 w-4 ml-1' />
            ) : (
              <ChevronDown className='h-4 w-4 ml-1' />
            )}
          </Button>
          <a href={`/api/assets3d/${asset.id}/file`} download={asset.filename}>
            <Button variant='secondary' size='sm'>
              <Download className='h-4 w-4 mr-1' />
              Download
            </Button>
          </a>
          <Button variant='ghost' size='icon' onClick={onClose}>
            <X className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex flex-1 min-h-0'>
        {/* Viewer */}
        <div className={cn('flex-1 bg-gray-950', showSettings ? 'lg:w-2/3' : 'w-full')}>
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
              className='w-full h-[60vh]'
            />
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className='w-full lg:w-1/3 border-l border-gray-700 bg-gray-900/50'>
            <Viewer3DSettingsPanel />
          </div>
        )}
      </div>

      {/* Quick Actions Bar */}
      <Viewer3DStatusInfo />
    </div>
  );
}

export function Asset3DPreviewModal({
  open,
  onClose,
  asset,
}: Asset3DPreviewModalProps): React.JSX.Element {
  return (
    <AppModal open={open} onClose={onClose} title={asset.filename}>
      <Viewer3DProvider>
        <Asset3DPreviewModalContent onClose={onClose} asset={asset} />
      </Viewer3DProvider>
    </AppModal>
  );
}