import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CollectionCardsEditorCard } from './CollectionCardsEditorCard';
import type {
  CollectionCardState,
  CollectionCardsController,
  CollectionCardsState,
} from './collection-cards-cms.client';

vi.mock('@/shared/ui/FolderTreePanel', () => ({
  FolderTreePanel: ({
    children,
    header,
  }: {
    children: React.ReactNode;
    header?: React.ReactNode;
  }) => (
    <section data-testid='folder-tree-panel'>
      {header}
      {children}
    </section>
  ),
}));

vi.mock('@/shared/ui/FormModal', () => ({
  FormModal: ({
    children,
    isSaveDisabled,
    onClose,
    onSave,
    open,
    saveText,
    title,
  }: {
    children: React.ReactNode;
    isSaveDisabled?: boolean;
    onClose: () => void;
    onSave: () => void;
    open?: boolean;
    saveText?: string;
    title: string;
  }) =>
    open === true ? (
      <div role='dialog' aria-label={title}>
        {children}
        <button type='button' onClick={onSave} disabled={isSaveDisabled === true}>
          {saveText ?? 'Save'}
        </button>
        <button type='button' onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock('@/shared/lib/foldertree/public', async () => {
  const ReactModule = await vi.importActual<typeof React>('react');

  return {
    MasterFolderTreeViewport: ({
      tree,
    }: {
      tree: {
        controller: {
          nodes: Array<{ id: string; name: string; type: string }>;
          selectNode: (nodeId: string) => void;
        };
      };
    }) => (
      <div data-testid='master-folder-tree'>
        {tree.controller.nodes.map((node) => (
          <button
            key={node.id}
            type='button'
            onClick={() => tree.controller.selectNode(node.id)}
          >
            {node.name}
          </button>
        ))}
      </div>
    ),
    useMasterFolderTreeViewModel: ({
      nodes,
      selectedNodeId,
    }: {
      nodes: Array<{ id: string; name: string; type: string }>;
      selectedNodeId?: string | null;
    }) => {
      const [selected, setSelected] = ReactModule.useState<string | null>(
        selectedNodeId ?? null
      );

      ReactModule.useEffect(() => {
        setSelected(selectedNodeId ?? null);
      }, [selectedNodeId]);

      return {
        appearance: { rootDropUi: undefined },
        capabilities: { multiSelect: { enabled: false } },
        controller: {
          nodes,
          selectedNodeId: selected,
          selectNode: setSelected,
        },
        searchState: undefined,
        viewport: { scrollToNodeRef: { current: null } },
      };
    },
  };
});

const createCard = (overrides: Partial<CollectionCardState>): CollectionCardState => ({
  fallbackCount: 0,
  href: '/products',
  id: 'card',
  imageUrl: '',
  label: 'Card',
  selectorType: 'theme',
  selectorValues: [],
  sublabel: '',
  tag: '',
  visible: true,
  ...overrides,
});

const collectionCardsState: CollectionCardsState = {
  cards: [],
  cloudConfigured: true,
  updatedAt: '2026-05-10T18:00:00.000Z',
  updatedBy: null,
};

const createController = (
  cards: CollectionCardState[],
  overrides: Partial<CollectionCardsController> = {}
): CollectionCardsController => ({
  addCard: vi.fn(),
  cards,
  collectionCards: { ...collectionCardsState, cards },
  error: null,
  handleRefreshClick: vi.fn(),
  handleSaveClick: vi.fn(),
  isLoading: false,
  isSaving: false,
  removeCard: vi.fn(),
  updateCard: vi.fn(),
  uploadCardImage: vi.fn(),
  uploadingIndex: null,
  ...overrides,
});

describe('CollectionCardsEditorCard', () => {
  it('uses the master tree selection to choose the edited universe card', () => {
    const controller = createController([
      createCard({ id: 'visible-realm', label: 'Visible Realm', visible: true }),
      createCard({ id: 'hidden-realm', label: 'Hidden Realm', visible: false }),
    ]);

    render(<CollectionCardsEditorCard controller={controller} />);

    expect(screen.getByTestId('master-folder-tree')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Visible Realm')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hidden Realm' }));

    expect(screen.getByDisplayValue('Hidden Realm')).toBeInTheDocument();
  });

  it('creates a new universe card through the add modal', () => {
    const addCard = vi.fn();
    const controller = createController([
      createCard({ id: 'visible-realm', label: 'Visible Realm', visible: true }),
    ], { addCard });

    render(<CollectionCardsEditorCard controller={controller} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add universe card' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Universe Card' });

    fireEvent.change(within(dialog).getByLabelText('Label'), {
      target: { value: 'Mystic Gate' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add card' }));

    expect(addCard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^collection-card-mystic-gate-\d+$/),
        label: 'Mystic Gate',
        selectorType: 'theme',
        visible: true,
      })
    );
    expect(screen.queryByRole('dialog', { name: 'Add Universe Card' })).not.toBeInTheDocument();
  });
});
