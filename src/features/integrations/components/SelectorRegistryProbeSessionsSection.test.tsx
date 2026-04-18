// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  SelectorRegistryEntry,
  SelectorRegistryProbeSession,
} from '@/shared/contracts/integrations/selector-registry';
import { buildSelectorRegistryProbeTemplateFingerprint } from '@/shared/lib/browser-execution/selector-registry-probe-template';

const {
  archiveMutationMock,
  restoreMutationMock,
  saveMutationMock,
  deleteMutationMock,
  toastMock,
} = vi.hoisted(() => ({
  archiveMutationMock: vi.fn(),
  restoreMutationMock: vi.fn(),
  saveMutationMock: vi.fn(),
  deleteMutationMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/features/integrations/hooks/useSelectorRegistry', () => ({
  useArchiveSelectorRegistryProbeSessionMutation: () => ({
    isPending: false,
    mutateAsync: archiveMutationMock,
  }),
  useRestoreSelectorRegistryProbeSessionMutation: () => ({
    isPending: false,
    mutateAsync: restoreMutationMock,
  }),
  useSaveSelectorRegistryEntryMutation: () => ({
    isPending: false,
    mutateAsync: saveMutationMock,
  }),
  useDeleteSelectorRegistryProbeSessionMutation: () => ({
    isPending: false,
    mutateAsync: deleteMutationMock,
  }),
}));

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

import { SelectorRegistryProbeSessionsSection } from './SelectorRegistryProbeSessionsSection';

const promotableEntry: SelectorRegistryEntry = {
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

const alternatePromotableEntry: SelectorRegistryEntry = {
  ...promotableEntry,
  id: 'entry-2',
  key: 'amazon.product.sale_price',
  description: 'Alternate price selector',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const probeSession: SelectorRegistryProbeSession = {
  id: 'probe-session-1',
  namespace: 'amazon',
  profile: 'amazon',
  sourceUrl: 'https://www.amazon.com/example-item-1',
  sourceTitle: 'Example item 1',
  scope: 'main_content',
  sameOriginOnly: true,
  linkDepth: 0,
  maxPages: 1,
  scannedPages: 1,
  visitedUrls: ['https://www.amazon.com/example-item-1'],
  pages: [
    {
      url: 'https://www.amazon.com/example-item-1',
      title: 'Example item 1',
      suggestionCount: 1,
    },
  ],
  suggestionCount: 1,
  suggestions: [
    {
      suggestionId: 'price::signal',
      pageUrl: 'https://www.amazon.com/example-item-1',
      pageTitle: 'Example item 1',
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
  templateFingerprint: buildSelectorRegistryProbeTemplateFingerprint({
    sourceUrl: 'https://www.amazon.com/example-item-1',
    suggestions: [
      {
        suggestionId: 'price::signal',
        pageUrl: 'https://www.amazon.com/example-item-1',
        pageTitle: 'Example item 1',
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
  }),
  archivedAt: null,
  createdAt: '2026-04-18T08:00:00.000Z',
  updatedAt: '2026-04-18T08:00:00.000Z',
};

const probeSessionVariant: SelectorRegistryProbeSession = {
  ...probeSession,
  id: 'probe-session-2',
  sourceUrl: 'https://www.amazon.com/example-item-2',
  sourceTitle: 'Example item 2',
  visitedUrls: ['https://www.amazon.com/example-item-2'],
  pages: [
    {
      url: 'https://www.amazon.com/example-item-2',
      title: 'Example item 2',
      suggestionCount: 1,
    },
  ],
  suggestions: [
    {
      ...probeSession.suggestions[0],
      suggestionId: 'price::signal-2',
      pageUrl: 'https://www.amazon.com/example-item-2',
      pageTitle: 'Example item 2',
    },
  ],
  templateFingerprint: buildSelectorRegistryProbeTemplateFingerprint({
    sourceUrl: 'https://www.amazon.com/example-item-2',
    suggestions: [
      {
        ...probeSession.suggestions[0],
        suggestionId: 'price::signal-2',
        pageUrl: 'https://www.amazon.com/example-item-2',
        pageTitle: 'Example item 2',
      },
    ],
  }),
  archivedAt: null,
  createdAt: '2026-04-18T09:00:00.000Z',
  updatedAt: '2026-04-18T09:00:00.000Z',
};

const archivedProbeSession: SelectorRegistryProbeSession = {
  ...probeSession,
  id: 'probe-session-archived',
  sourceUrl: 'https://www.amazon.com/example-item-archived',
  sourceTitle: 'Archived example item',
  visitedUrls: ['https://www.amazon.com/example-item-archived'],
  pages: [
    {
      url: 'https://www.amazon.com/example-item-archived',
      title: 'Archived example item',
      suggestionCount: 1,
    },
  ],
  suggestions: [
    {
      ...probeSession.suggestions[0],
      suggestionId: 'price::signal-archived',
      pageUrl: 'https://www.amazon.com/example-item-archived',
      pageTitle: 'Archived example item',
    },
  ],
  templateFingerprint: buildSelectorRegistryProbeTemplateFingerprint({
    sourceUrl: 'https://www.amazon.com/example-item-archived',
    suggestions: [
      {
        ...probeSession.suggestions[0],
        suggestionId: 'price::signal-archived',
        pageUrl: 'https://www.amazon.com/example-item-archived',
        pageTitle: 'Archived example item',
      },
    ],
  }),
  archivedAt: '2026-04-18T11:00:00.000Z',
};

describe('SelectorRegistryProbeSessionsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    archiveMutationMock.mockResolvedValue({
      id: 'probe-session-1',
      archived: true,
      archivedAt: '2026-04-18T10:00:00.000Z',
      message: 'Archived probe session.',
    });
    restoreMutationMock.mockResolvedValue({
      id: 'probe-session-archived',
      restored: true,
      message: 'Restored probe session to active review.',
    });
    saveMutationMock.mockResolvedValue({
      namespace: 'amazon',
      profile: 'amazon',
      key: 'amazon.product.price',
      itemCount: 1,
      preview: ['.a-price'],
      message: 'Saved selector.',
    });
    deleteMutationMock.mockResolvedValue({
      id: 'probe-session-1',
      deleted: true,
      message: 'Deleted probe session.',
    });
  });

  it('renders stored probe sessions with review details', () => {
    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession]}
        promotableEntries={[promotableEntry]}
        isReadOnly={false}
        showArchived={false}
        onShowArchivedChange={vi.fn()}
      />
    );

    expect(screen.getByText('Probe Sessions')).toBeInTheDocument();
    expect(screen.getAllByText('Example item 1').length).toBeGreaterThan(0);
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('Example item 1 (1)')).toBeInTheDocument();
  });

  it('scrolls and focuses the review section when arriving with the probe-sessions hash', async () => {
    const scrollIntoViewMock = vi.fn();
    const focusMock = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    HTMLElement.prototype.focus = focusMock;
    window.history.replaceState({}, '', '/admin/integrations/selectors#probe-sessions');

    try {
      render(
        <SelectorRegistryProbeSessionsSection
          namespace='amazon'
          profile='amazon'
          sessions={[probeSession]}
          promotableEntries={[promotableEntry]}
          isReadOnly={false}
          showArchived={false}
          onShowArchivedChange={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: 'start' });
      });
      expect(focusMock).toHaveBeenCalledWith({ preventScroll: true });
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      HTMLElement.prototype.focus = originalFocus;
    }
  });

  it('groups repeated stored probe sessions under one template cluster', () => {
    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession, probeSessionVariant]}
        promotableEntries={[promotableEntry]}
        isReadOnly={false}
        showArchived={false}
        onShowArchivedChange={vi.fn()}
      />
    );

    expect(screen.getByText('1 templates')).toBeInTheDocument();
    expect(screen.getByText('www.amazon.com/example-item-:n')).toBeInTheDocument();
    expect(screen.getByText('2 sessions')).toBeInTheDocument();
    expect(screen.getByText('2 stored')).toBeInTheDocument();
    expect(screen.getByText('2 ready')).toBeInTheDocument();
  });

  it('carries a chosen key forward across unresolved suggestions in the same template', async () => {
    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession, probeSessionVariant]}
        promotableEntries={[promotableEntry, alternatePromotableEntry]}
        isReadOnly={false}
        showArchived={false}
        onShowArchivedChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('combobox')[0]);
    fireEvent.click(screen.getByRole('option', { name: 'amazon.product.sale_price' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Carry-forward active for content_price -> amazon.product.sale_price'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Source for carry-forward')).toBeInTheDocument();
      expect(
        screen.getByText('Inherited from template: amazon.product.sale_price')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Promote Ready In Template' }));

    await waitFor(() => {
      expect(saveMutationMock).toHaveBeenCalledTimes(2);
    });
    expect(saveMutationMock).toHaveBeenNthCalledWith(1, {
      namespace: 'amazon',
      profile: 'amazon',
      key: 'amazon.product.sale_price',
      valueJson: '".a-price"',
      role: 'content_price',
    });
    expect(saveMutationMock).toHaveBeenNthCalledWith(2, {
      namespace: 'amazon',
      profile: 'amazon',
      key: 'amazon.product.sale_price',
      valueJson: '".a-price"',
      role: 'content_price',
    });
  });

  it('promotes a stored probe suggestion into the selector registry', async () => {
    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession]}
        promotableEntries={[promotableEntry]}
        isReadOnly={false}
        showArchived={false}
        onShowArchivedChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Promote To Registry' }));

    await waitFor(() => {
      expect(saveMutationMock).toHaveBeenCalledWith({
        namespace: 'amazon',
        profile: 'amazon',
        key: 'amazon.product.price',
        valueJson: '".a-price"',
        role: 'content_price',
      });
    });
    expect(toastMock).toHaveBeenCalled();
  });

  it('bulk promotes all matching stored probe suggestions for a session', async () => {
    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession]}
        promotableEntries={[promotableEntry]}
        isReadOnly={false}
        showArchived={false}
        onShowArchivedChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Promote All Matching' }));

    await waitFor(() => {
      expect(saveMutationMock).toHaveBeenCalledWith({
        namespace: 'amazon',
        profile: 'amazon',
        key: 'amazon.product.price',
        valueJson: '".a-price"',
        role: 'content_price',
      });
    });
    expect(toastMock).toHaveBeenCalled();
  });

  it('promotes and archives a fully ready stored probe session', async () => {
    archiveMutationMock.mockResolvedValueOnce({
      id: 'probe-session-1',
      archived: true,
      archivedAt: '2026-04-18T10:00:00.000Z',
      message: 'Archived probe session.',
    });

    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession]}
        promotableEntries={[promotableEntry]}
        isReadOnly={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Promote And Archive Session' }));

    await waitFor(() => {
      expect(saveMutationMock).toHaveBeenCalledTimes(1);
      expect(archiveMutationMock).toHaveBeenCalledWith({ id: 'probe-session-1' });
    });
    expect(toastMock).toHaveBeenCalledWith(
      'Promoted 1 stored probe suggestion and archived the stored probe session.',
      { variant: 'success' }
    );
  });

  it('disables promote-and-archive for a stored probe session when not fully ready', () => {
    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession]}
        promotableEntries={[]}
        isReadOnly={false}
        showArchived={false}
        onShowArchivedChange={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Promote And Archive Session' })
    ).toBeDisabled();
  });

  it('bulk promotes all ready suggestions for a clustered template', async () => {
    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession, probeSessionVariant]}
        promotableEntries={[promotableEntry]}
        isReadOnly={false}
        showArchived={false}
        onShowArchivedChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Promote Ready In Template' }));

    await waitFor(() => {
      expect(saveMutationMock).toHaveBeenCalledTimes(2);
    });
    expect(saveMutationMock).toHaveBeenNthCalledWith(1, {
      namespace: 'amazon',
      profile: 'amazon',
      key: 'amazon.product.price',
      valueJson: '".a-price"',
      role: 'content_price',
    });
    expect(saveMutationMock).toHaveBeenNthCalledWith(2, {
      namespace: 'amazon',
      profile: 'amazon',
      key: 'amazon.product.price',
      valueJson: '".a-price"',
      role: 'content_price',
    });
    expect(toastMock).toHaveBeenCalled();
  });

  it('promotes and archives a fully ready clustered template', async () => {
    archiveMutationMock
      .mockResolvedValueOnce({
        id: 'probe-session-2',
        archived: true,
        archivedAt: '2026-04-18T10:00:00.000Z',
        message: 'Archived probe session.',
      })
      .mockResolvedValueOnce({
        id: 'probe-session-1',
        archived: true,
        archivedAt: '2026-04-18T10:01:00.000Z',
        message: 'Archived probe session.',
      });

    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession, probeSessionVariant]}
        promotableEntries={[promotableEntry]}
        isReadOnly={false}
        showArchived={false}
        onShowArchivedChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Promote And Archive Template' }));

    await waitFor(() => {
      expect(saveMutationMock).toHaveBeenCalledTimes(2);
      expect(archiveMutationMock).toHaveBeenCalledTimes(2);
    });
    expect(archiveMutationMock).toHaveBeenNthCalledWith(1, { id: 'probe-session-2' });
    expect(archiveMutationMock).toHaveBeenNthCalledWith(2, { id: 'probe-session-1' });
    expect(toastMock).toHaveBeenCalledWith(
      'Promoted 2 stored probe suggestions and archived 2 stored probe sessions in this template.',
      { variant: 'success' }
    );
  });

  it('disables promote-and-archive when the clustered template is not fully ready', () => {
    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession]}
        promotableEntries={[]}
        isReadOnly={false}
        showArchived={false}
        onShowArchivedChange={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Promote And Archive Template' })
    ).toBeDisabled();
  });

  it('rejects a stored probe session', async () => {
    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession]}
        promotableEntries={[promotableEntry]}
        isReadOnly={false}
        showArchived={false}
        onShowArchivedChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reject Session' }));

    await waitFor(() => {
      expect(deleteMutationMock).toHaveBeenCalledWith({ id: 'probe-session-1' });
    });
    expect(toastMock).toHaveBeenCalled();
  });

  it('rejects every stored probe session in a clustered template', async () => {
    render(
      <SelectorRegistryProbeSessionsSection
        namespace='amazon'
        profile='amazon'
        sessions={[probeSession, probeSessionVariant]}
        promotableEntries={[promotableEntry]}
        isReadOnly={false}
        showArchived={false}
        onShowArchivedChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reject Template' }));

    await waitFor(() => {
      expect(deleteMutationMock).toHaveBeenCalledTimes(2);
    });
    expect(deleteMutationMock).toHaveBeenNthCalledWith(1, { id: 'probe-session-2' });
    expect(deleteMutationMock).toHaveBeenNthCalledWith(2, { id: 'probe-session-1' });
    expect(toastMock).toHaveBeenCalled();
  });

  it('reveals archived probe sessions only when explicitly requested', () => {
    function Harness() {
      const [showArchived, setShowArchived] = useState(false);
      return (
        <SelectorRegistryProbeSessionsSection
          namespace='amazon'
          profile='amazon'
          sessions={[probeSession, archivedProbeSession]}
          promotableEntries={[promotableEntry]}
          isReadOnly={false}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
        />
      );
    }

    render(<Harness />);

    expect(screen.queryByText('Archived Sessions')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show Archived' }));

    expect(screen.getByText('Archived Sessions')).toBeInTheDocument();
    expect(screen.getAllByText('Archived example item').length).toBeGreaterThan(0);
    expect(screen.getByText(/Archived Apr/)).toBeInTheDocument();
    expect(
      screen.getByText('Archived probe suggestion. Review history only until restored.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Promote All Matching' })).toBeInTheDocument();
  });

  it('restores an archived probe session back into active review', async () => {
    function Harness() {
      const [showArchived, setShowArchived] = useState(true);
      return (
        <SelectorRegistryProbeSessionsSection
          namespace='amazon'
          profile='amazon'
          sessions={[probeSession, archivedProbeSession]}
          promotableEntries={[promotableEntry]}
          isReadOnly={false}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Restore Session' }));

    await waitFor(() => {
      expect(restoreMutationMock).toHaveBeenCalledWith({ id: 'probe-session-archived' });
    });
    expect(toastMock).toHaveBeenCalledWith('Restored archived probe session to active review.', {
      variant: 'success',
    });
  });

  it('restores an archived template back into active review', async () => {
    function Harness() {
      const [showArchived, setShowArchived] = useState(true);
      return (
        <SelectorRegistryProbeSessionsSection
          namespace='amazon'
          profile='amazon'
          sessions={[probeSession, archivedProbeSession]}
          promotableEntries={[promotableEntry]}
          isReadOnly={false}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Restore Template' }));

    await waitFor(() => {
      expect(restoreMutationMock).toHaveBeenCalledWith({ id: 'probe-session-archived' });
    });
    expect(toastMock).toHaveBeenCalledWith(
      'Restored 1 archived probe session in this template to active review.',
      { variant: 'success' }
    );
  });
});
