'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
import { FileManagerGrid } from './FileManagerGrid';
import { useFileManagerData, useFileManagerUIState } from '../../contexts/FileManagerContext';
import { Asset3DList } from './content/Asset3DList';

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
      <TabsList className='mb-4' aria-label='File manager source tabs'>
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
        <Asset3DList assets3d={assets3d} onPreview={setPreviewAsset} />
      </TabsContent>
    </Tabs>
  );
}
