'use client';

import { useRouter } from 'nextjs-toploader/app';
import React, { memo, startTransition } from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { useToast } from '@/shared/ui/primitives.public';

import { handleFilemakerMailSidebarNodeClick } from './FilemakerMailSidebarNode.actions';
import { buildFilemakerMailSidebarNodeModel } from './FilemakerMailSidebarNode.model';
import { FilemakerMailSidebarNodeView } from './FilemakerMailSidebarNode.view';
import { useFilemakerMailSidebar } from './FilemakerMailSidebarContext';

function FilemakerMailSidebarNodeComponent({
  input,
}: {
  input: FolderTreeViewportRenderNodeInput;
}): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const context = useFilemakerMailSidebar();
  const model = buildFilemakerMailSidebarNodeModel({
    input,
    syncingAccountId: context.syncingAccountId,
    statusUpdatingAccountId: context.statusUpdatingAccountId,
  });
  const navigate = (href: string): void => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <FilemakerMailSidebarNodeView
      input={input}
      model={model}
      onClick={(): void => {
        handleFilemakerMailSidebarNodeClick({ context, model, navigate, toast });
      }}
    />
  );
}

export const FilemakerMailSidebarNode = memo(FilemakerMailSidebarNodeComponent);
