import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductDraftOpenFormTab } from '@/shared/contracts/products/drafts';

const { createDraftMutationMock, onSaveSuccessMock, toastMock, useDraftCreatorFormMock } =
  vi.hoisted(() => ({
    createDraftMutationMock: vi.fn(),
    onSaveSuccessMock: vi.fn(),
    toastMock: vi.fn(),
    useDraftCreatorFormMock: vi.fn(),
  }));

vi.mock('../hooks/useDraftCreatorForm', () => ({
  useDraftCreatorForm: (...args: unknown[]) => useDraftCreatorFormMock(...args),
}));

vi.mock('./DraftCreatorFormFields', () => ({
  DraftCreatorDetailsTab: () => (
    <button type='submit'>Save draft from mocked details tab</button>
  ),
  DraftCreatorParametersTab: () => <div>Parameters tab</div>,
}));

vi.mock('@/features/products/forms.public', () => ({
  ProductImagesTabContent: () => <div>Images tab</div>,
  ProductImagesTabProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/lib/icons', () => ({
  IconSelector: () => <div>Icon selector</div>,
}));

vi.mock('@/shared/ui/feedback.public', () => ({
  AppModal: ({ children, open }: { children?: React.ReactNode; open?: boolean }) =>
    open === true ? <div role='dialog'>{children}</div> : null,
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tabs: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
  useToast: () => ({ toast: toastMock }),
}));

type DraftCreatorFormTestState = {
  [key: string]: unknown;
  draftKind: 'scrape_template' | 'standard';
  scrapeProfileId: string | null;
  parameterValues: Array<{
    parameterId: string;
    value: string;
    valuesByLanguage?: Record<string, string>;
    skipParameterInference?: boolean;
  }>;
};

const createFormState = (): DraftCreatorFormTestState => ({
  name: ' BattleStock Scrape Template ',
  draftKind: 'scrape_template' as const,
  scrapeProfileId: 'battlestock-warhammer-40k-30k',
  description: 'Template for scrape insertions',
  sku: '',
  ean: '',
  gtin: '',
  asin: '',
  nameEn: '',
  namePl: '[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
  nameDe: '',
  descEn: '',
  descPl: '[description]',
  descDe: '',
  weight: '',
  sizeLength: '',
  sizeWidth: '',
  length: '',
  price: '',
  supplierName: 'BattleStock',
  supplierLink: '[sourceUrl]',
  priceComment: 'Scraped [price] [currency]',
  stock: '4',
  selectedCatalogIds: ['catalog-battle'],
  selectedCategoryId: 'category-pendants',
  selectedTagIds: ['tag-warhammer'],
  selectedProducerIds: ['producer-games-workshop'],
  parameterValues: [{ parameterId: 'source-brand', value: '[brand]' }],
  active: true,
  validatorEnabled: true,
  formatterEnabled: false,
  icon: null,
  iconColorMode: 'theme' as const,
  iconColor: '#60a5fa',
  openProductFormTab: 'general' as ProductDraftOpenFormTab,
  baseProductId: '',
  isIconLibraryOpen: false,
  setIsIconLibraryOpen: vi.fn(),
});

const mockDraftCreatorForm = (
  stateOverrides: Partial<DraftCreatorFormTestState> = {}
): void => {
  createDraftMutationMock.mockResolvedValue({ id: 'draft-created' });
  useDraftCreatorFormMock.mockReturnValue({
    state: { ...createFormState(), ...stateOverrides },
    queries: {
      draftQuery: { isLoading: false },
      createDraftMutation: { mutateAsync: createDraftMutationMock },
      updateDraftMutation: { mutateAsync: vi.fn() },
    },
    images: {
      imageSlots: Array.from({ length: 15 }, () => null),
      imageLinks: Array.from({ length: 15 }, () => ''),
      imageBase64s: Array.from({ length: 15 }, () => ''),
      setImageLinkAt: vi.fn(),
      setImageBase64At: vi.fn(),
      handleSlotImageChange: vi.fn(),
      handleSlotFileSelect: vi.fn(),
      handleSlotDisconnectImage: vi.fn(),
      handleMultiImageChange: vi.fn(),
      setShowFileManager: vi.fn(),
      swapImageSlots: vi.fn(),
      setImagesReordering: vi.fn(),
      refreshFromProduct: vi.fn(),
      showFileManager: false,
      handleMultiFileSelect: vi.fn(),
    },
    metadata: {
      catalogs: [],
      selectedCatalogIds: ['catalog-battle'],
      setSelectedCatalogIds: vi.fn(),
      categories: [],
      categoryLoading: false,
      selectedCategoryId: 'category-pendants',
      setSelectedCategoryId: vi.fn(),
      tags: [],
      tagLoading: false,
      selectedTagIds: ['tag-warhammer'],
      setSelectedTagIds: vi.fn(),
      producers: [],
      producersLoading: false,
      selectedProducerIds: ['producer-games-workshop'],
      setSelectedProducerIds: vi.fn(),
    },
  });
};

import { DraftCreator } from './DraftCreator';

const persistScrapeTemplateMetadata = async (): Promise<void> => {
  render(<DraftCreator onSaveSuccess={onSaveSuccessMock} />);

  fireEvent.click(screen.getByRole('button', { name: 'Save draft from mocked details tab' }));

  await waitFor(() => {
    expect(createDraftMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'BattleStock Scrape Template',
        draftKind: 'scrape_template',
        scrapeProfileId: 'battlestock-warhammer-40k-30k',
        name_pl: '[name] | 5 cm | Metal | Gaming Pendant | Warhammer 40k',
        description_pl: '[description]',
        supplierName: 'BattleStock',
        supplierLink: '[sourceUrl]',
        priceComment: 'Scraped [price] [currency]',
        stock: 4,
        catalogIds: ['catalog-battle'],
        categoryId: 'category-pendants',
        tagIds: ['tag-warhammer'],
        producerIds: ['producer-games-workshop'],
        parameters: [{ parameterId: 'source-brand', value: '[brand]' }],
      })
    );
  });
  expect(onSaveSuccessMock).toHaveBeenCalledTimes(1);
};

const dropsStaleScrapeProfileAssignment = async (): Promise<void> => {
  mockDraftCreatorForm({
    draftKind: 'standard',
    scrapeProfileId: 'battlestock-warhammer-40k-30k',
  });

  render(<DraftCreator onSaveSuccess={onSaveSuccessMock} />);

  fireEvent.click(screen.getByRole('button', { name: 'Save draft from mocked details tab' }));

  await waitFor(() => {
    expect(createDraftMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        draftKind: 'standard',
        scrapeProfileId: null,
      })
    );
  });
};

const preservesLocalizedLinkedParameterMetadata = async (): Promise<void> => {
  mockDraftCreatorForm({
    parameterValues: [
      {
        parameterId: 'param-material',
        value: 'Metal',
        valuesByLanguage: { en: 'Metal', pl: 'Metal PL' },
        skipParameterInference: true,
      },
    ],
  });

  render(<DraftCreator onSaveSuccess={onSaveSuccessMock} />);

  fireEvent.click(screen.getByRole('button', { name: 'Save draft from mocked details tab' }));

  await waitFor(() => {
    expect(createDraftMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: [
          {
            parameterId: 'param-material',
            value: 'Metal',
            valuesByLanguage: { en: 'Metal', pl: 'Metal PL' },
            skipParameterInference: true,
          },
        ],
      })
    );
  });
};

describe('DraftCreator', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
    mockDraftCreatorForm();
  });

  it('persists scrape-template metadata and placeholder text on create', persistScrapeTemplateMetadata);
  it('drops stale scrape profile assignment when saving a standard draft', dropsStaleScrapeProfileAssignment);
  it('preserves localized linked parameter metadata when saving', preservesLocalizedLinkedParameterMetadata);
});
