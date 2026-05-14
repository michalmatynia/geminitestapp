'use client';

import React from 'react';
import type { EntityModalProps } from '@/shared/contracts/ui/modals';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { DetailModal, DetailModalSection } from '@/shared/ui/templates/modals';
import { AssetMetadataGrid, AssetTags } from './asset-preview/AssetPreviewComponents';

interface AssetPreviewModalProps extends EntityModalProps<Asset3DRecord> {}

export function AssetPreviewModal(props: AssetPreviewModalProps): React.JSX.Element | null {
  const { isOpen, onClose, item: asset } = props;

  if (asset === null || asset === undefined) return null;

  const hasTags = (asset.tags?.length ?? 0) > 0;
  const hasDescription = (asset.description?.length ?? 0) > 0;

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={asset.name ?? asset.filename ?? 'Asset'}
      subtitle={asset.filepath ?? 'No path'}
      size='lg'
    >
      <div className='space-y-6'>
        <AssetMetadataGrid asset={asset} />

        {hasTags && (
          <DetailModalSection title='Tags'>
            <AssetTags tags={asset.tags ?? []} />
          </DetailModalSection>
        )}

        {hasDescription && (
          <DetailModalSection title='Description' className='border-border bg-card/30'>
            <p className='text-sm text-gray-300 leading-relaxed'>{asset.description}</p>
          </DetailModalSection>
        )}

        <DetailModalSection title='System Metadata' className='border-border bg-gray-950'>
          <pre className='max-h-64 overflow-auto text-[11px] text-gray-400 font-mono leading-relaxed'>
            {JSON.stringify(asset.metadata ?? {}, null, 2)}
          </pre>
        </DetailModalSection>
      </div>
    </DetailModal>
  );
}

