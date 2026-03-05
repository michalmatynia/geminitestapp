'use client';

import React, { useEffect, useMemo, useState } from 'react';

import {
  FolderTreeViewportV2,
  useFolderTreeInstanceV2,
  useFolderTreeKeyboardNav,
  useFolderTreeShellRuntime,
} from '@/features/foldertree/v2';
import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

type RuntimeRouteId = 'alpha' | 'beta';

const createRouteNodes = (routeId: RuntimeRouteId): MasterTreeNode[] => [
  {
    id: `${routeId}-folder-a`,
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: `${routeId.toUpperCase()} Folder A`,
    path: `/${routeId}/folder-a`,
    sortOrder: 0,
  },
  {
    id: `${routeId}-folder-b`,
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: `${routeId.toUpperCase()} Folder B`,
    path: `/${routeId}/folder-b`,
    sortOrder: 1,
  },
  {
    id: `${routeId}-folder-c`,
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: `${routeId.toUpperCase()} Folder C`,
    path: `/${routeId}/folder-c`,
    sortOrder: 2,
  },
];

function RouteTreeHarness({
  routeId,
}: {
  routeId: RuntimeRouteId;
}): React.JSX.Element {
  const runtime = useFolderTreeShellRuntime();
  const instanceId = `preview_shell_${routeId}`;
  const nodes = useMemo(() => createRouteNodes(routeId), [routeId]);

  const controller = useFolderTreeInstanceV2({
    initialNodes: nodes,
    instanceId,
    runtime,
  });

  useFolderTreeKeyboardNav({
    controller,
    instanceId,
    keyboard: {
      enabled: true,
      arrowNavigation: true,
      enterToRename: true,
      deleteKey: false,
    },
    multiSelect: {
      enabled: false,
      ctrlClick: true,
      shiftClick: true,
      selectAll: true,
    },
    runtime,
  });

  useEffect(() => {
    controller.selectNode(nodes[0]?.id ?? null);
  }, [controller, nodes, routeId]);

  const renderNode = (input: FolderTreeViewportRenderNodeInput): React.ReactNode => {
    return (
      <button
        type='button'
        data-testid={`node-${input.node.id}`}
        data-selected={input.isSelected ? 'true' : 'false'}
        className={`w-full rounded px-2 py-1 text-left text-sm ${
          input.isSelected ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-300'
        }`}
        style={{ paddingLeft: `${input.depth * 16 + 8}px` }}
        onClick={(event): void => input.select(event)}
      >
        {input.node.name}
      </button>
    );
  };

  return (
    <div className='space-y-3'>
      <div
        data-testid='runtime-instance-ids'
        data-instance-ids={runtime.getInstanceIds().join(',')}
        data-focused-instance={runtime.getFocusedInstance() ?? ''}
      >
        Runtime: {runtime.getInstanceIds().join(',') || 'none'}
      </div>
      <FolderTreeViewportV2
        controller={controller}
        runtime={runtime}
        enableDnd={false}
        renderNode={renderNode}
      />
    </div>
  );
}

export default function FolderTreeShellRuntimePreviewPage(): React.JSX.Element {
  const [routeId, setRouteId] = useState<RuntimeRouteId>('alpha');

  return (
    <main className='mx-auto max-w-3xl space-y-4 p-6'>
      <h1 className='text-xl font-semibold'>Folder Tree Shell Runtime Lifecycle Preview</h1>
      <p className='text-sm text-muted-foreground'>
        Browser test harness for runtime focus, keyboard routing, and mount/unmount churn.
      </p>
      <div className='flex gap-2'>
        <button
          type='button'
          data-testid='route-alpha'
          onClick={(): void => setRouteId('alpha')}
          className='rounded border border-border px-3 py-1 text-sm'
        >
          Route Alpha
        </button>
        <button
          type='button'
          data-testid='route-beta'
          onClick={(): void => setRouteId('beta')}
          className='rounded border border-border px-3 py-1 text-sm'
        >
          Route Beta
        </button>
      </div>
      <RouteTreeHarness key={routeId} routeId={routeId} />
    </main>
  );
}
