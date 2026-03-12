import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';

const { resolveKangurAiTutorRuntimeDocumentsMock } = vi.hoisted(() => ({
  resolveKangurAiTutorRuntimeDocumentsMock: vi.fn(),
}));

vi.mock('@/features/kangur/server/context-registry', () => ({
  resolveKangurAiTutorRuntimeDocuments: resolveKangurAiTutorRuntimeDocumentsMock,
}));

import {
  buildContextInstructions,
  buildLearnerMemoryInstructions,
  buildParentPreferenceInstructions,
} from './build-system-prompt';

const createRuntimeDocument = (input: {
  id: string;
  entityType: string;
  title: string;
  summary?: string;
  facts?: Record<string, unknown>;
  sections?: Array<{ kind: 'text'; title: string; text: string }>;
}): ContextRuntimeDocument => ({
  id: input.id,
  kind: 'runtime_document',
  entityType: input.entityType,
  title: input.title,
  summary: input.summary ?? input.title,
  status: 'active',
  tags: ['kangur', 'unit-test'],
  relatedNodeIds: [],
  facts: input.facts ?? {},
  sections: input.sections,
  provenance: {
    providerId: 'kangur',
    source: 'unit-test',
  },
});

const createBundle = (): ContextRegistryResolutionBundle => ({
  refs: [],
  nodes: [
    {
      id: 'policy:kangur-ai-tutor-socratic',
      kind: 'policy',
      description: 'Use short Socratic guidance grounded in the active surface.',
    },
    {
      id: 'policy:other',
      kind: 'policy',
      description: 'This unrelated policy should be ignored.',
    },
  ],
  documents: [],
  truncated: false,
  engineVersion: 'test-engine',
});

describe('build-system-prompt helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('builds parent preference instructions from the selected tutor settings', () => {
    expect(
      buildParentPreferenceInstructions({
        hintDepth: 'guided',
        proactiveNudges: 'coach',
        rememberTutorContext: true,
      })
    ).toContain('Parent preference: give one hint plus one quick checkpoint question when helpful.');
    expect(
      buildParentPreferenceInstructions({
        hintDepth: 'guided',
        proactiveNudges: 'coach',
        rememberTutorContext: true,
      })
    ).toContain(
      'Parent preference: be comfortable proactively recommending the next practice move when the learner seems stuck.'
    );
    expect(
      buildParentPreferenceInstructions({
        hintDepth: 'guided',
        proactiveNudges: 'coach',
        rememberTutorContext: true,
      })
    ).toContain(
      'Parent preference: you may use compact learner memory from recent tutor sessions when it is provided.'
    );
  });

  it('formats compact learner memory without dropping the recent hint list', () => {
    const instructions = buildLearnerMemoryInstructions({
      lastSurface: 'lesson',
      lastFocusLabel: 'Dodawanie do 10',
      lastUnresolvedBlocker: 'Learner mixes up tens and ones.',
      lastRecommendedAction: 'Count the counters in pairs.',
      lastSuccessfulIntervention: 'Breaking the question into two steps helped.',
      lastCoachingMode: 'hint',
      lastGivenHints: ['Policz kropki po kolei.', 'Sprawdz pierwsza liczbe jeszcze raz.'],
    });

    expect(instructions).toContain('Compact learner memory from recent Kangur tutor sessions:');
    expect(instructions).toContain('Recent surface: lesson.');
    expect(instructions).toContain('Recent focus: Dodawanie do 10');
    expect(instructions).toContain(
      'Recent hints given (vary your approach, do not repeat these verbatim): Policz kropki po kolei. | Sprawdz pierwsza liczbe jeszcze raz.'
    );
  });

  it('builds context instructions from runtime documents, policies, and active test constraints', () => {
    resolveKangurAiTutorRuntimeDocumentsMock.mockReturnValue({
      learnerSnapshot: createRuntimeDocument({
        id: 'runtime:learner',
        entityType: 'kangur_learner_snapshot',
        title: 'Learner snapshot',
        facts: {
          learnerSummary: 'Accuracy is trending up after three short sessions.',
        },
      }),
      loginActivity: createRuntimeDocument({
        id: 'runtime:login',
        entityType: 'kangur_login_activity',
        title: 'Login activity',
        facts: {
          recentLoginActivitySummary: 'Practiced twice this week.',
        },
      }),
      surfaceContext: createRuntimeDocument({
        id: 'runtime:test',
        entityType: 'kangur_test_context',
        title: 'Test context',
        facts: {
          title: 'Dodawanie w zakresie 20',
          description: 'Krotki sprawdzian z dodawania.',
          masterySummary: 'Most mistakes happen near regrouping.',
          currentQuestion: 'Ile to jest 8 + 7?',
          questionProgressLabel: 'Pytanie 2 z 5',
        },
      }),
      assignmentContext: createRuntimeDocument({
        id: 'runtime:assignment',
        entityType: 'kangur_assignment_context',
        title: 'Assignment',
        facts: {
          assignmentSummary: 'Skoncz trzy zadania z dodawania przed piatkiem.',
        },
      }),
    });

    const context = {
      surface: 'test',
      promptMode: 'selected_text',
      interactionIntent: 'explain',
      selectedText: '8 + 7',
      focusKind: 'selection',
      focusLabel: 'Highlighted fragment',
      assignmentId: 'assignment-1',
      repeatedQuestionCount: 1,
      previousCoachingMode: 'hint',
      answerRevealed: false,
      drawingImageData: 'data:image/png;base64,abc123',
    } as KangurAiTutorConversationContext;

    const instructions = buildContextInstructions({
      context,
      registryBundle: createBundle(),
      options: {
        testAccessMode: 'guided',
      },
    });

    expect(instructions).toContain('Current Kangur surface: test practice.');
    expect(instructions).toContain('Current title: Dodawanie w zakresie 20');
    expect(instructions).toContain('Learner snapshot: Accuracy is trending up after three short sessions.');
    expect(instructions).toContain('Recent Kangur login activity: Practiced twice this week.');
    expect(instructions).toContain(
      'Active assignment or focus: Skoncz trzy zadania z dodawania przed piatkiem.'
    );
    expect(instructions).toContain('Learner selected this text: """8 + 7"""');
    expect(instructions).toContain(
      'Repeat signal: the learner has asked essentially the same question 2 times in this session.'
    );
    expect(instructions).toContain(
      'Registry policy: Use short Socratic guidance grounded in the active surface.'
    );
    expect(instructions).toContain(
      'The learner is in an active test question. Do not reveal the final answer, the correct option label, or solve the problem outright.'
    );
  });
});
