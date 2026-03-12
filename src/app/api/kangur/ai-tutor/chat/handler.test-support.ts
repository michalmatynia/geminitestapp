import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const createRuntimeDocument = (input: {
  entityType: string;
  id: string;
  title: string;
  summary?: string;
  facts?: Record<string, unknown>;
  sections?: Array<{
    id?: string;
    kind: 'facts' | 'items' | 'events' | 'text';
    title: string;
    summary?: string;
    text?: string;
    items?: Record<string, unknown>[];
  }>;
}) => ({
  id: input.id,
  kind: 'runtime_document' as const,
  entityType: input.entityType,
  title: input.title,
  summary: input.summary ?? input.title,
  status: 'active',
  tags: ['kangur', 'test'],
  relatedNodeIds: [],
  facts: input.facts ?? {},
  sections: input.sections ?? [],
  provenance: {
    providerId: 'kangur',
    source: 'test',
  },
});

export const createContextRegistryBundle = (input?: {
  learnerSummary?: string;
  learnerFacts?: Record<string, unknown>;
  learnerSections?: Array<{
    id?: string;
    kind: 'facts' | 'items' | 'events' | 'text';
    title: string;
    summary?: string;
    text?: string;
    items?: Record<string, unknown>[];
  }>;
  loginActivityFacts?: Record<string, unknown>;
  lessonFacts?: Record<string, unknown>;
  testFacts?: Record<string, unknown>;
  assignmentFacts?: Record<string, unknown>;
}) => {
  const documents = [
    createRuntimeDocument({
      id: 'runtime:kangur:learner:learner-1',
      entityType: 'kangur_learner_snapshot',
      title: 'Learner snapshot',
      summary: input?.learnerSummary ?? 'Average accuracy 74%.',
      facts: {
        learnerSummary: input?.learnerSummary ?? 'Average accuracy 74%.',
        ...(input?.learnerFacts ?? {}),
      },
      sections: input?.learnerSections,
    }),
  ];

  if (input?.loginActivityFacts) {
    documents.push(
      createRuntimeDocument({
        id: 'runtime:kangur:login-activity:learner-1',
        entityType: 'kangur_login_activity',
        title: 'Kangur login activity',
        summary: String(
          input.loginActivityFacts['recentLoginActivitySummary'] ?? 'Kangur login activity'
        ),
        facts: input.loginActivityFacts,
      })
    );
  }

  if (input?.lessonFacts) {
    documents.push(
      createRuntimeDocument({
        id: 'runtime:kangur:lesson:learner-1:lesson-1',
        entityType: 'kangur_lesson_context',
        title: String(input.lessonFacts['title'] ?? 'Lesson context'),
        summary: String(
          input.lessonFacts['description'] ?? input.lessonFacts['assignmentSummary'] ?? 'Lesson context'
        ),
        facts: input.lessonFacts,
      })
    );
  }

  if (input?.testFacts) {
    documents.push(
      createRuntimeDocument({
        id: 'runtime:kangur:test:learner-1:suite-1:q-1:active',
        entityType: 'kangur_test_context',
        title: String(input.testFacts['title'] ?? 'Test context'),
        summary: String(
          input.testFacts['description'] ?? input.testFacts['currentQuestion'] ?? 'Test context'
        ),
        facts: input.testFacts,
      })
    );
  }

  if (input?.assignmentFacts) {
    documents.push(
      createRuntimeDocument({
        id: 'runtime:kangur:assignment:learner-1:assignment-1',
        entityType: 'kangur_assignment_context',
        title: String(input.assignmentFacts['title'] ?? 'Assignment context'),
        summary: String(input.assignmentFacts['assignmentSummary'] ?? 'Assignment context'),
        facts: input.assignmentFacts,
      })
    );
  }

  return {
    refs: documents.map((document) => ({
      id: document.id,
      kind: 'runtime_document' as const,
      providerId: 'kangur',
      entityType: document.entityType,
    })),
    nodes: [
      {
        id: 'policy:kangur-ai-tutor-socratic',
        kind: 'policy' as const,
        description: 'Use short Socratic guidance grounded in the resolved Kangur context.',
      },
      {
        id: 'policy:kangur-ai-tutor-test-guardrails',
        kind: 'policy' as const,
        description: 'Protect active test integrity and avoid giving away answers.',
      },
    ],
    documents,
    truncated: false,
    engineVersion: 'test-engine',
  };
};

export const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-ai-tutor-1',
    traceId: 'trace-kangur-ai-tutor-1',
    correlationId: 'corr-kangur-ai-tutor-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

export const createPostRequest = (body: string): NextRequest =>
  new NextRequest('http://localhost/api/kangur/ai-tutor/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
