import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { ComponentSettingsPanel } from '@/features/cms/components/page-builder/ComponentSettingsPanel';
import { ComponentSettingsProvider } from '@/features/cms/components/page-builder/context/ComponentSettingsContext';
import {
  useCmsThemes,
  useCmsDomains,
  useCmsSlugs,
  useCmsAllSlugs,
} from '@/features/cms/hooks/useCmsQueries';
import {
  usePageBuilderState,
  usePageBuilderDispatch,
  usePageBuilderSelection,
} from '@/features/cms/hooks/usePageBuilderContext';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

// Create a new QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Mock hooks
vi.mock('@/features/cms/hooks/usePageBuilderContext', () => {
  const usePageBuilderStateMock = vi.fn();
  const usePageBuilderDispatchMock = vi.fn();
  const usePageBuilderSelectionMock = vi.fn();
  return {
    usePageBuilderState: usePageBuilderStateMock,
    usePageBuilderDispatch: usePageBuilderDispatchMock,
    usePageBuilderSelection: usePageBuilderSelectionMock,
    usePageBuilder: () => ({
      state: usePageBuilderStateMock(),
      dispatch: usePageBuilderDispatchMock(),
      ...usePageBuilderSelectionMock(),
    }),
  };
});

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: vi.fn(),
}));

vi.mock('@/features/cms/hooks/useCmsQueries', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useCmsThemes: vi.fn(),
    useCmsDomains: vi.fn(),
    useCmsSlugs: vi.fn(),
    useCmsAllSlugs: vi.fn(),
  };
});

vi.mock('@/features/cms/components/page-builder/section-registry', () => ({
  getSectionDefinition: (type: string) => {
    if (type === 'Hero') {
      return {
        label: 'Hero banner',
        settingsSchema: [
          { key: 'image', label: 'Image', type: 'image' },
          { key: 'imageHeight', label: 'Image height', type: 'select' },
          { key: 'colorScheme', label: 'Color scheme', type: 'color-scheme' },
          { key: 'paddingTop', label: 'Top padding', type: 'number' },
          { key: 'paddingBottom', label: 'Bottom padding', type: 'number' },
          { key: 'backgroundColor', label: 'Background color', type: 'color' },
          { key: 'sectionBorder', label: 'Border', type: 'border' },
          { key: 'sectionShadow', label: 'Shadow', type: 'shadow' },
        ],
      };
    }
    return null;
  },
  getBlockDefinition: (type: string) => {
    if (type === 'Heading') {
      return {
        label: 'Heading Block',
        settingsSchema: [{ key: 'text', label: 'Text', type: 'text' }],
      };
    }
    return null;
  },
  IMAGE_ELEMENT_BACKGROUND_MODE_SETTINGS: [],
  getImageBackgroundTargetOptions: () => [],
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  const MockTabsList = ({ children, activeValue, onValueChange }: any) => (
    <div data-testid='tabs-list' role='tablist'>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as any, { activeValue, onValueChange })
          : child
      )}
    </div>
  );
  MockTabsList.displayName = 'TabsList';

  const MockTabsContent = ({ children, value, activeValue }: any) => {
    if (value !== activeValue) return null;
    return (
      <div role='tabpanel' data-testid={`tab-content-${value}`}>
        {children}
      </div>
    );
  };
  MockTabsContent.displayName = 'TabsContent';

  return {
    ...actual,
    Tabs: ({ children, value, onValueChange }: any) => (
      <div data-testid='tabs'>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            const type = child.type as any;
            if (type.displayName === 'TabsList') {
              return React.cloneElement(child as any, { activeValue: value, onValueChange });
            }
            if (type.displayName === 'TabsContent') {
              return React.cloneElement(child as any, { activeValue: value });
            }
          }
          return child;
        })}
      </div>
    ),
    TabsList: MockTabsList,
    TabsTrigger: ({ children, value, activeValue, onValueChange }: any) => (
      <button
        role='tab'
        aria-selected={value === activeValue}
        onClick={() => onValueChange?.(value)}
        data-testid={`tab-trigger-${value}`}
      >
        {children}
      </button>
    ),
    TabsContent: MockTabsContent,
    Button: ({ children, onClick, variant }: any) => (
      <button onClick={onClick} data-variant={variant}>
        {children}
      </button>
    ),
  };
});

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/features/cms/components/page-builder/MediaLibraryPanel', () => ({
  MediaLibraryPanel: () => <div data-testid='media-library'>Media</div>,
}));

vi.mock('@/features/cms/components/page-builder/SettingsFieldRenderer', () => ({
  SettingsFieldRenderer: ({ field, value, onChange }: any) => (
    <div data-testid={`field-${field.key}`}>
      <label htmlFor={`input-${field.key}`}>{field.label}</label>
      <input
        id={`input-${field.key}`}
        data-testid={`input-${field.key}`}
        value={typeof value === 'string' || typeof value === 'number' ? value : ''}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    </div>
  ),
}));

vi.mock('@/features/cms/components/page-builder/AnimationConfigPanel', () => ({
  AnimationConfigPanel: () => <div data-testid='animation-panel'>Animation</div>,
}));

vi.mock('@/features/cms/components/page-builder/CssAnimationConfigPanel', () => ({
  CssAnimationConfigPanel: () => <div data-testid='css-animation-panel'>CSS Animation</div>,
}));

describe('ComponentSettingsPanel Component', () => {
  const mockDispatch = vi.fn();
  const mockPage = {
    id: '1',
    name: 'Test Page',
    status: 'draft' as const,
    seoTitle: '',
    slugs: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useCmsThemes as any).mockReturnValue({ data: [], isLoading: false });
    (useCmsDomains as any).mockReturnValue({ data: [], isLoading: false });
    (useCmsSlugs as any).mockReturnValue({ data: [], isLoading: false });
    (useCmsAllSlugs as any).mockReturnValue({ data: [], isLoading: false });
    (useSettingsStore as any).mockReturnValue({ get: vi.fn() });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <ComponentSettingsProvider>{ui}</ComponentSettingsProvider>
      </QueryClientProvider>
    );
  };

  it("should show 'Select a page' message when no page is set", () => {
    (usePageBuilderState as any).mockReturnValue({
      currentPage: null,
      inspectorSettings: { showEditorChrome: true },
      sections: [],
    });
    (usePageBuilderDispatch as any).mockReturnValue(mockDispatch);
    (usePageBuilderSelection as any).mockReturnValue({
      selectedSection: null,
      selectedBlock: null,
      selectedColumn: null,
    });

    renderWithProviders(<ComponentSettingsPanel />);
    expect(screen.getByText(/Select a page first/i)).toBeInTheDocument();
  });

  it('should show page settings when nothing is selected', () => {
    (usePageBuilderState as any).mockReturnValue({
      currentPage: mockPage,
      inspectorSettings: { showEditorChrome: true },
      sections: [],
    });
    (usePageBuilderDispatch as any).mockReturnValue(mockDispatch);
    (usePageBuilderSelection as any).mockReturnValue({
      selectedSection: null,
      selectedBlock: null,
      selectedColumn: null,
    });

    renderWithProviders(<ComponentSettingsPanel />);
    expect(screen.getAllByText('Test Page').length).toBeGreaterThan(0);
    expect(screen.getByText('Status')).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: /Page/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /SEO/i })).toBeInTheDocument();
  });

  it('should render section settings when a section is selected', () => {
    const mockSection = {
      id: 'sec-1',
      type: 'Hero',
      settings: { imageHeight: 'large' },
    };

    (usePageBuilderState as any).mockReturnValue({
      currentPage: mockPage,
      inspectorSettings: { showEditorChrome: true },
      sections: [mockSection],
    });
    (usePageBuilderDispatch as any).mockReturnValue(mockDispatch);
    (usePageBuilderSelection as any).mockReturnValue({
      selectedSection: mockSection,
      selectedBlock: null,
      selectedColumn: null,
    });

    renderWithProviders(<ComponentSettingsPanel />);

    expect(screen.getByText(/Section: Hero banner/i)).toBeInTheDocument();
    expect(screen.getByText('Image height')).toBeInTheDocument();
  });

  it('should handle removing a section', () => {
    const mockSection = { id: 'sec-1', type: 'Hero', settings: {} };

    (usePageBuilderState as any).mockReturnValue({
      currentPage: mockPage,
      inspectorSettings: { showEditorChrome: true },
      sections: [mockSection],
    });
    (usePageBuilderDispatch as any).mockReturnValue(mockDispatch);
    (usePageBuilderSelection as any).mockReturnValue({
      selectedSection: mockSection,
      selectedBlock: null,
      selectedColumn: null,
    });

    renderWithProviders(<ComponentSettingsPanel />);

    const removeBtn = screen.getByRole('button', { name: /Remove section/i });
    fireEvent.click(removeBtn);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'REMOVE_SECTION',
      sectionId: 'sec-1',
    });
  });

  it('should update SEO settings', async () => {
    (usePageBuilderState as any).mockReturnValue({
      currentPage: mockPage,
      inspectorSettings: { showEditorChrome: true },
      sections: [],
    });
    (usePageBuilderDispatch as any).mockReturnValue(mockDispatch);
    (usePageBuilderSelection as any).mockReturnValue({
      selectedSection: null,
      selectedBlock: null,
      selectedColumn: null,
    });

    renderWithProviders(<ComponentSettingsPanel />);

    const seoTab = screen.getByRole('tab', { name: /SEO/i });
    fireEvent.click(seoTab);

    const titleInput = await screen.findByLabelText(/Page title/i);
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_SEO',
      seo: { seoTitle: 'New Title' },
    });
  });
});
