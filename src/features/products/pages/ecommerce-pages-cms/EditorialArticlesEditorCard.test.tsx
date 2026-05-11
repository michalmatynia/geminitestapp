import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorialArticlesEditorCard } from './EditorialArticlesEditorCard';
import { normalizeEditorialArticleDraft } from './editorial-articles-cms.client';
import type {
  EditorialArticleState,
  EditorialArticlesController,
  EditorialArticlesState,
} from './editorial-articles-cms.client';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: mocks.apiGet,
    post: mocks.apiPost,
    put: mocks.apiPut,
  },
}));

vi.mock('@/shared/ui/primitives.public', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui/primitives.public')>(
    '@/shared/ui/primitives.public'
  );
  return {
    ...actual,
    useToast: () => ({ toast: mocks.toast }),
  };
});

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
  imageUrl: '',
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
  uploadArticleImage: vi.fn(),
  uploadingIndex: null,
  ...overrides,
});

describe('EditorialArticlesEditorCard', () => {
  beforeEach(() => {
    mocks.apiGet.mockReset();
    mocks.apiPost.mockReset();
    mocks.apiPut.mockReset();
    mocks.toast.mockReset();
  });

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
    fireEvent.change(within(dialog).getByLabelText('Image URL'), {
      target: { value: 'https://sparksofsindri.com/uploads/cms/stargater/lore/article.webp' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add article' }));

    expect(addArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'A longer article body for the storefront page.',
        excerpt: 'Fresh arrival note',
        href: '/lore-drops/gaming-drop',
        id: 'gaming-drop',
        imageUrl: 'https://sparksofsindri.com/uploads/cms/stargater/lore/article.webp',
        tag: 'Universe Report',
        title: 'Gaming Drop',
        visible: true,
      })
    );
    expect(screen.queryByRole('dialog', { name: 'Add Lore Article' })).not.toBeInTheDocument();
  });

  it('generates a draft lore article through the Gemma Vision AI Path button', async () => {
    mocks.apiPost.mockResolvedValue({
      ok: true,
      article: {
        body: 'Generated long-form article content.',
        excerpt: 'Generated short article form.',
        modelId: 'gemma3',
        title: 'Generated Lore Drop',
      },
    });
    const controller = createController([]);

    render(<EditorialArticlesEditorCard controller={controller} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add article' }));
    const dialog = screen.getByRole('dialog', { name: 'Add Lore Article' });

    fireEvent.change(within(dialog).getByLabelText('AI prompt'), {
      target: { value: 'Write a lore article from this product image.' },
    });
    fireEvent.change(within(dialog).getByLabelText('Context image URL'), {
      target: { value: 'https://sparksofsindri.com/context.png' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Generate article' }));

    await waitFor(() => {
      expect(within(dialog).getByDisplayValue('Generated Lore Drop')).toBeInTheDocument();
    });
    expect(within(dialog).getByDisplayValue('Generated short article form.')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Generated long-form article content.')).toBeInTheDocument();
    expect(mocks.apiPost).toHaveBeenCalledWith(
      '/api/v2/products/pages/editorial-articles/generate',
      expect.objectContaining({
        imageUrl: 'https://sparksofsindri.com/context.png',
        prompt: 'Write a lore article from this product image.',
      }),
      { timeout: 180_000 }
    );
  });
});
