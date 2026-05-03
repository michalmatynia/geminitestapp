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
  syncSelectorRegistryMutateAsyncMock,
  mutateSelectorRegistryProfileMutateAsyncMock,
  toastMock,
} = vi.hoisted(() => ({
  useSelectorRegistryMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  saveProbeSessionMutateAsyncMock: vi.fn(),
  syncSelectorRegistryMutateAsyncMock: vi.fn(),
  mutateSelectorRegistryProfileMutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/features/integrations/hooks/useSelectorRegistry', () => ({
  useSelectorRegistry: (...args: unknown[]) => useSelectorRegistryMock(...args),
  useSaveSelectorRegistryEntryMutation: () => ({
    isPending: false,
    mutateAsync: mutateAsyncMock,
  }),
  useClassifyProbeSuggestionsMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useSaveSelectorRegistryProbeSessionMutation: () => ({
    isPending: false,
    mutateAsync: saveProbeSessionMutateAsyncMock,
  }),
  useSyncSelectorRegistryMutation: () => ({
    isPending: false,
    mutateAsync: syncSelectorRegistryMutateAsyncMock,
  }),
  useMutateSelectorRegistryProfileMutation: () => ({
    isPending: false,
    mutateAsync: mutateSelectorRegistryProfileMutateAsyncMock,
  }),
}));

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: () => ({
    effectiveModelId: null,
  }),
}));

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

const alternateRegistryEntry: SelectorRegistryEntry = {
  ...registryEntry,
  id: 'entry-2',
  key: 'amazon.product.sale_price',
  description: 'Alternate price selector',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const customRegistryEntry: SelectorRegistryEntry = {
  ...registryEntry,
  id: 'custom-entry-1',
  namespace: 'custom',
  profile: 'example_shop_com',
  key: 'custom.content.price',
  group: 'custom.content',
  description: 'Custom website price selector',
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
        entries: [registryEntry, alternateRegistryEntry],
        probeSessions: [
          {
            id: 'probe-session-active',
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
            pages: [],
            suggestionCount: 1,
            suggestions: [],
            templateFingerprint: buildSelectorRegistryProbeTemplateFingerprint({
              sourceUrl: 'https://www.amazon.com/example-item',
              suggestions: [],
            }),
            archivedAt: null,
            createdAt: '2026-04-18T07:00:00.000Z',
            updatedAt: '2026-04-18T07:00:00.000Z',
          },
          {
            id: 'probe-session-archived',
            namespace: 'amazon',
            profile: 'amazon',
            sourceUrl: 'https://www.amazon.com/example-item-archived',
            sourceTitle: 'Archived example item',
            scope: 'main_content',
            sameOriginOnly: true,
            linkDepth: 0,
            maxPages: 1,
            scannedPages: 1,
            visitedUrls: ['https://www.amazon.com/example-item-archived'],
            pages: [],
            suggestionCount: 1,
            suggestions: [],
            templateFingerprint: buildSelectorRegistryProbeTemplateFingerprint({
              sourceUrl: 'https://www.amazon.com/example-item-archived',
              suggestions: [],
            }),
            archivedAt: '2026-04-18T11:00:00.000Z',
            createdAt: '2026-04-18T08:00:00.000Z',
            updatedAt: '2026-04-18T11:00:00.000Z',
          },
        ],
        profileMetadata: null,
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
        archivedAt: null,
        createdAt: '2026-04-18T08:00:00.000Z',
        updatedAt: '2026-04-18T08:00:00.000Z',
      },
      message: 'Saved probe session for amazon profile "amazon".',
    });
    syncSelectorRegistryMutateAsyncMock.mockResolvedValue({
      namespace: 'amazon',
      profile: 'amazon-site-x',
      insertedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      total: 0,
      syncedAt: '2026-04-18T08:30:00.000Z',
      message: 'Seeded selector registry profile "amazon-site-x".',
    });
    mutateSelectorRegistryProfileMutateAsyncMock.mockResolvedValue({
      namespace: 'amazon',
      action: 'clone_profile',
      profile: 'amazon',
      targetProfile: 'amazon-site-clone',
      affectedEntries: 2,
      message: 'Cloned selector registry profile "amazon" to "amazon-site-clone".',
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

  it('renders an empty probe state without repeatedly resetting selection state', () => {
    const liveScripter = createLiveScripterResult();
    liveScripter.probeResult = null;

    render(<LiveScripterProbePanel liveScripter={liveScripter} />);

    expect(screen.getByText('No probe results yet.')).toBeInTheDocument();
  });

  it('shows probe backlog and archived history counts from selector-registry review', () => {
    render(<LiveScripterProbePanel liveScripter={createLiveScripterResult()} />);

    expect(useSelectorRegistryMock).toHaveBeenCalledWith({
      namespace: 'amazon',
      profile: 'amazon',
      effective: true,
      includeArchived: true,
    });
    expect(
      screen.getByText('Current template: www.amazon.com/example-item')
    ).toBeInTheDocument();
    expect(screen.getByText('Probe backlog: 1 session / 1 template')).toBeInTheDocument();
    expect(screen.getByText('Probe history: 1 archived session / 1 template')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Probe backlog: 1 session / 1 template' })
    ).toHaveAttribute(
      'href',
      '/admin/integrations/selectors?namespace=amazon&profile=amazon#probe-sessions'
    );
    expect(
      screen.getByRole('link', { name: 'Probe history: 1 archived session / 1 template' })
    ).toHaveAttribute(
      'href',
      '/admin/integrations/selectors?namespace=amazon&profile=amazon&includeArchived=true#probe-sessions'
    );
  });

  it('infers custom namespace and hostname-based registry id for unknown websites', () => {
    useSelectorRegistryMock.mockReturnValueOnce({
      data: {
        entries: [customRegistryEntry],
        probeSessions: [],
        profileMetadata: null,
      },
      isLoading: false,
    });
    const liveScripter = createLiveScripterResult();
    liveScripter.currentUrl = 'https://www.example-shop.com/item/123';
    liveScripter.probeResult = {
      ...liveScripter.probeResult!,
      url: 'https://www.example-shop.com/item/123',
      title: 'Example shop item',
      pages: [
        {
          url: 'https://www.example-shop.com/item/123',
          title: 'Example shop item',
          suggestionCount: 1,
        },
      ],
      visitedUrls: ['https://www.example-shop.com/item/123'],
      suggestions: [
        {
          ...liveScripter.probeResult!.suggestions[0],
          pageUrl: 'https://www.example-shop.com/item/123',
          pageTitle: 'Example shop item',
        },
      ],
    };

    render(<LiveScripterProbePanel liveScripter={liveScripter} />);

    expect(useSelectorRegistryMock).toHaveBeenCalledWith({
      namespace: 'custom',
      profile: 'example_shop_com',
      effective: true,
      includeArchived: true,
    });
    expect(screen.getByText('Custom / example_shop_com')).toBeInTheDocument();
  });

  it('creates a custom registry and stores the current site as its probe target', async () => {
    useSelectorRegistryMock.mockReturnValueOnce({
      data: {
        entries: [customRegistryEntry],
        probeSessions: [],
        profileMetadata: null,
      },
      isLoading: false,
    });
    syncSelectorRegistryMutateAsyncMock.mockResolvedValueOnce({
      namespace: 'custom',
      profile: 'example_shop_clone',
      insertedCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      total: 0,
      syncedAt: '2026-04-18T08:30:00.000Z',
      message: 'Seeded selector registry profile "example_shop_clone".',
    });
    mutateSelectorRegistryProfileMutateAsyncMock.mockResolvedValueOnce({
      namespace: 'custom',
      action: 'set_probe_url',
      profile: 'example_shop_clone',
      targetProfile: null,
      probeOrigin: 'https://www.example-shop.com',
      probePathHint: '/item',
      probeUrl: 'https://www.example-shop.com/item',
      affectedEntries: 0,
      message: 'Saved probe site URL for custom selector registry "example_shop_clone".',
    });

    const liveScripter = createLiveScripterResult();
    liveScripter.currentUrl = 'https://www.example-shop.com/item/123';
    liveScripter.probeResult = {
      ...liveScripter.probeResult!,
      url: 'https://www.example-shop.com/item/123',
      title: 'Example shop item',
    };

    render(<LiveScripterProbePanel liveScripter={liveScripter} />);

    fireEvent.change(screen.getByLabelText('New Registry'), {
      target: { value: 'example_shop_clone' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Seeded Registry' }));

    await waitFor(() => {
      expect(syncSelectorRegistryMutateAsyncMock).toHaveBeenCalledWith({
        namespace: 'custom',
        profile: 'example_shop_clone',
      });
      expect(mutateSelectorRegistryProfileMutateAsyncMock).toHaveBeenCalledWith({
        action: 'set_probe_url',
        namespace: 'custom',
        profile: 'example_shop_clone',
        probeUrl: 'https://www.example-shop.com/item/123',
      });
    });
  });

  it('creates a seeded registry profile directly from the probe panel', async () => {
    render(<LiveScripterProbePanel liveScripter={createLiveScripterResult()} />);

    fireEvent.change(screen.getByLabelText('New Registry'), {
      target: { value: 'amazon-site-x' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Seeded Registry' }));

    await waitFor(() => {
      expect(syncSelectorRegistryMutateAsyncMock).toHaveBeenCalledWith({
        namespace: 'amazon',
        profile: 'amazon-site-x',
      });
    });

    expect(screen.getByLabelText('Active Registry')).toHaveValue('amazon-site-x');
    expect(toastMock).toHaveBeenCalledWith(
      'Seeded selector registry profile "amazon-site-x".',
      { variant: 'success' }
    );
  });

  it('clones the current registry profile directly from the probe panel', async () => {
    render(<LiveScripterProbePanel liveScripter={createLiveScripterResult()} />);

    fireEvent.change(screen.getByLabelText('New Registry'), {
      target: { value: 'amazon-site-clone' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clone Current Registry' }));

    await waitFor(() => {
      expect(mutateSelectorRegistryProfileMutateAsyncMock).toHaveBeenCalledWith({
        action: 'clone_profile',
        namespace: 'amazon',
        sourceProfile: 'amazon',
        targetProfile: 'amazon-site-clone',
      });
    });

    expect(screen.getByLabelText('Active Registry')).toHaveValue(
      'amazon-site-clone'
    );
    expect(toastMock).toHaveBeenCalledWith(
      'Cloned selector registry profile "amazon" to "amazon-site-clone".',
      { variant: 'success' }
    );
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

  it('shows likely carry-forward summary for same-role probe suggestions and updates it after manual key selection', async () => {
    const liveScripter = createLiveScripterResult();
    liveScripter.probeResult = {
      ...liveScripter.probeResult!,
      suggestionCount: 2,
      suggestions: [
        ...liveScripter.probeResult!.suggestions,
        {
          ...liveScripter.probeResult!.suggestions[0],
          suggestionId: 'price::signal-2',
          pageUrl: 'https://www.amazon.com/example-item?slot=2',
          textPreview: '$29.99',
          candidates: {
            ...liveScripter.probeResult!.suggestions[0].candidates,
            css: '.a-price.secondary',
            xpath: '/html/body/main/span[2]',
          },
        },
      ],
    };

    render(<LiveScripterProbePanel liveScripter={liveScripter} />);

    expect(
      screen.getByText('Likely carry-forward for content_price -> amazon.product.price')
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText('Promote As')[0]);
    fireEvent.click(screen.getByRole('option', { name: 'amazon.product.sale_price' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Likely carry-forward for content_price -> amazon.product.sale_price'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Source for carry-forward')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Will inherit on save/review: amazon.product.sale_price'
        )
      ).toBeInTheDocument();
    });
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

    expect(screen.getByText('saved just now')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Saved "Example item" to active review under template www.amazon.com/example-item from 1 scanned page.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open active review' })).toHaveAttribute(
      'href',
      '/admin/integrations/selectors?namespace=amazon&profile=amazon#probe-sessions'
    );
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
