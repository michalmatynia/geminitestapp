'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  FolderTreeViewportV2,
  useFolderTreeInstanceV2,
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
  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<{
    instanceIds: string;
    focusedInstance: string;
  }>({
    instanceIds: '',
    focusedInstance: '',
  });
  const [keyboardDispatchCount, setKeyboardDispatchCount] = useState(0);
  const [lastKeyboardKey, setLastKeyboardKey] = useState('');

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      setKeyboardDispatchCount((value) => value + 1);
      setLastKeyboardKey(event.key);
      const current = controllerRef.current;
      const orderedNodeIds = current.nodes.map((node) => node.id);
      const selectedNodeId = current.selectedNodeId;
      const selectedIndex = selectedNodeId ? orderedNodeIds.indexOf(selectedNodeId) : -1;

      if (event.key === 'ArrowDown') {
        const nextNodeId = orderedNodeIds[selectedIndex + 1];
        if (!nextNodeId) return;
        event.preventDefault();
        current.selectNode(nextNodeId);
      } else if (event.key === 'ArrowUp') {
        const previousNodeId = orderedNodeIds[selectedIndex - 1];
        if (!previousNodeId) return;
        event.preventDefault();
        current.selectNode(previousNodeId);
      }
    };

    return runtime.registerKeyboardHandler(instanceId, handler);
  }, [instanceId, runtime]);

  useEffect(() => {
    const updateSnapshot = (): void => {
      setRuntimeSnapshot({
        instanceIds: runtime.getInstanceIds().join(','),
        focusedInstance: runtime.getFocusedInstance() ?? '',
      });
    };
    updateSnapshot();
    const intervalId = window.setInterval(updateSnapshot, 50);
    return (): void => {
      window.clearInterval(intervalId);
    };
  }, [runtime]);

  useEffect(() => {
    controllerRef.current.selectNode(nodes[0]?.id ?? null);
    runtime.setFocusedInstance(instanceId);
  }, [instanceId, nodes, routeId, runtime]);

  useEffect(() => {
    if (!controller.selectedNodeId) return;
    runtime.setFocusedInstance(instanceId);
  }, [controller.selectedNodeId, instanceId, runtime]);

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
        onClick={(event): void => {
          input.select(event);
          runtime.setFocusedInstance(instanceId);
        }}
      >
        {input.node.name}
      </button>
    );
  };

  return (
    <div className='space-y-3'>
      <div
        data-testid='runtime-instance-ids'
        data-instance-ids={runtimeSnapshot.instanceIds}
        data-focused-instance={runtimeSnapshot.focusedInstance}
        data-keyboard-dispatch-count={String(keyboardDispatchCount)}
        data-last-keyboard-key={lastKeyboardKey}
        data-selected-node-id={controller.selectedNodeId ?? ''}
      >
        Runtime: {runtimeSnapshot.instanceIds || 'none'}
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
