import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PagePreviewPanel } from '@/features/cms/components/page-builder/PagePreviewPanel';
import type { PageBuilderState, SectionInstance } from '@/shared/contracts/cms';

const { pageBuilderStateRef, dispatchMock, toastMock } = vi.hoisted(() => ({
  pageBuilderStateRef: {
    current: null as PageBuilderState | null,
  },
  dispatchMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({ data: {} }),
}));

vi.mock('@/shared/ui', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui')>('@/shared/ui');
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
    SelectSimple: () => null,
  };
});

vi.mock('@/features/cms', () => ({
  CmsDomainSelector: () => null,
}));

vi.mock('@/features/cms/components/page-builder/MediaLibraryPanel', () => ({
  MediaLibraryPanel: () => null,
}));

vi.mock('@/features/cms/components/page-builder/PageSelectorBar', () => ({
  PageSelectorBar: () => null,
}));

vi.mock('@/features/cms/components/page-builder/VectorOverlay', () => ({
  VectorOverlay: () => null,
}));

vi.mock('@/features/cms/components/page-builder/preview/context/PreviewEditorContext', () => ({
  PreviewEditorProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/cms/components/page-builder/PreviewBlock', () => ({
  PreviewSection: ({ section }: { section: SectionInstance }) => (
    <div data-testid={`preview-${section.id}`}>{section.type}</div>
  ),
}));

vi.mock('@/features/cms/components/page-builder/ThemeSettingsContext', () => ({
  useThemeSettingsValue: () => ({
    colorSchemes: [],
    enableAnimations: false,
    hoverEffect: 'none',
    hoverScale: 1,
    fullWidth: false,
    pagePadding: 0,
    pageMargin: 0,
    pagePaddingTop: 0,
    pagePaddingRight: 0,
    pagePaddingBottom: 0,
    pagePaddingLeft: 0,
    pageMarginTop: 0,
    pageMarginRight: 0,
    pageMarginBottom: 0,
    pageMarginLeft: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  }),
}));

vi.mock('@/features/cms/hooks/useCmsDomainSelection', () => ({
  useCmsDomainSelection: () => ({
    activeDomainId: null,
    activeDomain: null,
  }),
}));

vi.mock('@/features/cms/hooks/useCmsQueries', () => ({
  useCmsSlugs: () => ({
    data: [],
    isLoading: false,
  }),
  useUpdatePage: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilderState: () => pageBuilderStateRef.current,
  usePageBuilderDispatch: () => dispatchMock,
  useVectorOverlay: () => ({
    vectorOverlay: null,
    closeVectorOverlay: vi.fn(),
  }),
}));

vi.mock('@/features/cms/components/frontend/CmsPageContext', () => ({
  CmsPageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/cms/components/frontend/media-styles-context', () => ({
  MediaStylesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const createSection = (overrides: Partial<SectionInstance> = {}): SectionInstance =>
  ({
    id: 'section-default',
    type: 'Hero',
    zone: 'template',
    parentSectionId: null,
    settings: {},
    blocks: [],
    ...overrides,
  }) as SectionInstance;

const createState = (sections: SectionInstance[]): PageBuilderState =>
  ({
    pages: [],
    currentPage: {
      id: 'page-1',
      createdAt: '',
      updatedAt: '',
      name: 'Page',
      status: 'draft',
      themeId: null,
      showMenu: true,
      components: [],
      slugs: [],
    },
    sections,
    selectedNodeId: null,
    inspectorEnabled: false,
    inspectorSettings: {
      showTooltip: true,
      showStyleSettings: true,
      showStructureInfo: true,
      showIdentifiers: true,
      showVisibilityInfo: true,
      showConnectionInfo: true,
      showEditorChrome: true,
      showLayoutGuides: true,
      pauseAnimations: false,
    },
    previewMode: 'mobile',
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
    clipboard: null,
    history: { past: [], future: [] },
  }) as PageBuilderState;

describe('PagePreviewPanel nested section rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nested preview sections inside a subtle wrapper', () => {
    pageBuilderStateRef.current = createState([
      createSection({ id: 'root', zone: 'template' }),
      createSection({
        id: 'child',
        zone: 'template',
        parentSectionId: 'root',
        type: 'TextElement',
      }),
    ]);

    render(<PagePreviewPanel />);

    expect(screen.getByTestId('preview-root')).toBeInTheDocument();
    const child = screen.getByTestId('preview-child');
    expect(child).toBeInTheDocument();
    const nestedWrapper = child.closest('.ml-4');
    expect(nestedWrapper).not.toBeNull();
    expect(nestedWrapper).toHaveClass('ml-4', 'border-l', 'pl-3');
  });

  it('suppresses nested preview sections when the parent is hidden', () => {
    pageBuilderStateRef.current = createState([
      createSection({ id: 'root', zone: 'template', settings: { isHidden: true } }),
      createSection({
        id: 'child',
        zone: 'template',
        parentSectionId: 'root',
        type: 'TextElement',
      }),
    ]);

    render(<PagePreviewPanel />);

    expect(screen.queryByTestId('preview-root')).not.toBeInTheDocument();
    expect(screen.queryByTestId('preview-child')).not.toBeInTheDocument();
  });
});
