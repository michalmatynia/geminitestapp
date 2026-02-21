'use client';

import React, { useMemo } from 'react';

import type { EntityModalProps } from '@/shared/contracts/ui';
import { Hint } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

import { readMeta } from '../utils/metadata';

import type { VersionNode } from '../context/VersionGraphContext';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

type VersionNodeDetailsModalProps = EntityModalProps<VersionNode> & {
  getSlotImageSrc: (slot: ImageStudioSlotRecord) => string | null;
};

type OperationSummary = {
  label: string;
  relationType: string;
  timestamp: string | null;
  operationMetadata: Record<string, unknown> | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return 'n/a';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatBytes = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

const formatResolution = (width: number | null | undefined, height: number | null | undefined): string => {
  if (!(typeof width === 'number' && Number.isFinite(width) && typeof height === 'number' && Number.isFinite(height))) {
    return 'n/a';
  }
  return `${width}x${height}`;
};

const resolveOperationSummary = (slot: ImageStudioSlotRecord): OperationSummary => {
  const metadata = asRecord(slot.metadata) ?? {};
  const relationType = asString(metadata['relationType'])?.toLowerCase() ?? '';

  const cropMeta = asRecord(metadata['crop']);
  const centerMeta = asRecord(metadata['center']);
  const upscaleMeta = asRecord(metadata['upscale']);
  const autoscaleMeta = asRecord(metadata['autoscale']);

  if (relationType.startsWith('crop:')) {
    return {
      label: 'Crop',
      relationType,
      timestamp: asString(cropMeta?.['timestamp']) ?? asString(metadata['timestamp']) ?? null,
      operationMetadata: cropMeta,
    };
  }
  if (relationType.startsWith('center:')) {
    return {
      label: 'Center',
      relationType,
      timestamp: asString(centerMeta?.['timestamp']) ?? asString(metadata['timestamp']) ?? null,
      operationMetadata: centerMeta,
    };
  }
  if (relationType.startsWith('upscale:')) {
    return {
      label: 'Upscale',
      relationType,
      timestamp: asString(upscaleMeta?.['timestamp']) ?? asString(metadata['timestamp']) ?? null,
      operationMetadata: upscaleMeta,
    };
  }
  if (relationType.startsWith('autoscale:')) {
    return {
      label: 'Auto Scaler',
      relationType,
      timestamp: asString(autoscaleMeta?.['timestamp']) ?? asString(metadata['timestamp']) ?? null,
      operationMetadata: autoscaleMeta,
    };
  }
  if (relationType.startsWith('mask:')) {
    return {
      label: 'Mask',
      relationType,
      timestamp: asString(metadata['attachedAt']) ?? null,
      operationMetadata: metadata,
    };
  }
  if (relationType.startsWith('merge:')) {
    return {
      label: 'Merge',
      relationType,
      timestamp: null,
      operationMetadata: metadata,
    };
  }
  if (relationType.startsWith('composite:')) {
    return {
      label: 'Composite',
      relationType,
      timestamp: null,
      operationMetadata: metadata,
    };
  }
  if (relationType.startsWith('generation:')) {
    return {
      label: 'Generation',
      relationType,
      timestamp: null,
      operationMetadata: metadata,
    };
  }

  const role = asString(metadata['role'])?.toLowerCase() ?? '';
  return {
    label: role ? role[0]?.toUpperCase() + role.slice(1) : 'Unknown',
    relationType: relationType || 'n/a',
    timestamp: null,
    operationMetadata: metadata,
  };
};

const DetailsGrid = ({ rows }: { rows: Array<{ label: string; value: string }> }): React.JSX.Element => (
  <div className='grid grid-cols-[150px_1fr] gap-x-3 gap-y-1 text-xs'>
    {rows.map((row) => (
      <React.Fragment key={row.label}>
        <div className='text-gray-500'>{row.label}</div>
        <div className='break-all text-gray-200'>{row.value || 'n/a'}</div>
      </React.Fragment>
    ))}
  </div>
);

export function VersionNodeDetailsModal({
  isOpen,
  item: node,
  onClose,
  getSlotImageSrc,
}: VersionNodeDetailsModalProps): React.JSX.Element {
  const content = useMemo(() => {
    if (!node) return null;

    const slot = node.slot;
    const metadata = readMeta(slot);
    const metadataRecord = asRecord(slot.metadata) ?? {};
    const operationSummary = resolveOperationSummary(slot);
    const imageSrc = getSlotImageSrc(slot);

    const generationParams = asRecord(metadataRecord['generationParams']);
    const generationRequest = asRecord(metadataRecord['generationRequest']);
    const generationSettings = asRecord(metadataRecord['generationSettings']);
    const outputFile = asRecord(metadataRecord['outputFile']);
    const maskData = asRecord(metadataRecord['maskData']);

    const sourceSlotIds = Array.isArray(metadata.sourceSlotIds)
      ? metadata.sourceSlotIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    const operationTimestamp =
      operationSummary.timestamp ??
      asString(generationParams?.['timestamp']) ??
      asString(generationRequest?.['timestamp']) ??
      asString(maskData?.['attachedAt']) ??
      slot.createdAt ??
      null;

    const imageFileRows = [
      { label: 'Image File ID', value: slot.imageFileId ?? 'n/a' },
      { label: 'Filename', value: slot.imageFile?.filename ?? asString(outputFile?.['filename']) ?? 'n/a' },
      { label: 'Filepath', value: slot.imageFile?.url ?? slot.imageUrl ?? asString(outputFile?.['filepath']) ?? 'n/a' },
      { label: 'Mime Type', value: slot.imageFile?.mimeType ?? asString(outputFile?.['mimetype']) ?? 'n/a' },
      {
        label: 'File Size',
        value: formatBytes(slot.imageFile?.size ?? asNumber(outputFile?.['size'])),
      },
      {
        label: 'Resolution',
        value: formatResolution(
          slot.imageFile?.width ?? asNumber(outputFile?.['width']),
          slot.imageFile?.height ?? asNumber(outputFile?.['height'])
        ),
      },
    ];

    const baseRows = [
      { label: 'Slot ID', value: slot.id },
      { label: 'Project', value: slot.projectId },
      { label: 'Name', value: slot.name ?? 'n/a' },
      { label: 'Folder', value: slot.folderPath ?? 'n/a' },
      { label: 'Node Type', value: node.type },
      { label: 'Operation', value: operationSummary.label },
      { label: 'Relation Type', value: operationSummary.relationType || 'n/a' },
      { label: 'Created At', value: formatDateTime(slot.createdAt) },
      { label: 'Updated At', value: formatDateTime(slot.updatedAt) },
      { label: 'Operation Timestamp', value: formatDateTime(operationTimestamp) },
      { label: 'Role', value: metadata.role ?? 'n/a' },
    ];

    const lineageRows = [
      { label: 'Primary Source Slot', value: metadata.sourceSlotId ?? 'n/a' },
      { label: 'Source Slot IDs', value: sourceSlotIds.length > 0 ? sourceSlotIds.join(', ') : 'n/a' },
      { label: 'Parent Node IDs', value: node.parentIds.length > 0 ? node.parentIds.join(', ') : 'n/a' },
      { label: 'Child Node IDs', value: node.childIds.length > 0 ? node.childIds.join(', ') : 'n/a' },
      { label: 'Descendant Count', value: String(node.descendantCount) },
    ];

    const promptRows = [
      { label: 'Model', value: asString(generationParams?.['model']) ?? 'n/a' },
      { label: 'Prompt', value: asString(generationParams?.['prompt']) ?? 'n/a' },
      { label: 'Run ID', value: asString(generationParams?.['runId']) ?? asString(metadataRecord['generationRunId']) ?? 'n/a' },
      { label: 'Output Index', value: String(asNumber(generationParams?.['outputIndex']) ?? asNumber(metadataRecord['generationOutputIndex']) ?? 'n/a') },
      { label: 'Output Count', value: String(asNumber(generationParams?.['outputCount']) ?? asNumber(metadataRecord['generationOutputCount']) ?? 'n/a') },
    ];

    const operationMetadataJson = JSON.stringify(operationSummary.operationMetadata ?? {}, null, 2);
    const metadataJson = JSON.stringify(metadataRecord, null, 2);
    const generationRequestJson = generationRequest ? JSON.stringify(generationRequest, null, 2) : null;
    const generationSettingsJson = generationSettings ? JSON.stringify(generationSettings, null, 2) : null;

    return (
      <div className='space-y-4 text-xs text-gray-200'>
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]'>
          <div className='rounded border border-border/60 bg-card/30 p-2'>
            <Hint size='xxs' uppercase className='text-gray-500'>Preview</Hint>
            <div className='mt-2 aspect-square overflow-hidden rounded border border-border/50 bg-black/30'>
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt={node.label}
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>No image</div>
              )}
            </div>
          </div>
          <div className='space-y-4'>
            <div className='rounded border border-border/60 bg-card/30 p-3'>
              <Hint size='xxs' uppercase className='mb-2 text-gray-500'>Node Summary</Hint>
              <DetailsGrid rows={baseRows} />
            </div>
            <div className='rounded border border-border/60 bg-card/30 p-3'>
              <Hint size='xxs' uppercase className='mb-2 text-gray-500'>Lineage</Hint>
              <DetailsGrid rows={lineageRows} />
            </div>
          </div>
        </div>

        <div className='rounded border border-border/60 bg-card/30 p-3'>
          <Hint size='xxs' uppercase className='mb-2 text-gray-500'>Image File</Hint>
          <DetailsGrid rows={imageFileRows} />
        </div>

        <div className='rounded border border-border/60 bg-card/30 p-3'>
          <Hint size='xxs' uppercase className='mb-2 text-gray-500'>Generation Info</Hint>
          <DetailsGrid rows={promptRows} />
        </div>

        <div className='rounded border border-border/60 bg-card/30 p-3'>
          <Hint size='xxs' uppercase className='mb-2 text-gray-500'>Operation Metadata</Hint>
          <pre className='max-h-48 overflow-auto rounded border border-border/40 bg-black/30 p-2 text-[11px] text-gray-100 whitespace-pre-wrap'>
            {operationMetadataJson}
          </pre>
        </div>

        {generationRequestJson ? (
          <div className='rounded border border-border/60 bg-card/30 p-3'>
            <Hint size='xxs' uppercase className='mb-2 text-gray-500'>Generation Request</Hint>
            <pre className='max-h-48 overflow-auto rounded border border-border/40 bg-black/30 p-2 text-[11px] text-gray-100 whitespace-pre-wrap'>
              {generationRequestJson}
            </pre>
          </div>
        ) : null}

        {generationSettingsJson ? (
          <div className='rounded border border-border/60 bg-card/30 p-3'>
            <Hint size='xxs' uppercase className='mb-2 text-gray-500'>Generation Settings</Hint>
            <pre className='max-h-48 overflow-auto rounded border border-border/40 bg-black/30 p-2 text-[11px] text-gray-100 whitespace-pre-wrap'>
              {generationSettingsJson}
            </pre>
          </div>
        ) : null}

        <div className='rounded border border-border/60 bg-card/30 p-3'>
          <Hint size='xxs' uppercase className='mb-2 text-gray-500'>Raw Metadata</Hint>
          <pre className='max-h-56 overflow-auto rounded border border-border/40 bg-black/30 p-2 text-[11px] text-gray-100 whitespace-pre-wrap'>
            {metadataJson}
          </pre>
        </div>
      </div>
    );
  }, [node, getSlotImageSrc]);

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={node ? `Node Details: ${node.label}` : 'Node Details'}
      size='lg'
    >
      {content ?? (
        <div className='text-sm text-gray-400'>No node selected.</div>
      )}
    </DetailModal>
  );
}
