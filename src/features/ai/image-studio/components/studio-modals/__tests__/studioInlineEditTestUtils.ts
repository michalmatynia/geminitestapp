import { vi } from 'vitest';

function createPromptExtractHistoryEntry() {
  return {
    id: 'history-1',
    createdAt: Date.parse('2026-03-07T10:00:00.000Z'),
    runKind: 'smart' as const,
    source: 'gpt' as const,
    modeRequested: 'smart',
    fallbackUsed: false,
    autofixApplied: true,
    promptBefore: 'before',
    promptAfter: 'after',
    validationBeforeCount: 2,
    validationAfterCount: 1,
  };
}

function createSelectedGenerationPreview() {
  return {
    imageSrc: 'https://example.test/generated.png',
    output: {
      filename: 'generated-card.png',
      id: 'file-123',
      size: 4096,
    },
    runCreatedAt: '2026-03-07T10:15:00.000Z',
  };
}

export function createStudioInlineEditMockValue(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const selectedExtractHistory = createPromptExtractHistoryEntry();

  return {
    selectedSlot: {
      id: 'slot-123',
      name: 'Card Alpha',
    },
    slotInlineEditOpen: true,
    setSlotInlineEditOpen: vi.fn(),
    onCopyCardId: vi.fn(),
    selectedGenerationPreview: createSelectedGenerationPreview(),
    selectedGenerationModalDimensions: '1536 x 1024',
    slotUpdateBusy: false,
    onApplyLinkedVariantToCard: vi.fn(),
    setGenerationModalPreviewNaturalSize: vi.fn(),
    generationPreviewModalOpen: true,
    setGenerationPreviewModalOpen: vi.fn(),
    extractDraftPrompt: 'Prompt with {{style}}',
    setExtractDraftPrompt: vi.fn(),
    extractBusy: 'none',
    handleSmartExtraction: vi.fn(),
    handleProgrammaticExtraction: vi.fn(),
    handleAiExtraction: vi.fn(),
    handleSuggestUiControls: vi.fn(),
    handleApplyExtraction: vi.fn(),
    previewParams: { style: 'storybook' },
    extractError: 'Prompt needs cleanup',
    extractHistory: [selectedExtractHistory],
    studioSettings: {
      promptExtraction: {
        showValidationSummary: true,
      },
    },
    previewValidation: {
      before: [{ ruleId: 'before-1', title: 'Before Issue', message: 'before warning' }],
      after: [],
    },
    previewLeaves: [{ path: 'style', value: 'storybook' }],
    previewControls: { style: 'chips' },
    extractReviewOpen: true,
    setExtractReviewOpen: vi.fn(),
    selectedExtractHistory,
    selectedExtractDiffLines: [{ before: 'before', after: 'after', changed: true }],
    selectedExtractChanged: true,
    setSelectedExtractHistoryId: vi.fn(),
    setExtractHistory: vi.fn(),
    ...overrides,
  };
}

export function createStudioInlineEditMockModule(
  overrides:
    | Record<string, unknown>
    | (() => Record<string, unknown>)
): {
  useStudioInlineEdit: () => Record<string, unknown>;
} {
  return {
    useStudioInlineEdit: () => ({
      ...createStudioInlineEditMockValue(
        typeof overrides === 'function' ? overrides() : overrides
      ),
    }),
  };
}
