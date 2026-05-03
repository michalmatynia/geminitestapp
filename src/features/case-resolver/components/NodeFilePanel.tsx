'use client';

import { ScanLine, FileText, ExternalLink } from 'lucide-react';
import React from 'react';

import { Card, Button } from '@/shared/ui/primitives.public';
import { PanelHeader } from '@/shared/ui/templates.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';

import { resolveContentPreview } from './CaseResolverNodeFileUtils';
import {
  useNodeFileWorkspaceActionsContext,
  useNodeFileWorkspaceStateContext,
} from './NodeFileWorkspaceContext';

export function NodeFilePanel(): React.JSX.Element | null {
  const { selectedNodeFileMeta, selectedFile } = useNodeFileWorkspaceStateContext();
  const { onSelectFile } = useNodeFileWorkspaceActionsContext();
  const meta = selectedNodeFileMeta;
  const file = selectedFile;

  if (!meta) return null;

  const preview = file ? resolveContentPreview(file) : '';
  const typeLabel = meta.fileType === 'scanfile' ? 'Scan File' : 'Document';
  const TypeIcon = meta.fileType === 'scanfile' ? ScanLine : FileText;

  return (
    <Card
      variant='glass'
      padding='none'
      className='flex w-80 flex-shrink-0 flex-col gap-3 overflow-y-auto border-border/60 bg-card/20 p-4'
    >
      <PanelHeader
        title={meta.fileName}
        subtitle={typeLabel}
        icon={<TypeIcon className='size-4 text-gray-400' />}
        refreshable={false}
        compact
      />

      {/* Content preview */}
      {file ? (
        <div className='flex flex-col gap-1'>
          <p className='text-[10px] uppercase tracking-wide text-gray-500'>Content preview</p>
          {preview !== '' ? (
            <Card
              variant='subtle-compact'
              padding='sm'
              className='max-h-52 overflow-y-auto border-border/60 bg-card/30 text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap'
            >
              {preview}
            </Card>
          ) : (
            <Hint size='xs' italic className='text-[11px]'>
              No text content yet.
            </Hint>
          )}
        </div>
      ) : (
        <p className='text-[11px] text-amber-400'>File no longer exists in this workspace.</p>
      )}

      {/* Open button */}
      {file ? (
        <Button
          type='button'
          onClick={() => onSelectFile(file.id)}
          variant='outline'
          size='sm'
          className='h-8 w-full'
        >
          <ExternalLink className='mr-1.5 size-3.5' />
          Open &ldquo;{meta.fileName}&rdquo;
        </Button>
      ) : null}
    </Card>
  );
}
