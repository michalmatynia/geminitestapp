import React from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui/modals';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Badge } from '@/shared/ui/primitives.public';
import { MetadataItem, UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { DetailModal, DetailModalSection } from '@/shared/ui/templates/modals';
import { formatDateTime, formatFileSize } from '@/shared/utils/formatting';

interface AssetPreviewModalProps extends EntityModalProps<Asset3DRecord> {}

export function AssetPreviewModal(props: AssetPreviewModalProps): React.JSX.Element | null {
  const { isOpen, onClose, item: previewAsset } = props;

  if (!previewAsset) return null;

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={previewAsset.name ?? previewAsset.filename}
      subtitle={previewAsset.filepath}
      size='lg'
    >
      <div className='space-y-6'>
        <div className={`${UI_GRID_RELAXED_CLASSNAME} sm:grid-cols-2 lg:grid-cols-3`}>
          <MetadataItem label='Size' value={formatFileSize(previewAsset.size)} />
          <MetadataItem label='MIME Type' value={previewAsset.mimetype} />
          <MetadataItem
            label='Visibility'
            value={
              <StatusBadge
                status={previewAsset.isPublic ? 'Public' : 'Private'}
                variant={previewAsset.isPublic ? 'success' : 'neutral'}
                size='sm'
              />
            }
          />
          <MetadataItem label='Category' value={previewAsset.categoryId ?? '—'} />
          <MetadataItem
            label='Added'
            value={formatDateTime(previewAsset.createdAt)}
            valueClassName='text-xs text-gray-400'
          />
          <MetadataItem
            label='Last Modified'
            value={formatDateTime(previewAsset.updatedAt)}
            valueClassName='text-xs text-gray-400'
          />
        </div>

        {(previewAsset.tags ?? []).length > 0 && (
          <DetailModalSection title='Tags'>
            <div className='flex flex-wrap gap-2'>
              {(previewAsset.tags ?? []).map((tag) => (
                <Badge key={tag} variant='secondary' className='text-[10px]'>
                  {tag}
                </Badge>
              ))}
            </div>
          </DetailModalSection>
        )}

        {previewAsset.description && (
          <DetailModalSection title='Description' className='border-border bg-card/30'>
            <p className='text-sm text-gray-300 leading-relaxed'>{previewAsset.description}</p>
          </DetailModalSection>
        )}

        <DetailModalSection title='System Metadata' className='border-border bg-gray-950'>
          <pre className='max-h-64 overflow-auto text-[11px] text-gray-400 font-mono leading-relaxed'>
            {JSON.stringify(previewAsset.metadata ?? {}, null, 2)}
          </pre>
        </DetailModalSection>
      </div>
    </DetailModal>
  );
}
