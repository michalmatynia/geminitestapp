'use client';

import { Download, RotateCcw, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';
import { useState } from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui/modals';
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

function Asset3DPreviewPlaceholder({
  title,
  description,
  tone = 'muted',
}: {
  title: string;
  description: string;
  tone?: 'muted' | 'error';
}): React.JSX.Element {
  return (
    <div className='flex h-full items-center justify-center'>
      <div className={cn('text-center', tone === 'error' ? 'text-red-400' : 'text-gray-400')}>
        <p>{title}</p>
        <p className='mt-2 text-sm text-gray-400'>{description}</p>
      </div>
    </div>
  );
}

function Asset3DPreviewViewer({
  modelUrl,
  modelError,
  showSettings,
  onError,
}: {
  modelUrl: string | null;
  modelError: string | null;
  showSettings: boolean;
  onError: (error: Error) => void;
}): React.JSX.Element {
  let content: React.JSX.Element;

  if (modelUrl === null) {
    content = (
      <Asset3DPreviewPlaceholder
        title='Invalid asset'
        description='The 3D asset is missing or corrupted'
      />
    );
  } else if (modelError !== null && modelError !== '') {
    content = (
      <Asset3DPreviewPlaceholder
        title='Failed to load 3D model'
        description={modelError}
        tone='error'
      />
    );
  } else {
    content = (
      <Viewer3D
        modelUrl={modelUrl}
        onLoad={() => {}}
        onError={onError}
        className='h-full w-full'
      />
    );
  }

  return <div className={cn('flex-1 bg-black/40', showSettings ? 'lg:w-2/3' : 'w-full')}>{content}</div>;
}

function Asset3DPreviewFooter({
  asset,
  showSettings,
  setShowSettings,
}: {
  asset: Asset3DRecord;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
}): React.JSX.Element {
  const { resetSettings } = useViewer3DActions();
  const filename = asset.filename ?? 'asset';

  return (
    <div className='flex items-center justify-between border-t border-border/60 bg-muted/10 p-2'>
      <div className='flex items-center gap-2'>
        <Button
          variant='ghost'
          size='sm'
          onClick={resetSettings}
          title='Reset settings'
          className='h-8 w-8 p-0'
          aria-label='Reset settings'
        >
          <RotateCcw className='h-4 w-4' />
        </Button>
        <Button
          variant={showSettings ? 'secondary' : 'ghost'}
          size='sm'
          onClick={() => setShowSettings((value) => !value)}
          className='h-8 text-xs'
        >
          <Settings2 className='mr-1.5 h-3.5 w-3.5' />
          Settings
          {showSettings ? (
            <ChevronUp className='ml-1.5 h-3.5 w-3.5' />
          ) : (
            <ChevronDown className='ml-1.5 h-3.5 w-3.5' />
          )}
        </Button>
      </div>
      <a href={`/api/assets3d/${asset.id}/file`} download={filename}>
        <Button variant='outline' size='sm' className='h-8 text-xs'>
          <Download className='mr-1.5 h-3.5 w-3.5' />
          Download
        </Button>
      </a>
    </div>
  );
}

function Asset3DPreviewModalContent(): React.JSX.Element {
  const { asset } = useAsset3DPreviewModalViewContext();

  const [showSettings, setShowSettings] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const filepath = asset.filepath ?? '';
  const modelUrl = filepath !== '' && asset.id !== '' ? `/api/assets3d/${asset.id}/file` : null;

  return (
    <div className='flex h-[600px] min-h-0 flex-col'>
      <div className='relative flex min-h-0 flex-1'>
        <Asset3DPreviewViewer
          modelUrl={modelUrl}
          modelError={modelError}
          showSettings={showSettings}
          onError={(error: Error) => setModelError(error.message)}
        />
        {showSettings && (
          <div className='w-full lg:w-1/3 border-l border-border/60 bg-card/30 absolute right-0 top-0 bottom-0 z-10 lg:static'>
            <Viewer3DSettingsPanel />
          </div>
        )}
      </div>

      <Asset3DPreviewFooter asset={asset} showSettings={showSettings} setShowSettings={setShowSettings} />
      <Viewer3DStatusInfo />
    </div>
  );
}

export function Asset3DPreviewModal(props: Asset3DPreviewModalProps): React.JSX.Element | null {
  const { isOpen, onClose, item: asset } = props;

  if (asset === null) return null;

  const title = asset.name !== '' ? asset.name : asset.filename ?? '3D asset';

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={formatFileSize(asset.size ?? 0)}
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
