import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptExploderHierarchyTreeProvider } from '@/features/prompt-exploder/components/PromptExploderHierarchyTreeContext';
import { PromptExploderHierarchyTreeEditor } from '@/features/prompt-exploder/components/PromptExploderHierarchyTreeEditor';
import { PromptExploderSegmentsTreeEditor } from '@/features/prompt-exploder/components/tree/PromptExploderSegmentsTreeEditor';
import { PromptExploderSubsectionsTreeEditor } from '@/features/prompt-exploder/components/tree/PromptExploderSubsectionsTreeEditor';
import { toPromptExploderTreeNodeId } from '@/features/prompt-exploder/tree/types';
import type {
  PromptExploderListItem,
  PromptExploderSegment,
  PromptExploderSubsection,
} from '@/features/prompt-exploder/types';
import type { FolderTreeViewportV2Props } from '@/features/foldertree/v2';

const {
  useMasterFolderTreeInstanceMock,
  useDocumentStateMock,
  useDocumentActionsMock,
  useSegmentEditorActionsMock,
  viewportPropsMock,
} = vi.hoisted(() => ({
  useMasterFolderTreeInstanceMock: vi.fn(),
  useDocumentStateMock: vi.fn(),
  useDocumentActionsMock: vi.fn(),
  useSegmentEditorActionsMock: vi.fn(),
  viewportPropsMock: vi.fn(),
}));

vi.mock('@/features/foldertree', () => ({
  useMasterFolderTreeInstance: (options: unknown) => useMasterFolderTreeInstanceMock(options),
}));

vi.mock('@/features/foldertree/v2', async () => {
  const actual = await vi.importActual<typeof import('@/features/foldertree/v2')>(
    '@/features/foldertree/v2'
  );
  return {
    ...actual,
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
  selectedNodeId: string | null;
  expandNode: ReturnType<typeof vi.fn>;
  selectNode: ReturnType<typeof vi.fn>;
  reorderNode: ReturnType<typeof vi.fn>;
  dropNodeToRoot: ReturnType<typeof vi.fn>;
};

const createController = (): MinimalController => ({
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
  const latestCall = viewportPropsMock.mock.calls.at(-1)?.[0] as FolderTreeViewportV2Props | undefined;
  if (!latestCall) {
    throw new Error('Expected FolderTreeViewportV2 to be rendered.');
  }
  return latestCall;
};

describe('Prompt Exploder master-tree DnD wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMasterFolderTreeInstanceMock.mockImplementation(() => ({
      appearance: {
        rootDropUi: {
          label: 'Move to Root',
          idleClassName: '',
          activeClassName: '',
        },
      },
      controller: createController(),
      scrollToNodeRef: { current: null },
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
    render(<>{renderedNode}</>);
    expect(screen.getByText('A1')).toBeTruthy();
    expect(document.querySelector('[data-master-tree-drag-handle=\"true\"]')).toBeTruthy();
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
    render(<>{renderedNode}</>);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(document.querySelector('[data-master-tree-drag-handle=\"true\"]')).toBeTruthy();
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
