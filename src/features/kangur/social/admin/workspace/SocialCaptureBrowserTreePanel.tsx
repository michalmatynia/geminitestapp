'use client';

import React from 'react';
import { Folder, FolderOpen, Image } from 'lucide-react';

import {
  FolderTreeSearchBar,
  FolderTreeViewportV2,
  type FolderTreeViewportRenderNodeInput,
} from '@/shared/lib/foldertree/public';
import { cn } from '@/shared/utils';
import {
  isSocialCaptureSlideNode,
  isSocialCaptureSectionNode,
} from '@/features/kangur/social/shared/social-capture-master-tree';
import {
  buildSlideKey,
} from '@/features/kangur/social/shared/social-capture-content-config';
import { PlaywrightEngineLogoButton } from '@/features/playwright/public';
import { PlaywrightEngineSettingsModal } from '@/features/playwright/public';
import type { SocialCaptureBrowserState } from './hooks/useSocialCaptureBrowserState';

type SlideStatusDotProps = {
  active: boolean;
  disabled: boolean;
};

function SlideStatusDot({ active, disabled }: SlideStatusDotProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-block h-1.5 w-1.5 rounded-full shrink-0',
        disabled
          ? 'bg-destructive/60'
          : active
            ? 'bg-emerald-500'
            : 'bg-muted-foreground/30'
      )}
      aria-hidden='true'
    />
  );
}

type Props = {
  state: SocialCaptureBrowserState;
};

export function SocialCaptureBrowserTreePanel({ state }: Props): React.JSX.Element {
  const { shell, search, searchQuery, setSearchQuery, slideMap } = state;
  const [engineModalOpen, setEngineModalOpen] = React.useState(false);

  const renderNode = React.useCallback(
    ({ node, isExpanded, isSelected }: FolderTreeViewportRenderNodeInput): React.ReactNode => {
      const isSlide = isSocialCaptureSlideNode(node.id);
      const isSection = isSocialCaptureSectionNode(node.id);

      let statusDot: React.ReactNode = null;
      if (isSlide) {
        const slideMetadata = node.metadata?.['socialCaptureSlide'] as
          | { componentId: string; sectionId: string; subsectionId: string | null }
          | undefined;
        if (slideMetadata) {
          const key = buildSlideKey(
            slideMetadata.componentId,
            slideMetadata.sectionId,
            slideMetadata.subsectionId
          );
          const entry = slideMap.get(key);
          statusDot = (
            <SlideStatusDot
              active={Boolean(entry && entry.sections.length > 0)}
              disabled={entry?.disabled === true}
            />
          );
        }
      }

      const IconEl = isSlide ? (
        <Image className='h-3 w-3 text-muted-foreground/60 shrink-0' />
      ) : isSection ? (
        isExpanded ? (
          <FolderOpen className='h-3.5 w-3.5 text-primary/70 shrink-0' />
        ) : (
          <Folder className='h-3.5 w-3.5 text-primary/70 shrink-0' />
        )
      ) : isExpanded ? (
        <FolderOpen className='h-3 w-3 text-muted-foreground/70 shrink-0' />
      ) : (
        <Folder className='h-3 w-3 text-muted-foreground/70 shrink-0' />
      );

      return (
        <div
          className={cn(
            'flex items-center gap-1.5 min-w-0 py-0.5 pr-1 text-xs',
            isSelected && 'font-medium',
            isSlide ? 'text-foreground/80' : 'text-foreground/90'
          )}
        >
          {IconEl}
          <span className='truncate flex-1'>{node.name}</span>
          {statusDot}
        </div>
      );
    },
    [slideMap]
  );

  return (
    <>
      <div className='relative flex flex-col gap-2 h-full min-h-0'>
        <FolderTreeSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder='Search lessons…'
        />
        <div className='flex-1 min-h-0 overflow-hidden rounded border border-border/40'>
          <FolderTreeViewportV2
            controller={shell.controller}
            renderNode={renderNode}
            searchState={search}
            emptyLabel={
              search.isActive
                ? 'No lessons match your search.'
                : 'No lesson sections configured.'
            }
            enableDnd={false}
            className='h-full'
          />
        </div>
        <PlaywrightEngineLogoButton onOpen={() => setEngineModalOpen(true)} />
      </div>
      <PlaywrightEngineSettingsModal
        open={engineModalOpen}
        onClose={() => setEngineModalOpen(false)}
      />
    </>
  );
}
