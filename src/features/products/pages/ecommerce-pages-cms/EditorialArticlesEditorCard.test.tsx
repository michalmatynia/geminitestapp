import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EditorialArticlesEditorCard } from './EditorialArticlesEditorCard';
import { normalizeEditorialArticleDraft } from './editorial-articles-cms.client';
import type {
  EditorialArticleState,
  EditorialArticlesController,
  EditorialArticlesState,
} from './editorial-articles-cms.client';

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
        {tree.controller.nodes
          .filter((node) => node.type === 'file')
          .map((node) => (
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

const createArticle = (
  overrides: Partial<EditorialArticleState>
): EditorialArticleState => ({
  body: 'Long article body',
  excerpt: 'Short article copy',
  href: '/lore-drops/article',
  id: 'article',
  tag: 'Universe Report',
  title: 'Article',
  visible: true,
  ...overrides,
});

const editorialArticlesState: EditorialArticlesState = {
  articles: [],
  cloudConfigured: true,
  updatedAt: '2026-05-10T18:00:00.000Z',
  updatedBy: null,
};

const createController = (
  articles: EditorialArticleState[],
  overrides: Partial<EditorialArticlesController> = {}
): EditorialArticlesController => ({
  addArticle: vi.fn(),
  articles,
  editorialArticles: { ...editorialArticlesState, articles },
  error: null,
  handleRefreshClick: vi.fn(),
  handleSaveClick: vi.fn(),
  isLoading: false,
  isSaving: false,
  removeArticle: vi.fn(),
  updateArticle: vi.fn(),
  ...overrides,
});

describe('EditorialArticlesEditorCard', () => {
  it('normalizes fragment article hrefs to readable Lore & Drops paths', () => {
    expect(
      normalizeEditorialArticleDraft(
        createArticle({
          href: '#',
          id: 'Gaming Report',
          title: 'Gaming Report',
        })
      )
    ).toMatchObject({
      href: '/lore-drops/gaming-report',
      id: 'gaming-report',
    });
  });

  it('uses the master tree selection to choose the edited lore article', () => {
    const controller = createController([
      createArticle({ id: 'visible-report', title: 'Visible Report', visible: true }),
      createArticle({ id: 'hidden-drop', title: 'Hidden Drop', visible: false }),
    ]);

    render(<EditorialArticlesEditorCard controller={controller} />);

    expect(screen.getByTestId('master-folder-tree')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Visible Report')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hidden Drop' }));

    expect(screen.getByDisplayValue('Hidden Drop')).toBeInTheDocument();
  });

  it('creates a new lore article through the add modal', () => {
    const addArticle = vi.fn();
    const controller = createController([
      createArticle({ id: 'visible-report', title: 'Visible Report', visible: true }),
    ], { addArticle });

    render(<EditorialArticlesEditorCard controller={controller} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add article' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Lore Article' });

    fireEvent.change(within(dialog).getByLabelText('Article title'), {
      target: { value: 'Gaming Drop' },
    });
    fireEvent.change(within(dialog).getByLabelText('Short form'), {
      target: { value: 'Fresh arrival note' },
    });
    fireEvent.change(within(dialog).getByLabelText('Long text'), {
      target: { value: 'A longer article body for the storefront page.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add article' }));

    expect(addArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'A longer article body for the storefront page.',
        excerpt: 'Fresh arrival note',
        href: '/lore-drops/gaming-drop',
        id: 'gaming-drop',
        tag: 'Universe Report',
        title: 'Gaming Drop',
        visible: true,
      })
    );
    expect(screen.queryByRole('dialog', { name: 'Add Lore Article' })).not.toBeInTheDocument();
  });
});
