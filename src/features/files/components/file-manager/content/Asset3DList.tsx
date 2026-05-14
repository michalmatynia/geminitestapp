import React from 'react';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Button, Card, Tag } from '@/shared/ui/primitives.public';

export const Asset3DList = ({
  assets3d,
  onPreview,
}: {
  assets3d: Asset3DRecord[];
  onPreview: (asset: Asset3DRecord) => void;
}): React.JSX.Element => (
  <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'>
    {assets3d.map((asset) => (
      <Card key={asset.id} variant='subtle' padding='sm' className='border-border/60 bg-card/40'>
        <div className='text-xs uppercase tracking-wide text-gray-400'>3D Asset</div>
        <div className='mt-2 text-sm font-semibold text-white break-words'>{asset.name ?? asset.filename}</div>
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
          <Button variant='secondary' size='sm' onClick={() => onPreview(asset)}>View</Button>
        </div>
      </Card>
    ))}
  </div>
);
