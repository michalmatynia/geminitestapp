import React from 'react';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Badge } from '@/shared/ui/primitives.public';
import { MetadataItem, UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { formatDateTime, formatFileSize } from '@/shared/utils/formatting';

export const AssetMetadataGrid = ({ asset }: { asset: Asset3DRecord }): React.JSX.Element => (
  <div className={`${UI_GRID_RELAXED_CLASSNAME} sm:grid-cols-2 lg:grid-cols-3`}>
    <MetadataItem label='Size' value={formatFileSize(asset.size ?? 0)} />
    <MetadataItem label='MIME Type' value={asset.mimetype ?? '—'} />
    <MetadataItem
      label='Visibility'
      value={
        <StatusBadge
          status={asset.isPublic ? 'Public' : 'Private'}
          variant={asset.isPublic ? 'success' : 'neutral'}
          size='sm'
        />
      }
    />
    <MetadataItem label='Category' value={asset.categoryId ?? '—'} />
    <MetadataItem
      label='Added'
      value={formatDateTime(asset.createdAt)}
      valueClassName='text-xs text-gray-400'
    />
    <MetadataItem
      label='Last Modified'
      value={formatDateTime(asset.updatedAt)}
      valueClassName='text-xs text-gray-400'
    />
  </div>
);

export const AssetTags = ({ tags }: { tags: string[] }): React.JSX.Element => (
  <div className='flex flex-wrap gap-2'>
    {tags.map((tag) => (
      <Badge key={tag} variant='secondary' className='text-[10px]'>
        {tag}
      </Badge>
    ))}
  </div>
);
