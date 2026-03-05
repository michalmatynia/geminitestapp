'use client';

import React from 'react';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Tabs, TabsContent, TabsList, TabsTrigger, Button, Tag, Card } from '@/shared/ui';

import { useFileManagerData, useFileManagerUIState } from '../../contexts/FileManagerContext';
import { FileManagerGrid } from './FileManagerGrid';

export function FileManagerContent(): React.JSX.Element {
  const { activeTab, setActiveTab, setPreviewAsset } = useFileManagerUIState();
  const { assets3d } = useFileManagerData();

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value: string): void =>
        setActiveTab(value as 'uploads' | 'links' | 'base64' | 'assets3d')
      }
    >
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
            <Card
              key={asset.id}
              variant='subtle'
              padding='sm'
              className='border-border/60 bg-card/40'
            >
              <div className='text-xs uppercase tracking-wide text-gray-400'>3D Asset</div>
              <div className='mt-2 text-sm font-semibold text-white break-words'>
                {asset.name ?? asset.filename}
              </div>
              <div className='text-xs text-gray-400 break-words'>{asset.filename}</div>
              {(asset.tags ?? []).length > 0 && (
                <div className='mt-2 flex flex-wrap gap-1'>
                  {(asset.tags ?? []).slice(0, 4).map((tag: string) => (
                    <Tag key={tag} label={`#${tag}`} className='text-[10px]' />
                  ))}
                </div>
              )}
              <div className='mt-3 flex items-center justify-between text-xs text-gray-400'>
                <span>{((asset.size ?? 0) / 1024).toFixed(1)} KB</span>
                {asset.categoryId && <span>{asset.categoryId}</span>}
              </div>
              <div className='mt-3 flex justify-end'>
                <Button variant='secondary' size='sm' onClick={(): void => setPreviewAsset(asset)}>
                  View
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
