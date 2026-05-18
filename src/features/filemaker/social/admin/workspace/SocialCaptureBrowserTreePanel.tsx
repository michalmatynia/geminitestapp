'use client';

import React from 'react';
import { Folder, FolderOpen, Image } from 'lucide-react';

import {
  FolderTreeSearchBar,
  MasterFolderTreeViewport,
  type FolderTreeViewportRenderNodeInput,
} from '@/shared/lib/foldertree/public';
import { cn } from '@/shared/utils/ui-utils';
import {
  isSocialCaptureSlideNode,
  isSocialCaptureSectionNode,
} from '@/features/filemaker/social/shared/social-capture-master-tree';
import {
  buildSlideKey,
} from '@/features/filemaker/social/shared/social-capture-content-config';
import { PlaywrightEngineLogoButton } from '@/features/playwright/components/PlaywrightEngineLogoButton';
import { PlaywrightEngineSettingsModal } from '@/features/playwright/components/PlaywrightEngineSettingsModal';
import { useSocialCaptureBrowser } from './SocialCaptureBrowserContext';

type SlideStatusDotProps = {
  active: boolean;
  disabled: boolean;
};

type SocialCaptureBrowserState = ReturnType<typeof useSocialCaptureBrowser>;
type SlideMap = SocialCaptureBrowserState['slideMap'];
type SlideMetadata = {
  componentId: string;
  sectionId: string;
  subsectionId: string | null;
};

const slideStatusDotClass = ({ active, disabled }: SlideStatusDotProps): string => {
  if (disabled) return 'bg-destructive/60';
  if (active) return 'bg-emerald-500';
  return 'bg-muted-foreground/30';
};

function SlideStatusDot({ active, disabled }: SlideStatusDotProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-block h-1.5 w-1.5 rounded-full shrink-0',
        slideStatusDotClass({ active, disabled })
      )}
      aria-hidden='true'
    />
  );
}

const getSlideMetadata = (
  input: FolderTreeViewportRenderNodeInput
): SlideMetadata | undefined =>
  input.node.metadata?.['socialCaptureSlide'] as SlideMetadata | undefined;

const renderStatusDot = (
  input: FolderTreeViewportRenderNodeInput,
  slideMap: SlideMap
): React.ReactNode => {
  if (!isSocialCaptureSlideNode(input.node.id)) return null;

  const slideMetadata = getSlideMetadata(input);
  if (slideMetadata === undefined) return null;

  const key = buildSlideKey(
    slideMetadata.componentId,
    slideMetadata.sectionId,
    slideMetadata.subsectionId
  );
  const entry = slideMap.get(key);
  return (
    <SlideStatusDot
      active={entry !== undefined && entry.sections.length > 0}
      disabled={entry?.disabled === true}
    />
  );
};

const renderFolderIcon = (isExpanded: boolean, className: string): React.JSX.Element => {
  if (isExpanded) return <FolderOpen className={className} />;
  return <Folder className={className} />;
};

const renderNodeIcon = (input: FolderTreeViewportRenderNodeInput): React.JSX.Element => {
  if (isSocialCaptureSlideNode(input.node.id)) {
    return <Image className='h-3 w-3 text-muted-foreground/60 shrink-0' />;
  }
  if (isSocialCaptureSectionNode(input.node.id)) {
    return renderFolderIcon(input.isExpanded, 'h-3.5 w-3.5 text-primary/70 shrink-0');
  }
  return renderFolderIcon(input.isExpanded, 'h-3 w-3 text-muted-foreground/70 shrink-0');
};

function SocialCaptureTreeNode({
  input,
  slideMap,
}: {
  input: FolderTreeViewportRenderNodeInput;
  slideMap: SlideMap;
}): React.JSX.Element {
  const isSlide = isSocialCaptureSlideNode(input.node.id);

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 min-w-0 py-0.5 pr-1 text-xs',
        input.isSelected && 'font-medium',
        isSlide ? 'text-foreground/80' : 'text-foreground/90'
      )}
    >
      {renderNodeIcon(input)}
      <span className='truncate flex-1'>{input.node.name}</span>
      {renderStatusDot(input, slideMap)}
    </div>
  );
}

const getEmptyLabel = (isSearchActive: boolean): string => {
  if (isSearchActive) return 'No lessons match your search.';
  return 'No lesson sections configured.';
};

export function SocialCaptureBrowserTreePanel(): React.JSX.Element {
  const state = useSocialCaptureBrowser();
  const { tree, search, searchQuery, setSearchQuery, slideMap } = state;
  const [engineModalOpen, setEngineModalOpen] = React.useState(false);

  const renderNode = React.useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <SocialCaptureTreeNode input={input} slideMap={slideMap} />
    ),
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
          <MasterFolderTreeViewport
            tree={tree}
            renderNode={renderNode}
            emptyLabel={getEmptyLabel(search.isActive)}
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
