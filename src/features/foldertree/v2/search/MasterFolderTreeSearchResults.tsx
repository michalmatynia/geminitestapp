'use client';

import React from 'react';
import { FileText, Folder, FolderOpen, ScanText } from 'lucide-react';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type { MasterFolderTreeSearchResult } from './useMasterFolderTreeSearch';
import { Button } from '@/shared/ui';

export type MasterFolderTreeSearchResultsProps = {
  results: MasterFolderTreeSearchResult[];
  onSelect: (node: MasterTreeNode) => void;
  query?: string | undefined;
  emptyLabel?: string | undefined;
};

function resolveNodeIcon(node: MasterTreeNode): React.ComponentType<{ className?: string }> {
  if (node.kind === 'case_entry') return FolderOpen;
  if (node.kind === 'case_file_scan') return ScanText;
  if (node.type === 'folder') return Folder;
  return FileText;
}

export function MasterFolderTreeSearchResults({
  results,
  onSelect,
  query = '',
  emptyLabel,
}: MasterFolderTreeSearchResultsProps): React.JSX.Element {
  if (results.length === 0) {
    return (
      <div className='flex items-center justify-center px-3 py-6 text-[12px] text-muted-foreground/60'>
        {emptyLabel ?? (query ? `No results for "${query}"` : 'No results')}
      </div>
    );
  }

  return (
    <div className='flex flex-col overflow-auto'>
      {results.map(({ node }: MasterFolderTreeSearchResult): React.JSX.Element => {
        const Icon = resolveNodeIcon(node);
        const pathSegments = node.path.split('/');
        const breadcrumb = pathSegments.length > 1 ? pathSegments.slice(0, -1).join(' / ') : null;

        return (
          <Button
            key={node.id}
            variant='ghost'
            onClick={(): void => onSelect(node)}
            className='flex h-auto w-full items-start justify-start gap-2 rounded-none px-3 py-1.5 text-left font-normal hover:bg-muted/30 active:bg-muted/50 transition-colors'
          >
            <Icon className='mt-0.5 size-3.5 shrink-0 text-muted-foreground/70' />
            <div className='min-w-0 flex-1'>
              <div className='truncate text-[12px] font-medium text-gray-200'>{node.name}</div>
              {breadcrumb && (
                <div className='truncate text-[10px] text-muted-foreground/60'>{breadcrumb}</div>
              )}
            </div>
          </Button>
        );
      })}
    </div>
  );
}
