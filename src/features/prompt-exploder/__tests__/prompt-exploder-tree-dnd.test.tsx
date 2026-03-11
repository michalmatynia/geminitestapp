import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptExploderHierarchyTreeProvider } from '@/features/prompt-exploder/components/PromptExploderHierarchyTreeContext';
import { PromptExploderHierarchyTreeEditor } from '@/features/prompt-exploder/components/PromptExploderHierarchyTreeEditor';
import { PromptExploderTreeNodeRuntimeProvider } from '@/features/prompt-exploder/components/tree/PromptExploderTreeNodeRuntimeContext';
import { PromptExploderSegmentsTreeEditor } from '@/features/prompt-exploder/components/tree/PromptExploderSegmentsTreeEditor';
import { PromptExploderSubsectionsTreeEditor } from '@/features/prompt-exploder/components/tree/PromptExploderSubsectionsTreeEditor';
import { toPromptExploderTreeNodeId } from '@/features/prompt-exploder/tree/types';
import type {
  PromptExploderListItem,
  PromptExploderSegment,
  PromptExploderSubsection,
} from '@/features/prompt-exploder/types';
import type { FolderTreeViewportV2Props } from '@/features/foldertree';

const {
  useMasterFolderTreeShellMock,
  useDocumentStateMock,
  useDocumentActionsMock,
  useSegmentEditorActionsMock,
  viewportPropsMock,
} = vi.hoisted(() => ({
  useMasterFolderTreeShellMock: vi.fn(),
  useDocumentStateMock: vi.fn(),
  useDocumentActionsMock: vi.fn(),
  useSegmentEditorActionsMock: vi.fn(),
  viewportPropsMock: vi.fn(),
}));

vi.mock('@/features/foldertree', async () => {
  const actual = await vi.importActual<typeof import('@/features/foldertree')>(
    '@/features/foldertree'
  );
  return {
    ...actual,
    useMasterFolderTreeShell: (options: unknown): unknown => useMasterFolderTreeShellMock(options),
    FolderTreeViewportV2: (props: FolderTreeViewportV2Props): React.JSX.Element => {
      viewportPropsMock(props);
      return <div data-testid='folder-tree-viewport' />;
    },
  };
});

vi.mock('@/features/prompt-exploder/context/hooks/useDocument', () => ({
  useDocumentState: (): unknown => useDocumentStateMock(),
  useDocumentActions: (): unknown => useDocumentActionsMock(),
}));

vi.mock('@/features/prompt-exploder/context/hooks/useSegmentEditor', () => ({
  useSegmentEditorActions: (): unknown => useSegmentEditorActionsMock(),
}));

type MinimalController = {
  nodes: Array<{ id: string }>;
  selectedNodeId: string | null;
  expandNode: ReturnType<typeof vi.fn>;
  selectNode: ReturnType<typeof vi.fn>;
  reorderNode: ReturnType<typeof vi.fn>;
  dropNodeToRoot: ReturnType<typeof vi.fn>;
};

const createController = (): MinimalController => ({
  nodes: [{ id: toPromptExploderTreeNodeId('segment', 'segment-a') }],
  selectedNodeId: null,
  expandNode: vi.fn(),
  selectNode: vi.fn(),
  reorderNode: vi.fn().mockResolvedValue({ ok: true }),
  dropNodeToRoot: vi.fn().mockResolvedValue({ ok: true }),
});

const createSegment = (overrides: Partial<PromptExploderSegment>): PromptExploderSegment => ({
  id: overrides.id ?? `segment_${Math.random().toString(36).slice(2, 8)}`,
  type: overrides.type ?? 'assigned_text',
  title: overrides.title ?? null,
  content: overrides.content ?? '',
  condition: overrides.condition ?? null,
  items: overrides.items ?? [],
  listItems: overrides.listItems ?? [],
  subsections: overrides.subsections ?? [],
  bindingKey: overrides.bindingKey ?? null,
  text: overrides.text ?? null,
  raw: overrides.raw ?? null,
  paramsText: overrides.paramsText ?? null,
  paramsObject: overrides.paramsObject ?? null,
  paramUiControls: overrides.paramUiControls ?? {},
  paramComments: overrides.paramComments ?? {},
  paramDescriptions: overrides.paramDescriptions ?? {},
  code: overrides.code ?? null,
  includeInOutput: overrides.includeInOutput ?? true,
  confidence: overrides.confidence ?? 0,
  matchedPatternIds: overrides.matchedPatternIds ?? [],
  matchedPatternLabels: overrides.matchedPatternLabels ?? [],
  matchedSequenceLabels: overrides.matchedSequenceLabels ?? [],
  isHeading: overrides.isHeading,
  treatAsHeading: overrides.treatAsHeading,
  suggestedTreatAsHeading: overrides.suggestedTreatAsHeading,
  ruleCount: overrides.ruleCount,
  ruleStack: overrides.ruleStack,
  validationResults: overrides.validationResults ?? [],
  bindings: overrides.bindings,
  segments: overrides.segments ?? [],
});

const createItem = (
  id: string,
  text: string,
  children: PromptExploderListItem[] = []
): PromptExploderListItem => ({
  id,
  text,
  logicalOperator: null,
  logicalConditions: [],
  referencedParamPath: null,
  referencedComparator: null,
  referencedValue: null,
  children,
});

const createSubsection = (
  id: string,
  title: string,
  items: PromptExploderListItem[] = []
): PromptExploderSubsection => ({
  id,
  title,
  code: null,
  condition: null,
  guidance: null,
  items,
});

const getLatestViewportProps = (): FolderTreeViewportV2Props => {
  const latestCall = viewportPropsMock.mock.calls.at(-1)?.[0] as
    | FolderTreeViewportV2Props
    | undefined;
  if (!latestCall) {
    throw new Error('Expected FolderTreeViewportV2 to be rendered.');
  }
  return latestCall;
};

const renderTreeNodeWithRuntime = (node: React.ReactNode): void => {
  render(
    <PromptExploderTreeNodeRuntimeProvider
      value={{
        armDragHandle: vi.fn(),
        releaseDragHandle: vi.fn(),
      }}
    >
      {node}
    </PromptExploderTreeNodeRuntimeProvider>
  );
};

describe('Prompt Exploder master-tree DnD wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMasterFolderTreeShellMock.mockImplementation(() => ({
      capabilities: {
        multiSelect: { enabled: false },
        search: { enabled: true },
      },
      search: {
        state: { isActive: false, matchNodeIds: new Set() },
        resultCountLabel: '',
        placeholder: 'Search...',
      },
      appearance: {
        rootDropUi: {
          label: 'Move to Root',
          idleClassName: '',
          activeClassName: '',
        },
      },
      controller: createController(),
      viewport: {
        scrollToNodeRef: { current: null },
      },
    }));
    useDocumentActionsMock.mockReturnValue({
      replaceSegments: vi.fn(),
      setSelectedSegmentId: vi.fn(),
      updateSegment: vi.fn(),
    });
    useSegmentEditorActionsMock.mockReturnValue({
      addSegmentRelative: vi.fn(),
    });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      writable: true,
      value: vi.fn(() => null),
    });
  });

  it('wires handle-only drag policy and renders an explicit handle for segment rows', () => {
    useDocumentStateMock.mockReturnValue({
      documentState: {
        segments: [createSegment({ id: 'segment-a', code: 'A1' })],
      },
      selectedSegmentId: 'segment-a',
    });

    render(<PromptExploderSegmentsTreeEditor />);

    const viewportProps = getLatestViewportProps();
    expect(viewportProps.canStartDrag).toBeTypeOf('function');
    const renderedNode = viewportProps.renderNode?.({
      node: {
        id: toPromptExploderTreeNodeId('segment', 'segment-a'),
        name: 'A1',
        type: 'file',
        kind: 'prompt_segment',
        parentId: null,
        path: '001-a1',
        sortOrder: 0,
        children: [],
      } as never,
      depth: 0,
      hasChildren: false,
      isExpanded: false,
      isSelected: true,
      isMultiSelected: false,
      isRenaming: false,
      isDragging: false,
      isDropTarget: false,
      dropPosition: null,
      nodeStatus: null,
      select: vi.fn(),
      toggleExpand: vi.fn(),
      startRename: vi.fn(),
    });
    renderTreeNodeWithRuntime(<>{renderedNode}</>);
    expect(screen.getByText('A1')).toBeTruthy();
    expect(document.querySelector('[data-master-tree-drag-handle="true"]')).toBeTruthy();
  });

  it('rejects inside drops for top-level segment reordering', () => {
    useDocumentStateMock.mockReturnValue({
      documentState: {
        segments: [
          createSegment({ id: 'segment-a', code: 'A1' }),
          createSegment({ id: 'segment-b', code: 'B1' }),
        ],
      },
      selectedSegmentId: 'segment-a',
    });

    render(<PromptExploderSegmentsTreeEditor />);

    const viewportProps = getLatestViewportProps();
    expect(
      viewportProps.canDrop?.(
        {
          draggedNodeId: toPromptExploderTreeNodeId('segment', 'segment-a'),
          targetId: toPromptExploderTreeNodeId('segment', 'segment-b'),
          position: 'inside',
          defaultAllowed: true,
        },
        createController() as never
      )
    ).toBe(false);
  });

  it('routes root top drops to dropNodeToRoot with index 0', async () => {
    useDocumentStateMock.mockReturnValue({
      documentState: {
        segments: [createSegment({ id: 'segment-a', code: 'A1' })],
      },
      selectedSegmentId: 'segment-a',
    });

    render(<PromptExploderSegmentsTreeEditor />);

    const viewportProps = getLatestViewportProps();
    const controller = createController();
    await viewportProps.onNodeDrop?.(
      {
        draggedNodeId: toPromptExploderTreeNodeId('segment', 'segment-a'),
        targetId: null,
        position: 'inside',
        rootDropZone: 'top',
      },
      controller as never
    );

    expect(controller.dropNodeToRoot).toHaveBeenCalledWith(
      toPromptExploderTreeNodeId('segment', 'segment-a'),
      0
    );
    expect(controller.reorderNode).not.toHaveBeenCalled();
  });

  it('routes non-root drops to reorderNode', async () => {
    useDocumentStateMock.mockReturnValue({
      documentState: {
        segments: [
          createSegment({ id: 'segment-a', code: 'A1' }),
          createSegment({ id: 'segment-b', code: 'B1' }),
        ],
      },
      selectedSegmentId: 'segment-a',
    });

    render(<PromptExploderSegmentsTreeEditor />);

    const viewportProps = getLatestViewportProps();
    const controller = createController();
    controller.nodes = [
      { id: toPromptExploderTreeNodeId('segment', 'segment-a') },
      { id: toPromptExploderTreeNodeId('segment', 'segment-b') },
    ];
    await viewportProps.onNodeDrop?.(
      {
        draggedNodeId: toPromptExploderTreeNodeId('segment', 'segment-a'),
        targetId: toPromptExploderTreeNodeId('segment', 'segment-b'),
        position: 'after',
      },
      controller as never
    );

    expect(controller.reorderNode).toHaveBeenCalledWith(
      toPromptExploderTreeNodeId('segment', 'segment-a'),
      toPromptExploderTreeNodeId('segment', 'segment-b'),
      'after'
    );
  });

  it('wires handle-only drag policy and renders an explicit handle for hierarchy rows', () => {
    render(
      <PromptExploderHierarchyTreeProvider
        value={{
          items: [createItem('item-a', 'Alpha')],
          onChange: vi.fn(),
          emptyLabel: 'No items',
        }}
      >
        <PromptExploderHierarchyTreeEditor />
      </PromptExploderHierarchyTreeProvider>
    );

    const viewportProps = getLatestViewportProps();
    expect(viewportProps.canStartDrag).toBeTypeOf('function');
    const renderedNode = viewportProps.renderNode?.({
      node: {
        id: 'prompt_item:item-a',
        name: 'Alpha',
        type: 'folder',
        kind: 'folder',
        parentId: null,
        path: 'alpha',
        sortOrder: 0,
        children: [],
      } as never,
      depth: 0,
      hasChildren: false,
      isExpanded: false,
      isSelected: true,
      isMultiSelected: false,
      isRenaming: false,
      isDragging: false,
      isDropTarget: false,
      dropPosition: null,
      nodeStatus: null,
      select: vi.fn(),
      toggleExpand: vi.fn(),
      startRename: vi.fn(),
    });
    renderTreeNodeWithRuntime(<>{renderedNode}</>);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(document.querySelector('[data-master-tree-drag-handle="true"]')).toBeTruthy();
  });

  it('rejects invalid subsection drop paths while allowing only structurally valid targets', () => {
    useDocumentStateMock.mockReturnValue({
      selectedSegment: createSegment({
        id: 'segment-seq',
        type: 'sequence',
        subsections: [
          createSubsection('sub-a', 'A', [createItem('item-a1', 'A1')]),
          createSubsection('sub-b', 'B'),
        ],
      }),
    });

    render(<PromptExploderSubsectionsTreeEditor />);

    const viewportProps = getLatestViewportProps();
    const canDrop = viewportProps.canDrop;
    expect(canDrop).toBeTypeOf('function');

    expect(
      canDrop?.(
        {
          draggedNodeId: toPromptExploderTreeNodeId('subsection', 'sub-a'),
          targetId: toPromptExploderTreeNodeId('subsection', 'sub-b'),
          position: 'inside',
          defaultAllowed: true,
        },
        createController() as never
      )
    ).toBe(false);

    expect(
      canDrop?.(
        {
          draggedNodeId: toPromptExploderTreeNodeId('subsection_item', 'item-a1'),
          targetId: null,
          position: 'inside',
          defaultAllowed: true,
        },
        createController() as never
      )
    ).toBe(false);

    expect(
      canDrop?.(
        {
          draggedNodeId: toPromptExploderTreeNodeId('subsection_item', 'item-a1'),
          targetId: toPromptExploderTreeNodeId('subsection', 'sub-b'),
          position: 'inside',
          defaultAllowed: true,
        },
        createController() as never
      )
    ).toBe(true);
  });
});
