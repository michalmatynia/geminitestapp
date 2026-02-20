'use client';

import React from 'react';

import type { Asset3dDto as Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Tabs, TabsContent, TabsList, TabsTrigger, Button, Tag } from '@/shared/ui';

import { FileManagerGrid } from './FileManagerGrid';
import { useFileManager } from '../../contexts/FileManagerContext';

export function FileManagerContent(): React.JSX.Element {
  const {
    activeTab, setActiveTab,
    assets3d, setPreviewAsset,
  } = useFileManager();

  return (
    <Tabs value={activeTab} onValueChange={(value: string): void => setActiveTab(value as 'uploads' | 'links' | 'base64' | 'assets3d')}>
      <TabsList className='mb-4'>
        <TabsTrigger value='uploads'>Uploads</TabsTrigger>
        <TabsTrigger value='links'>Links</TabsTrigger>
        <TabsTrigger value='base64'>Base64</TabsTrigger>
        <TabsTrigger value='assets3d'>3D Assets</TabsTrigger>
      </TabsList>

      <TabsContent value='uploads'>
        <FileManagerGrid />
      </TabsContent>

      <TabsContent value='links'>
        <FileManagerGrid />
      </TabsContent>

      <TabsContent value='base64'>
        <FileManagerGrid />
      </TabsContent>

      <TabsContent value='assets3d'>
        <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'>
          {assets3d.map((asset: Asset3DRecord) => (
            <div key={asset.id} className='rounded-md border border-border/60 bg-gray-900/40 p-3'>
              <div className='text-xs uppercase tracking-wide text-gray-400'>3D Asset</div>
              <div className='mt-2 text-sm font-semibold text-white break-words'>{asset.name ?? asset.filename}</div>
              <div className='text-xs text-gray-400 break-words'>{asset.filename}</div>
              {(asset.tags ?? []).length > 0 && (
                <div className='mt-2 flex flex-wrap gap-1'>
                  {asset.tags.slice(0, 4).map((tag: string) => (
                    <Tag key={tag} label={`#${tag}`} className='text-[10px]' />
                  ))}
                </div>
              )}
              <div className='mt-3 flex items-center justify-between text-xs text-gray-400'>
                <span>{(asset.size / 1024).toFixed(1)} KB</span>
                {asset.categoryId && <span>{asset.categoryId}</span>}
              </div>
              <div className='mt-3 flex justify-end'>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={(): void => setPreviewAsset(asset)}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
