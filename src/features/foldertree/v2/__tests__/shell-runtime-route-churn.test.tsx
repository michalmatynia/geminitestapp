import { fireEvent, render, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useFolderTreeKeyboardNav } from '@/features/foldertree/v2/hooks/useFolderTreeKeyboardNav';
import { useFolderTreeInstanceV2 } from '@/features/foldertree/v2/hooks/useFolderTreeInstanceV2';
import {
  useFolderTreeShellRuntime,
  type MasterFolderTreeShellRuntime,
} from '@/features/foldertree/v2/shell/useFolderTreeShellRuntime';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const keyboardConfig = {
  enabled: true,
  arrowNavigation: true,
  enterToRename: true,
  deleteKey: true,
};

const multiSelectConfig = {
  enabled: false,
  ctrlClick: true,
  shiftClick: true,
  selectAll: true,
};

const initialNodes: MasterTreeNode[] = [
  {
    id: 'root-folder',
    type: 'folder',
    kind: 'folder',
    parentId: null,
    name: 'Root Folder',
    path: '/root-folder',
    sortOrder: 0,
  },
  {
    id: 'root-file',
    type: 'file',
    kind: 'file',
    parentId: null,
    name: 'Root File',
    path: '/root-file',
    sortOrder: 1,
  },
];

type RouteTreeHarnessProps = {
  instanceId: string;
  onDeleteRequest: (instanceId: string, nodeId: string) => void;
  onRuntime: (runtime: MasterFolderTreeShellRuntime) => void;
};

const RouteTreeHarness = ({
  instanceId,
  onDeleteRequest,
  onRuntime,
}: RouteTreeHarnessProps): React.JSX.Element => {
  const runtime = useFolderTreeShellRuntime();
  const controller = useFolderTreeInstanceV2({
    initialNodes,
    instanceId,
  });

  useFolderTreeKeyboardNav({
    controller,
    instanceId,
    keyboard: keyboardConfig,
    multiSelect: multiSelectConfig,
    onDeleteRequest: (nodeId): void => {
      onDeleteRequest(instanceId, nodeId);
    },
  });

  useEffect(() => {
    onRuntime(runtime);
  }, [onRuntime, runtime]);

  useEffect(() => {
    controller.selectNode('root-folder');
  }, [controller]);

  return <div data-testid={`route-tree-${instanceId}`}>{controller.selectedNodeId ?? 'none'}</div>;
};

describe('shared shell runtime route churn', () => {
  let runtimeRef: MasterFolderTreeShellRuntime | null = null;

  afterEach(async () => {
    if (!runtimeRef) return;
    await waitFor(() => {
      expect(runtimeRef?.getInstanceIds()).toEqual([]);
    });
    runtimeRef = null;
  });

  it('keeps runtime identity stable and clears stale instance registrations across route switches', async () => {
    const deleteEvents: Array<{ instanceId: string; nodeId: string }> = [];

    const onRuntime = (runtime: MasterFolderTreeShellRuntime): void => {
      runtimeRef = runtime;
    };

    const rendered = render(
      <RouteTreeHarness
        key='route-a'
        instanceId='route-a'
        onRuntime={onRuntime}
        onDeleteRequest={(instanceId, nodeId) => {
          deleteEvents.push({ instanceId, nodeId });
        }}
      />
    );

    await waitFor(() => {
      expect(runtimeRef?.getInstanceIds()).toContain('route-a');
      expect(runtimeRef?.getFocusedInstance()).toBe('route-a');
    });

    const runtimeA = runtimeRef;

    fireEvent.keyDown(window, { key: 'Delete' });

    await waitFor(() => {
      expect(deleteEvents).toEqual([{ instanceId: 'route-a', nodeId: 'root-folder' }]);
    });

    rendered.rerender(
      <RouteTreeHarness
        key='route-b'
        instanceId='route-b'
        onRuntime={onRuntime}
        onDeleteRequest={(instanceId, nodeId) => {
          deleteEvents.push({ instanceId, nodeId });
        }}
      />
    );

    await waitFor(() => {
      expect(runtimeRef).toBe(runtimeA);
      expect(runtimeRef?.getInstanceIds()).toContain('route-b');
      expect(runtimeRef?.getInstanceIds()).not.toContain('route-a');
      expect(runtimeRef?.getFocusedInstance()).toBe('route-b');
    });

    fireEvent.keyDown(window, { key: 'Delete' });

    await waitFor(() => {
      expect(deleteEvents).toEqual([
        { instanceId: 'route-a', nodeId: 'root-folder' },
        { instanceId: 'route-b', nodeId: 'root-folder' },
      ]);
    });

    rendered.unmount();
  });

  it('does not leak keyboard handlers under repeated cross-route mount/unmount churn', async () => {
    const deleteEvents: Array<{ instanceId: string; nodeId: string }> = [];
    const onRuntime = (runtime: MasterFolderTreeShellRuntime): void => {
      runtimeRef = runtime;
    };

    const rendered = render(
      <RouteTreeHarness
        key='route-0'
        instanceId='route-0'
        onRuntime={onRuntime}
        onDeleteRequest={(instanceId, nodeId) => {
          deleteEvents.push({ instanceId, nodeId });
        }}
      />
    );

    await waitFor(() => {
      expect(runtimeRef?.getInstanceIds()).toContain('route-0');
      expect(runtimeRef?.getFocusedInstance()).toBe('route-0');
    });

    fireEvent.keyDown(window, { key: 'Delete' });

    for (let index = 1; index <= 20; index += 1) {
      const previousId = `route-${index - 1}`;
      const nextId = `route-${index}`;

      rendered.rerender(
        <RouteTreeHarness
          key={nextId}
          instanceId={nextId}
          onRuntime={onRuntime}
          onDeleteRequest={(instanceId, nodeId) => {
            deleteEvents.push({ instanceId, nodeId });
          }}
        />
      );

      await waitFor(() => {
        expect(runtimeRef?.getInstanceIds()).toContain(nextId);
        expect(runtimeRef?.getInstanceIds()).not.toContain(previousId);
        expect(runtimeRef?.getFocusedInstance()).toBe(nextId);
      });

      fireEvent.keyDown(window, { key: 'Delete' });
    }

    await waitFor(() => {
      expect(deleteEvents).toHaveLength(21);
      expect(deleteEvents.map((event) => event.instanceId)).toEqual(
        Array.from({ length: 21 }, (_, index) => `route-${index}`)
      );
      expect(deleteEvents.every((event) => event.nodeId === 'root-folder')).toBe(true);
    });

    rendered.unmount();
  });
});
