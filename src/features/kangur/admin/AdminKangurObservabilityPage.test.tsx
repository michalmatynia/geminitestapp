/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createKnowledgeGraphPreviewResponse,
  createSummary,
} from './AdminKangurObservabilityPage.fixtures';

const {
  useKangurObservabilitySummaryMock,
  useKangurKnowledgeGraphStatusMock,
  apiPostMock,
  refetchMock,
  knowledgeGraphStatusRefetchMock,
  replaceMock,
  navigationState,
  disabledDocsTooltipsMock,
  getDisabledDocsTooltipsMock,
} = vi.hoisted(() => ({
  useKangurObservabilitySummaryMock: vi.fn(),
  useKangurKnowledgeGraphStatusMock: vi.fn(),
  apiPostMock: vi.fn(),
  refetchMock: vi.fn(),
  knowledgeGraphStatusRefetchMock: vi.fn(),
  replaceMock: vi.fn(),
  navigationState: {
    pathname: '/admin/kangur/observability',
    search: '',
  },
  disabledDocsTooltipsMock: {
    enabled: false,
    helpSettings: {
      version: 1,
      docsTooltips: {
        enabled: false,
        homeEnabled: false,
        lessonsEnabled: false,
        testsEnabled: false,
        profileEnabled: false,
        parentDashboardEnabled: false,
        adminEnabled: false,
      },
    },
  } as const,
  getDisabledDocsTooltipsMock: vi.fn(),
}));

getDisabledDocsTooltipsMock.mockReturnValue(disabledDocsTooltipsMock);

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({
    replace: replaceMock,
  }),
  useSearchParams: () => new URLSearchParams(navigationState.search),
}));

vi.mock('@/features/kangur/observability/hooks', () => ({
  useKangurObservabilitySummary: useKangurObservabilitySummaryMock,
  useKangurKnowledgeGraphStatus: useKangurKnowledgeGraphStatusMock,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: getDisabledDocsTooltipsMock,
}));

import { AdminKangurObservabilityPage } from './AdminKangurObservabilityPage';

describe('AdminKangurObservabilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationState.pathname = '/admin/kangur/observability';
    navigationState.search = '';
    apiPostMock.mockImplementation(async (path: string) => {
      if (path === '/api/kangur/knowledge-graph/sync') {
        return {
          sync: {
            graphKey: 'kangur-website-help-v1',
            locale: 'pl',
            nodeCount: 87,
            edgeCount: 108,
            withEmbeddings: true,
          },
          status: createSummary('24h').knowledgeGraphStatus,
        };
      }

      if (path === '/api/kangur/ai-tutor/knowledge-graph/preview') {
        return createKnowledgeGraphPreviewResponse();
      }

      throw new Error(`Unexpected POST ${path}`);
    });
    knowledgeGraphStatusRefetchMock.mockResolvedValue(undefined);
    useKangurObservabilitySummaryMock.mockImplementation((range: '24h' | '7d' | '30d') => ({
      data: createSummary(range),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchMock,
    }));
    useKangurKnowledgeGraphStatusMock.mockImplementation(() => ({
      data: createSummary('24h').knowledgeGraphStatus,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: knowledgeGraphStatusRefetchMock,
    }));
  });

  it('renders the Kangur observability summary cards and quick links', () => {
    navigationState.search = 'range=30d';
    render(<AdminKangurObservabilityPage />);

    expect(screen.getByText('Kangur Observability')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Observability'
    );
    expect(screen.getByText('Learner sign-in failure rate')).toBeInTheDocument();
    expect(screen.getByText('Progress sync failures detected.')).toBeInTheDocument();
    expect(screen.getByText('Kangur TTS fallback used.')).toBeInTheDocument();
    expect(screen.getByText('TTS Generation Failures')).toBeInTheDocument();
    expect(screen.getByText('Lobby Analytics')).toBeInTheDocument();
    expect(screen.getByText('Lobby Views')).toBeInTheDocument();
    expect(screen.getByText('Refresh Clicks')).toBeInTheDocument();
    expect(screen.getByText('Filter Changes')).toBeInTheDocument();
    expect(screen.getByText('Sort Changes')).toBeInTheDocument();
    expect(screen.getByText('Join Clicks')).toBeInTheDocument();
    expect(screen.getByText('Create Clicks')).toBeInTheDocument();
    expect(screen.getByText('Login CTA Clicks')).toBeInTheDocument();
    expect(screen.getByText('Guest Activity')).toBeInTheDocument();
    expect(screen.getByText('Logged-in Activity')).toBeInTheDocument();
    expect(screen.getByText('Filter Distribution')).toBeInTheDocument();
    expect(screen.getByText('Sort Distribution')).toBeInTheDocument();
    expect(screen.getByText('Login CTA Sources')).toBeInTheDocument();
    expect(screen.getByText('Conversion Rates')).toBeInTheDocument();
    expect(screen.getByText(/Guest Login Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Guest Join Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Auth Join Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Auth Create Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Overall Join Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Overall Create Rate/i)).toBeInTheDocument();
    expect(screen.getByText('AI Tutor Graph Coverage Rate')).toBeInTheDocument();
    expect(screen.getByText('AI Tutor Direct Answer Rate')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Graph Freshness')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Graph Readiness')).toBeInTheDocument();
    expect(screen.getAllByText('2 hours').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        'Neo4j graph kangur-website-help-v1 is vector-ready with 87 nodes, 108 edges, and an online vector index.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'Page content was updated after the latest Neo4j sync by about 2 hours. Last graph sync: 2026-03-07T12:00:00.000Z. Latest canonical update: 2026-03-07T14:00:00.000Z.'
      ).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Deterministic Tutor answers are below the preferred rollout target.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Neo4j graph coverage is below the preferred Tutor reply share.')
    ).toBeInTheDocument();
    expect(screen.getByText('AI Tutor Vector Assist Rate')).toBeInTheDocument();
    expect(
      screen.getByText('Vector-assisted recall is contributing to too few semantic Tutor replies.')
    ).toBeInTheDocument();
    expect(screen.getByText('AI Tutor Bridge Completion Rate')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Bridge suggestions are not converting into completed cross-surface follow-ups fast enough.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('AI Tutor Bridge Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Page-Content Answers')).toBeInTheDocument();
    expect(screen.getByText('Native Guide Answers')).toBeInTheDocument();
    expect(screen.getByText('Brain Fallback Replies')).toBeInTheDocument();
    expect(screen.getByText('Direct Answer Rate')).toBeInTheDocument();
    expect(screen.getByText('Brain Fallback Rate')).toBeInTheDocument();
    expect(screen.getByText('Bridge Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Lekcja -> Grajmy')).toBeInTheDocument();
    expect(screen.getByText('Grajmy -> Lekcja')).toBeInTheDocument();
    expect(screen.getByText('Bridge CTA Clicks')).toBeInTheDocument();
    expect(screen.getByText('Bridge Completions')).toBeInTheDocument();
    expect(screen.getByText('Bridge Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Neo4j-backed Replies')).toBeInTheDocument();
    expect(screen.getByText('Graph Coverage')).toBeInTheDocument();
    expect(screen.getByText('Semantic Graph Replies')).toBeInTheDocument();
    expect(screen.getByText('Recall Mix')).toBeInTheDocument();
    expect(screen.getByText('Vector Assist Rate')).toBeInTheDocument();
    expect(
      screen.getByText('Replies resolved directly from Mongo-backed section page content.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Replies resolved from linked native guides without Brain fallback.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Replies that still required Brain generation after deterministic sources were checked.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Page-content and native-guide replies as a share of 6 Tutor replies.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Brain fallbacks as a share of 6 Tutor replies. Direct answers: 3.')
    ).toBeInTheDocument();
    expect(screen.getByText('Metadata 1 / Hybrid 2 / Vector-only 1')).toBeInTheDocument();
    expect(screen.getByText('Website-help graph replies: 1.')).toBeInTheDocument();
    expect(screen.getByText('Vector recall attempts: 3.')).toBeInTheDocument();
    expect(screen.getByText('Opened: 2 bridge follow-ups. Completed: 1.')).toBeInTheDocument();
    expect(
      screen.getByText('Completed follow-ups as a share of 3 bridge suggestions.')
    ).toBeInTheDocument();
    expect(screen.getByText('Graph-backed share across 6 Tutor replies.')).toBeInTheDocument();
    expect(
      screen.getByText('Hybrid and vector-only recall as a share of 3 semantic graph replies.')
    ).toBeInTheDocument();
    expect(useKangurKnowledgeGraphStatusMock).toHaveBeenCalledWith('kangur-website-help-v1');
    expect(screen.getByText('Knowledge Graph Status')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Neo4j has semantic text, embeddings, and an online vector index for Kangur Tutor retrieval.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Vector ready')).toBeInTheDocument();
    expect(screen.getByText('Live Nodes')).toBeInTheDocument();
    expect(screen.getByText('Live Edges')).toBeInTheDocument();
    expect(screen.getByText('Synced Nodes')).toBeInTheDocument();
    expect(screen.getByText('Synced Edges')).toBeInTheDocument();
    expect(useKangurObservabilitySummaryMock).toHaveBeenCalledWith('30d');
    const allLogsHref = screen.getByRole('link', { name: /all kangur logs/i }).getAttribute('href');
    const logsUrl = new URL(allLogsHref ?? '', 'http://localhost');
    expect(logsUrl.pathname).toBe('/admin/system/logs');
    expect(logsUrl.searchParams.get('query')).toBe('kangur.');
    expect(logsUrl.searchParams.get('from')).toBe('2026-03-06T12:00:00.000Z');
    expect(logsUrl.searchParams.get('to')).toBe('2026-03-07T12:00:00.000Z');
    expect(screen.getByRole('link', { name: /view error logs/i })).toHaveAttribute(
      'href',
      '/admin/system/logs?query=kangur.&level=error&from=2026-03-06T12:00:00.000Z&to=2026-03-07T12:00:00.000Z'
    );
    expect(screen.getByRole('link', { name: /view generation failure logs/i })).toHaveAttribute(
      'href',
      '/admin/system/logs?source=kangur.tts.generationFailed&from=2026-03-06T12:00:00.000Z&to=2026-03-07T12:00:00.000Z'
    );
    expect(screen.getByRole('link', { name: /tts generation failure logs/i })).toHaveAttribute(
      'href',
      '/admin/system/logs?source=kangur.tts.generationFailed&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z'
    );
    expect(screen.getByRole('link', { name: /knowledge graph status json/i })).toHaveAttribute(
      'href',
      '/api/kangur/knowledge-graph/status'
    );
    expect(screen.getByRole('link', { name: /open baseline details/i })).toHaveAttribute(
      'href',
      '/admin/kangur/observability?range=30d#performance-baseline'
    );
    expect(screen.getByText('820 ms')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: /^logs$/i })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/admin/system/logs?source=kangur.auth.me.GET&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z'
        )
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link', { name: /^logs$/i })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/admin/system/logs?source=kangur.tts.POST&from=2026-03-06T12%3A00%3A00.000Z&to=2026-03-07T12%3A00%3A00.000Z'
        )
    ).toBe(true);
  });

  it('syncs the knowledge graph from the status section and refreshes observability data', async () => {
    render(<AdminKangurObservabilityPage />);

    fireEvent.click(screen.getByRole('button', { name: /sync graph/i }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/kangur/knowledge-graph/sync',
        {
          locale: 'pl',
          withEmbeddings: true,
        },
        { timeout: 120000 }
      )
    );
    expect(
      await screen.findByText(/^Synced 87 nodes and 108 edges with embeddings preserved\.$/)
    ).toBeInTheDocument();
  });

  it('runs a knowledge-graph preview query from the Neo4j section', async () => {
    render(<AdminKangurObservabilityPage />);

    fireEvent.change(screen.getByLabelText('Preview prompt'), {
      target: { value: 'Wyjaśnij ranking wyników' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run graph preview' }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/kangur/ai-tutor/knowledge-graph/preview',
        {
          latestUserMessage: 'Wyjaśnij ranking wyników',
          locale: 'pl',
        },
        { timeout: 120000 }
      )
    );
    expect(await screen.findByText('Latest preview result')).toBeInTheDocument();
    expect(screen.getByText('Raw query seed')).toBeInTheDocument();
    expect(screen.getAllByText('Wyjaśnij ranking wyników').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Normalized query seed')).toBeInTheDocument();
    expect(screen.getByText('wyjaśnij ranking wyników')).toBeInTheDocument();
    expect(screen.getByText('wyjasnij, ranking, wynikow')).toBeInTheDocument();
    expect(screen.getByText('Ranking wyników')).toBeInTheDocument();
    expect(screen.getByText('guide • kangur_ai_tutor_native_guides • kangur_ai_tutor_native_guides')).toBeInTheDocument();
  });

  it('applies a coverage-backed section preset to the graph preview form', async () => {
    render(<AdminKangurObservabilityPage />);

    fireEvent.change(screen.getByLabelText('Section preset'), {
      target: { value: 'game-home-leaderboard' },
    });

    expect(screen.getByLabelText('Preview prompt')).toHaveValue(
      'Wyjaśnij tę sekcję: Ranking na stronie głównej'
    );
    expect(screen.getByLabelText('Surface')).toHaveValue('game');
    expect(screen.getByLabelText('Prompt mode')).toHaveValue('explain');
    expect(screen.getByLabelText('Focus kind')).toHaveValue('leaderboard');
    expect(screen.getByLabelText('Content id')).toHaveValue('game:home');
    expect(screen.getByLabelText('Focus id')).toHaveValue('kangur-game-home-leaderboard');
    expect(screen.getByLabelText('Focus label')).toHaveValue('Ranking na stronie głównej');
    expect(screen.getByLabelText('Title')).toHaveValue('Ranking na stronie głównej');
    expect(screen.getByText('Ranking na stronie głównej')).toBeInTheDocument();
    expect(screen.getByText('Coverage preset')).toBeInTheDocument();
    expect(screen.getByText('kangur-game-home-leaderboard')).toBeInTheDocument();
    expect(screen.getByText('game:home')).toBeInTheDocument();
    expect(
      screen.getByText('Sekcja ma dedykowany tutor anchor i wpis Mongo native guide.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Run graph preview' }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/kangur/ai-tutor/knowledge-graph/preview',
        {
          latestUserMessage: 'Wyjaśnij tę sekcję: Ranking na stronie głównej',
          locale: 'pl',
          context: {
            surface: 'game',
            promptMode: 'explain',
            interactionIntent: 'explain',
            focusKind: 'leaderboard',
            focusId: 'kangur-game-home-leaderboard',
            focusLabel: 'Ranking na stronie głównej',
            contentId: 'game:home',
            title: 'Ranking na stronie głównej',
          },
        },
        { timeout: 120000 }
      )
    );
  });

  it('replays a recent AI Tutor event into the graph preview form and runs it immediately', async () => {
    render(<AdminKangurObservabilityPage />);

    fireEvent.change(screen.getByLabelText('Recent tutor event'), {
      target: { value: 'event-tutor-1' },
    });

    expect(screen.getByLabelText('Preview prompt')).toHaveValue('Wyjaśnij ranking wyników');
    expect(screen.getByLabelText('Section preset')).toHaveValue('game-home-leaderboard');
    expect(screen.getByLabelText('Surface')).toHaveValue('game');
    expect(screen.getByLabelText('Prompt mode')).toHaveValue('explain');
    expect(screen.getByLabelText('Interaction intent')).toHaveValue('explain');
    expect(screen.getByLabelText('Focus kind')).toHaveValue('leaderboard');
    expect(screen.getByLabelText('Content id')).toHaveValue('game:home');
    expect(screen.getByLabelText('Focus id')).toHaveValue('kangur-game-home-leaderboard');
    expect(screen.getByLabelText('Focus label')).toHaveValue('Ranking na stronie głównej');
    expect(screen.getByLabelText('Question id')).toHaveValue('question-7');
    expect(screen.getByLabelText('Assignment id')).toHaveValue('assignment-42');
    expect(screen.getByLabelText('Answer state')).toHaveValue('false');
    expect(screen.getByLabelText('Selected text')).toHaveValue('Ranking wyników');
    expect(screen.getByLabelText('Title')).toHaveValue('Ranking na stronie głównej');
    expect(screen.getByLabelText('Description')).toHaveValue('Aktualna tabela wyników.');
    expect(screen.getByText('Replay source')).toBeInTheDocument();
    expect(screen.getAllByText('/kangur').length).toBeGreaterThanOrEqual(1);

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/kangur/ai-tutor/knowledge-graph/preview',
        {
          latestUserMessage: 'Wyjaśnij ranking wyników',
          locale: 'pl',
          context: {
            surface: 'game',
            promptMode: 'explain',
            interactionIntent: 'explain',
            focusKind: 'leaderboard',
            focusId: 'kangur-game-home-leaderboard',
            focusLabel: 'Ranking na stronie głównej',
            contentId: 'game:home',
            questionId: 'question-7',
            assignmentId: 'assignment-42',
            answerRevealed: false,
            selectedText: 'Ranking wyników',
            title: 'Ranking na stronie głównej',
            description: 'Aktualna tabela wyników.',
          },
        },
        { timeout: 120000 }
      )
    );
    expect(await screen.findByText('Latest preview result')).toBeInTheDocument();
  });

  it('replays a recent AI Tutor analytics card directly into the graph preview and runs it', async () => {
    render(<AdminKangurObservabilityPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Replay in graph preview' }));

    expect(screen.getByRole('button', { name: 'Loaded in graph preview' })).toBeInTheDocument();
    expect(screen.getByLabelText('Recent tutor event')).toHaveValue('event-tutor-1');
    expect(screen.getByLabelText('Preview prompt')).toHaveValue('Wyjaśnij ranking wyników');
    expect(screen.getByLabelText('Section preset')).toHaveValue('game-home-leaderboard');
    expect(screen.getByLabelText('Interaction intent')).toHaveValue('explain');
    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/kangur/ai-tutor/knowledge-graph/preview',
        {
          latestUserMessage: 'Wyjaśnij ranking wyników',
          locale: 'pl',
          context: {
            surface: 'game',
            promptMode: 'explain',
            interactionIntent: 'explain',
            focusKind: 'leaderboard',
            focusId: 'kangur-game-home-leaderboard',
            focusLabel: 'Ranking na stronie głównej',
            contentId: 'game:home',
            questionId: 'question-7',
            assignmentId: 'assignment-42',
            answerRevealed: false,
            selectedText: 'Ranking wyników',
            title: 'Ranking na stronie głównej',
            description: 'Aktualna tabela wyników.',
          },
        },
        { timeout: 120000 }
      )
    );
  });

  it('clears preview context without wiping the draft prompt', () => {
    render(<AdminKangurObservabilityPage />);

    fireEvent.change(screen.getByLabelText('Section preset'), {
      target: { value: 'game-home-leaderboard' },
    });
    fireEvent.change(screen.getByLabelText('Selected text'), {
      target: { value: 'Ranking wyników' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear context' }));

    expect(screen.getByLabelText('Preview prompt')).toHaveValue(
      'Wyjaśnij tę sekcję: Ranking na stronie głównej'
    );
    expect(screen.getByLabelText('Section preset')).toHaveValue('');
    expect(screen.getByLabelText('Surface')).toHaveValue('');
    expect(screen.getByLabelText('Prompt mode')).toHaveValue('');
    expect(screen.getByLabelText('Focus kind')).toHaveValue('');
    expect(screen.getByLabelText('Content id')).toHaveValue('');
    expect(screen.getByLabelText('Focus id')).toHaveValue('');
    expect(screen.getByLabelText('Focus label')).toHaveValue('');
    expect(screen.getByLabelText('Selected text')).toHaveValue('');
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.queryByText('Sekcja ma dedykowany tutor anchor i wpis Mongo native guide.')).not.toBeInTheDocument();
  });

  it('switches the summary range from the segmented control', async () => {
    render(<AdminKangurObservabilityPage />);

    fireEvent.click(screen.getByRole('radio', { name: '7d' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/admin/kangur/observability?range=7d', {
        scroll: false,
      });
    });
  });

  it('renders a disabled Neo4j graph status state', () => {
    useKangurObservabilitySummaryMock.mockReturnValue({
      data: {
        ...createSummary('24h'),
        knowledgeGraphStatus: {
          mode: 'disabled' as const,
          graphKey: 'kangur-website-help-v1',
          message: 'Neo4j is not enabled. Set NEO4J_* env vars before checking live graph status.',
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchMock,
    });
    useKangurKnowledgeGraphStatusMock.mockReturnValue({
      data: {
        mode: 'disabled' as const,
        graphKey: 'kangur-website-help-v1',
        message: 'Neo4j is not enabled. Set NEO4J_* env vars before checking live graph status.',
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: knowledgeGraphStatusRefetchMock,
    });

    render(<AdminKangurObservabilityPage />);

    expect(screen.getByText('Knowledge Graph Status')).toBeInTheDocument();
    expect(screen.getByText('Neo4j graph status disabled')).toBeInTheDocument();
    expect(
      screen.getByText('Neo4j is not enabled. Set NEO4J_* env vars before checking live graph status.')
    ).toBeInTheDocument();
  });
});
