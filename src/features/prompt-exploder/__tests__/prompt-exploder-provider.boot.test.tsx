import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptExploderProvider } from '@/features/prompt-exploder/context/PromptExploderProvider';
import {
  useDocumentState,
  useLibraryState,
  useSettingsState,
} from '@/features/prompt-exploder/context';
import {
  buildPromptExploderSegmentationRecord,
  PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY,
} from '@/features/prompt-exploder/segmentation-library';
import {
  promptExploderDocumentSchema,
  type PromptExploderDocument,
  type PromptExploderSegment,
} from '@/shared/contracts/prompt-exploder';
import { serializeSetting } from '@/shared/utils/settings-json';

const mocks = vi.hoisted(() => ({
  searchParams: 'returnTo=%2Fadmin%2Fimage-studio',
  settingsMap: new Map<string, string>(),
  updateSettingMutateAsync: vi.fn(),
  updateSettingsBulkMutateAsync: vi.fn(),
  refetch: vi.fn(),
  toast: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.routerPush,
  }),
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}));

vi.mock('@/shared/ui', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui')>('@/shared/ui');
  return {
    ...actual,
    useToast: () => ({
      toast: mocks.toast,
    }),
  };
});

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => ({
    data: mocks.settingsMap,
    isLoading: false,
    isRefetching: false,
    refetch: mocks.refetch,
  }),
  useUpdateSetting: () => ({
    mutateAsync: mocks.updateSettingMutateAsync,
  }),
  useUpdateSettingsBulk: () => ({
    mutateAsync: mocks.updateSettingsBulkMutateAsync,
  }),
}));

const buildSegment = (id: string): PromptExploderSegment => ({
  id,
  type: 'assigned_text',
  title: `Segment ${id}`,
  includeInOutput: true,
  text: `Text ${id}`,
  raw: `Text ${id}`,
  code: null,
  condition: null,
  items: [],
  listItems: [],
  subsections: [],
  paramsText: '',
  paramsObject: null,
  paramUiControls: {},
  paramComments: {},
  paramDescriptions: {},
  matchedPatternIds: [],
  matchedPatternLabels: [],
  matchedSequenceLabels: [],
  confidence: 0.7,
  validationResults: [],
  segments: [],
});

const buildDocument = (): PromptExploderDocument =>
  promptExploderDocumentSchema.parse({
    id: 'doc_ctx',
    version: 1,
    sourcePrompt: 'Seeded prompt',
    reassembledPrompt: 'Reassembled output',
    segments: [buildSegment('a')],
  });

function Harness(): React.JSX.Element {
  const { returnTarget } = useDocumentState();
  const { segmentationLibrary } = useSettingsState();
  const { segmentationRecords } = useLibraryState();

  return (
    <div data-testid='provider-ready'>
      {returnTarget}:{segmentationLibrary.totalCaptured}:{segmentationRecords.length}
    </div>
  );
}

describe('PromptExploderProvider boot', () => {
  beforeEach(() => {
    mocks.searchParams = 'returnTo=%2Fadmin%2Fimage-studio';
    mocks.updateSettingMutateAsync.mockReset();
    mocks.updateSettingsBulkMutateAsync.mockReset();
    mocks.refetch.mockReset();
    mocks.toast.mockReset();
    mocks.routerPush.mockReset();

    const seededRecord = buildPromptExploderSegmentationRecord({
      promptText: 'Seeded prompt',
      documentState: buildDocument(),
      now: '2026-03-01T09:30:00.000Z',
      returnTarget: 'image-studio',
      validationScope: 'prompt_exploder',
      validationRuleStack: 'prompt-exploder',
      createRecordId: () => 'segctx_seeded',
    });

    mocks.settingsMap = new Map<string, string>([
      [
        PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY,
        serializeSetting({
          version: 1,
          records: seededRecord ? [seededRecord] : [],
        }),
      ],
    ]);
    mocks.updateSettingMutateAsync.mockResolvedValue({});
    mocks.updateSettingsBulkMutateAsync.mockResolvedValue({});
    mocks.refetch.mockResolvedValue({});
  });

  it('renders the full provider tree without context-order runtime errors', () => {
    render(
      <PromptExploderProvider>
        <Harness />
      </PromptExploderProvider>
    );

    expect(screen.getByTestId('provider-ready')).toHaveTextContent('image-studio:1:1');
  });
});
