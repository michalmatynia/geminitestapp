import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { cn } from '@/shared/utils/ui-utils';

import { renderFilemakerMailCountBadge as renderCountBadge } from './FilemakerMailSidebar.helpers';
import type {
  FilemakerMailSidebarNodeModel,
  FilemakerMailSidebarNodeSecondaryLabel,
} from './FilemakerMailSidebarNode.model';

type FilemakerMailSidebarNodeViewProps = {
  input: FolderTreeViewportRenderNodeInput;
  model: FilemakerMailSidebarNodeModel;
  onClick: () => void;
};

const NodeExpandControl = ({
  input,
}: {
  input: FolderTreeViewportRenderNodeInput;
}): React.JSX.Element => {
  if (!input.hasChildren) {
    return <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>;
  }
  return (
    <span
      aria-hidden='true'
      onClick={(event: React.MouseEvent<HTMLSpanElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        input.toggleExpand();
      }}
      className='inline-flex size-4 items-center justify-center rounded hover:bg-white/5'
    >
      {input.isExpanded ? '▾' : '▸'}
    </span>
  );
};

const NodeSecondaryLabel = ({
  label,
}: {
  label: FilemakerMailSidebarNodeSecondaryLabel;
}): React.JSX.Element => (
  <span className={cn('block truncate text-[11px]', label.className)}>{label.text}</span>
);

const NodeCountBadges = ({
  model,
}: {
  model: FilemakerMailSidebarNodeModel;
}): React.JSX.Element => (
  <>
    {model.messageCount > 0 ? renderCountBadge('', model.messageCount) : null}
    {model.threadCount > 0 ? renderCountBadge('', model.threadCount) : null}
    {model.unreadCount > 0 ? renderCountBadge('', model.unreadCount, 'accent') : null}
  </>
);

export const FilemakerMailSidebarNodeView = ({
  input,
  model,
  onClick,
}: FilemakerMailSidebarNodeViewProps): React.JSX.Element => {
  const Icon = model.icon;
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition',
        input.isSelected
          ? 'bg-sky-500/15 text-white ring-1 ring-inset ring-sky-400/40'
          : 'text-gray-300 hover:bg-white/5'
      )}
      style={{ paddingLeft: `${input.depth * 16 + 8}px` }}
    >
      <NodeExpandControl input={input} />
      <Icon className='size-4 shrink-0 text-gray-400' />
      <span className='min-w-0 flex-1'>
        <span className='block truncate'>{model.nodeLabel}</span>
        {model.secondaryLabels.map((label) => (
          <NodeSecondaryLabel key={`${label.className}:${label.text}`} label={label} />
        ))}
      </span>
      <NodeCountBadges model={model} />
    </button>
  );
};
