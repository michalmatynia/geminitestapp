// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LiveScripterResult } from '@/features/playwright/hooks/playwrightLiveScripter.result';
import type { SelectorRegistryEntry } from '@/shared/contracts/integrations/selector-registry';
import { buildSelectorRegistryProbeTemplateFingerprint } from '@/shared/lib/browser-execution/selector-registry-probe-template';

const {
  useSelectorRegistryMock,
  mutateAsyncMock,
  saveProbeSessionMutateAsyncMock,
  toastMock,
} = vi.hoisted(() => ({
  useSelectorRegistryMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  saveProbeSessionMutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/features/integrations/hooks/useSelectorRegistry', () => ({
  useSelectorRegistry: (...args: unknown[]) => useSelectorRegistryMock(...args),
  useSaveSelectorRegistryEntryMutation: () => ({
    isPending: false,
    mutateAsync: mutateAsyncMock,
  }),
  useSaveSelectorRegistryProbeSessionMutation: () => ({
    isPending: false,
    mutateAsync: saveProbeSessionMutateAsyncMock,
  }),
}));

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

import { LiveScripterProbePanel } from './LiveScripterProbePanel';

const registryEntry: SelectorRegistryEntry = {
  id: 'entry-1',
  namespace: 'amazon',
  profile: 'amazon',
  key: 'amazon.product.price',
  group: 'amazon.product',
  kind: 'selector',
  role: 'content_price',
  description: 'Price selector',
  valueType: 'string',
  valueJson: '".price"',
  itemCount: 1,
  preview: ['.price'],
  source: 'code',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  resolvedFromProfile: null,
  hasOverride: false,
  readOnly: false,
};

const createLiveScripterResult = (): LiveScripterResult => ({
  status: 'live',
  frame: null,
  pickedElement: null,
  probeResult: {
    type: 'probe_result',
    url: 'https://www.amazon.com/example-item',
    title: 'Example item',
    scope: 'main_content',
    sameOriginOnly: true,
    linkDepth: 0,
    maxPages: 1,
    scannedPages: 1,
    visitedUrls: ['https://www.amazon.com/example-item'],
    pages: [
      {
        url: 'https://www.amazon.com/example-item',
        title: 'Example item',
        suggestionCount: 1,
      },
    ],
    suggestionCount: 1,
    suggestions: [
      {
        suggestionId: 'price::signal',
        pageUrl: 'https://www.amazon.com/example-item',
        pageTitle: 'Example item',
        tag: 'span',
        id: null,
        classes: ['a-price'],
        textPreview: '$19.99',
        role: null,
        attrs: { class: 'a-price' },
        boundingBox: { x: 10, y: 20, width: 100, height: 24 },
        candidates: {
          css: '.a-price',
          xpath: '/html/body/main/span[1]',
          role: null,
          text: '$19.99',
          testId: null,
        },
        repeatedSiblingCount: 1,
        childLinkCount: 0,
        childImageCount: 0,
        classificationRole: 'content_price',
        draftTargetHints: ['price'],
        confidence: 0.96,
        evidence: ['Visible text or attributes look like a price.'],
      },
    ],
  },
  currentUrl: 'https://www.amazon.com/example-item',
  currentTitle: 'Example item',
  errorMessage: null,
  mode: 'drive',
  setMode: vi.fn(),
  start: vi.fn(),
  dispose: vi.fn(),
  send: vi.fn(),
  driveClick: vi.fn(),
  driveType: vi.fn(),
  driveScroll: vi.fn(),
  pickAt: vi.fn(),
  probeDom: vi.fn(),
  navigate: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  reload: vi.fn(),
  clearPickedElement: vi.fn(),
  clearProbeResult: vi.fn(),
});

describe('LiveScripterProbePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSelectorRegistryMock.mockReturnValue({
      data: {
        entries: [registryEntry],
      },
      isLoading: false,
    });
    mutateAsyncMock.mockResolvedValue({
      namespace: 'amazon',
      profile: 'amazon',
      key: 'amazon.product.price',
      itemCount: 1,
      preview: ['.a-price'],
      message: 'Amazon selector registry entry "amazon.product.price" saved for profile "amazon".',
    });
    saveProbeSessionMutateAsyncMock.mockResolvedValue({
      session: {
        id: 'probe-session-1',
        namespace: 'amazon',
        profile: 'amazon',
        sourceUrl: 'https://www.amazon.com/example-item',
        sourceTitle: 'Example item',
        scope: 'main_content',
        sameOriginOnly: true,
        linkDepth: 0,
        maxPages: 1,
        scannedPages: 1,
        visitedUrls: ['https://www.amazon.com/example-item'],
        pages: [
          {
            url: 'https://www.amazon.com/example-item',
            title: 'Example item',
            suggestionCount: 1,
          },
        ],
        suggestionCount: 1,
        suggestions: [],
        templateFingerprint: buildSelectorRegistryProbeTemplateFingerprint({
          sourceUrl: 'https://www.amazon.com/example-item',
          suggestions: [],
        }),
        createdAt: '2026-04-18T08:00:00.000Z',
        updatedAt: '2026-04-18T08:00:00.000Z',
      },
      message: 'Saved probe session for amazon profile "amazon".',
    });
  });

  it('runs the DOM probe from the live session controls', () => {
    const liveScripter = createLiveScripterResult();

    render(<LiveScripterProbePanel liveScripter={liveScripter} />);
    fireEvent.click(screen.getByRole('button', { name: 'Run Probe' }));

    expect(liveScripter.probeDom).toHaveBeenCalledWith({
      scope: 'main_content',
      maxNodes: 48,
      sameOriginOnly: true,
      linkDepth: 0,
      maxPages: 1,
    });
  });

  it('promotes classified probe suggestions into the selector registry', async () => {
    render(<LiveScripterProbePanel liveScripter={createLiveScripterResult()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Promote To Registry' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Promote To Registry' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        namespace: 'amazon',
        profile: 'amazon',
        key: 'amazon.product.price',
        valueJson: '"'.concat('.a-price', '"'),
        role: 'content_price',
      });
    });

    expect(toastMock).toHaveBeenCalled();
  });

  it('saves the current probe result as a stored probe session', async () => {
    render(<LiveScripterProbePanel liveScripter={createLiveScripterResult()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Probe Session' }));

    await waitFor(() => {
      expect(saveProbeSessionMutateAsyncMock).toHaveBeenCalledWith({
        namespace: 'amazon',
        profile: 'amazon',
        probeResult: expect.objectContaining({
          url: 'https://www.amazon.com/example-item',
          suggestionCount: 1,
        }),
      });
    });

    expect(toastMock).toHaveBeenCalled();
  });

  it('shows visited page summaries for multi-page probe results', async () => {
    const liveScripter = createLiveScripterResult();
    liveScripter.probeResult = {
      ...liveScripter.probeResult!,
      linkDepth: 1,
      maxPages: 2,
      scannedPages: 2,
      visitedUrls: [
        'https://www.amazon.com/example-item',
        'https://www.amazon.com/example-item-2',
      ],
      pages: [
        {
          url: 'https://www.amazon.com/example-item',
          title: 'Example item',
          suggestionCount: 1,
        },
        {
          url: 'https://www.amazon.com/example-item-2',
          title: 'Example item 2',
          suggestionCount: 2,
        },
      ],
    };

    render(<LiveScripterProbePanel liveScripter={liveScripter} />);

    expect(screen.getByText('Visited Pages')).toBeInTheDocument();
    expect(screen.getByText('Example item 2 (2)')).toBeInTheDocument();
    expect(screen.getByText(/Link depth 1, max pages 2\./)).toBeInTheDocument();
  });
});
