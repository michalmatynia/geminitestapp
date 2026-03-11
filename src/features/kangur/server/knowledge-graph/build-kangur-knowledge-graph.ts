import {
  KANGUR_CONTEXT_ROOT_IDS,
  KANGUR_RUNTIME_PROVIDER_ID,
} from '@/features/kangur/context-registry/refs';
import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  type KangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';
import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  type KangurAiTutorNativeGuideStore,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';
import {
  KANGUR_KNOWLEDGE_GRAPH_KEY,
  type KangurKnowledgeEdgeKind,
  type KangurKnowledgeGraphEdge,
  type KangurKnowledgeGraphNode,
  type KangurKnowledgeGraphSnapshot,
  type KangurKnowledgeNodeKind,
  type KangurKnowledgeNodeSource,
} from '@/shared/contracts/kangur-knowledge-graph';

type BuildKangurKnowledgeGraphOptions = {
  locale?: string;
  tutorContent?: KangurAiTutorContent;
  nativeGuideStore?: KangurAiTutorNativeGuideStore;
};

const ROOT_DEFINITIONS = {
  learnerSnapshot: {
    title: 'Learner snapshot',
    summary:
      'Progress, scores, assignments, and learner profile facts that help the tutor explain the Kangur experience.',
    relatedFlowId: 'flow:kangur:learner-profile',
  },
  loginActivity: {
    title: 'Sign-in guidance',
    summary:
      'Recent login activity and tutor-led sign-in help for anonymous and returning learners.',
    relatedFlowId: 'flow:kangur:sign-in',
  },
  lessonContext: {
    title: 'Lessons help',
    summary:
      'Lesson-library navigation, lesson context, and tutor policy references for lesson-mode guidance.',
    relatedFlowId: 'flow:kangur:lesson-help',
  },
  testContext: {
    title: 'Tests help',
    summary:
      'Test-suite navigation and test-mode guardrails used when the tutor answers questions about Kangur tests.',
    relatedFlowId: 'flow:kangur:test-help',
  },
  assignmentContext: {
    title: 'Assignments help',
    summary:
      'Assignment and parent-dashboard references used when the tutor explains parent and learner workflow steps.',
    relatedFlowId: 'flow:kangur:assignment-help',
  },
} as const;

const REFERENCE_DETAILS: Partial<
  Record<
    string,
    {
      title: string;
      summary: string;
      route?: string;
    }
  >
> = {
  'page:kangur-learner-profile': {
    title: 'Learner profile page',
    summary: 'Kangur learner profile with progress, streaks, and recommendations.',
  },
  'collection:kangur-progress': {
    title: 'Learner progress collection',
    summary: 'Tracked progress facts and momentum signals used by the tutor.',
  },
  'collection:kangur-scores': {
    title: 'Learner scores collection',
    summary: 'Recorded score history and achievement data for Kangur learners.',
  },
  'collection:kangur-assignments': {
    title: 'Assignments collection',
    summary: 'Assignments available to learners and parents in Kangur.',
  },
  'collection:kangur-login-activity': {
    title: 'Login activity collection',
    summary: 'Safe login-activity summary used for tutor sign-in guidance.',
  },
  'action:kangur-ai-tutor-chat': {
    title: 'AI Tutor chat action',
    summary: 'Primary tutor entry point available across Kangur surfaces.',
  },
  'page:kangur-lessons': {
    title: 'Lessons page',
    summary: 'Lesson library and lesson navigation surface in Kangur.',
  },
  'collection:kangur-lessons': {
    title: 'Lessons collection',
    summary: 'Lesson metadata and library entries referenced by the tutor.',
  },
  'policy:kangur-ai-tutor-socratic': {
    title: 'Socratic tutor policy',
    summary: 'Tutor behavior policy for guided, answer-safe Kangur explanations.',
  },
  'page:kangur-tests': {
    title: 'Tests page',
    summary: 'Kangur tests and exam-navigation surface.',
  },
  'collection:kangur-test-suites': {
    title: 'Test suites collection',
    summary: 'Available Kangur test suites and related test metadata.',
  },
  'policy:kangur-ai-tutor-test-guardrails': {
    title: 'Test guardrails policy',
    summary: 'Tutor restrictions that apply while guiding Kangur test activity.',
  },
  'page:kangur-parent-dashboard': {
    title: 'Parent dashboard page',
    summary: 'Parent-facing Kangur dashboard for assignments and progress review.',
  },
  'page:kangur-game': {
    title: 'Game home page',
    summary: 'Learner home and quick-start Kangur game surface.',
  },
};

const FLOW_DEFINITIONS = [
  {
    id: 'flow:kangur:sign-in',
    title: 'Sign in flow',
    summary: 'How anonymous learners sign in from the Kangur website shell.',
    tags: ['auth', 'login', 'website'],
  },
  {
    id: 'flow:kangur:create-account',
    title: 'Create account flow',
    summary: 'How new learners and parents start the Kangur account-creation flow.',
    tags: ['auth', 'signup', 'website'],
  },
  {
    id: 'flow:kangur:learner-profile',
    title: 'Learner profile help',
    summary: 'How to understand learner profile, progress, and recent activity.',
    tags: ['profile', 'progress'],
  },
  {
    id: 'flow:kangur:lesson-help',
    title: 'Lessons help',
    summary: 'How to find lessons, open them, and understand lesson-mode navigation.',
    tags: ['lessons', 'navigation'],
  },
  {
    id: 'flow:kangur:test-help',
    title: 'Tests help',
    summary: 'How to find and use tests in Kangur.',
    tags: ['tests', 'navigation'],
  },
  {
    id: 'flow:kangur:assignment-help',
    title: 'Assignments help',
    summary: 'How assignments connect learner, parent dashboard, and lesson surfaces.',
    tags: ['assignments', 'parent-dashboard'],
  },
] as const;

const toSentenceCase = (value: string): string =>
  value
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const inferReferenceKind = (refId: string): KangurKnowledgeNodeKind => {
  if (refId.startsWith('page:')) return 'page';
  if (refId.startsWith('collection:')) return 'collection';
  if (refId.startsWith('action:')) return 'action';
  return 'policy';
};

const inferReferenceTitle = (refId: string): string => {
  const detail = REFERENCE_DETAILS[refId];
  if (detail) return detail.title;
  const [, raw = refId] = refId.split(':', 2);
  return `${toSentenceCase(raw)} reference`;
};

const inferReferenceSummary = (refId: string): string => {
  const detail = REFERENCE_DETAILS[refId];
  if (detail) return detail.summary;
  return 'Kangur website knowledge reference.';
};

const createNode = (
  nodes: Map<string, KangurKnowledgeGraphNode>,
  node: KangurKnowledgeGraphNode
): void => {
  nodes.set(node.id, node);
};

const createEdge = (
  edges: Map<string, KangurKnowledgeGraphEdge>,
  input: {
    kind: KangurKnowledgeEdgeKind;
    from: string;
    to: string;
    description?: string;
    weight?: number;
    metadata?: Record<string, string | number | boolean | null>;
  }
): void => {
  const id = `${input.kind}:${input.from}->${input.to}`;
  edges.set(id, { id, ...input });
};

const buildReferenceNode = (
  refId: string,
  source: KangurKnowledgeNodeSource = 'kangur_context_registry'
): KangurKnowledgeGraphNode => ({
  id: refId,
  kind: inferReferenceKind(refId),
  title: inferReferenceTitle(refId),
  summary: inferReferenceSummary(refId),
  source,
  refId,
  sourceCollection: 'kangur_context_registry',
  sourceRecordId: refId,
  sourcePath: refId,
  route: REFERENCE_DETAILS[refId]?.route,
  tags: ['kangur', inferReferenceKind(refId)],
});

const SURFACE_FLOW_IDS: Partial<Record<string, string>> = {
  lesson: 'flow:kangur:lesson-help',
  test: 'flow:kangur:test-help',
  assignment: 'flow:kangur:assignment-help',
};

export const buildKangurKnowledgeGraph = (
  options: BuildKangurKnowledgeGraphOptions = {}
): KangurKnowledgeGraphSnapshot => {
  const locale = options.locale?.trim() || 'pl';
  const tutorContent = options.tutorContent ?? DEFAULT_KANGUR_AI_TUTOR_CONTENT;
  const nativeGuideStore =
    options.nativeGuideStore ?? DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE;
  const nodes = new Map<string, KangurKnowledgeGraphNode>();
  const edges = new Map<string, KangurKnowledgeGraphEdge>();

  createNode(nodes, {
    id: 'app:kangur',
    kind: 'app',
    title: 'Kangur',
    summary:
      'Learner-facing math practice shell with lessons, games, tests, parent support, and AI Tutor guidance.',
    source: 'kangur_manual_manifest',
    locale,
    tags: ['kangur', 'website', KANGUR_RUNTIME_PROVIDER_ID],
    metadata: {
      graphVersion: 1,
    },
  });

  for (const flow of FLOW_DEFINITIONS) {
    createNode(nodes, {
      id: flow.id,
      kind: 'flow',
      title: flow.title,
      summary: flow.summary,
      source: 'kangur_manual_manifest',
      locale,
      tags: [...flow.tags],
      sourcePath: flow.id,
    });
    createEdge(edges, {
      kind: 'HAS_FLOW',
      from: 'app:kangur',
      to: flow.id,
      description: `Kangur website help flow: ${flow.title}.`,
    });
  }

  createNode(nodes, {
    id: 'anchor:kangur:login',
    kind: 'anchor',
    title: tutorContent.common.signInLabel,
    summary: 'Primary navigation sign-in anchor used by the AI Tutor guided login flow.',
    source: 'kangur_ai_tutor_content',
    locale,
    anchorId: 'kangur-primary-nav-login',
    sourceCollection: 'kangur_ai_tutor_content',
    sourceRecordId: locale,
    sourcePath: 'common.signInLabel',
    tags: ['auth', 'login', 'anchor'],
  });
  createNode(nodes, {
    id: 'anchor:kangur:create-account',
    kind: 'anchor',
    title: tutorContent.common.createAccountLabel,
    summary: 'Primary navigation create-account anchor used by the AI Tutor guided signup flow.',
    source: 'kangur_ai_tutor_content',
    locale,
    anchorId: 'kangur-primary-nav-create-account',
    sourceCollection: 'kangur_ai_tutor_content',
    sourceRecordId: locale,
    sourcePath: 'common.createAccountLabel',
    tags: ['auth', 'signup', 'anchor'],
  });
  createEdge(edges, {
    kind: 'USES_ANCHOR',
    from: 'flow:kangur:sign-in',
    to: 'anchor:kangur:login',
    description: 'Guided sign-in points the learner to the main login navigation anchor.',
  });
  createEdge(edges, {
    kind: 'USES_ANCHOR',
    from: 'flow:kangur:create-account',
    to: 'anchor:kangur:create-account',
    description: 'Guided signup points the learner to the create-account navigation anchor.',
  });

  createNode(nodes, {
    id: 'guide:kangur:sign-in-nav',
    kind: 'guide',
    title: tutorContent.guidedCallout.authTitles.signInNav,
    summary: tutorContent.guidedCallout.authDetails.signInNav,
    source: 'kangur_ai_tutor_content',
    locale,
    sourceCollection: 'kangur_ai_tutor_content',
    sourceRecordId: locale,
    sourcePath: 'guidedCallout.auth.signInNav',
    tags: ['auth', 'login', 'guided-callout'],
  });
  createNode(nodes, {
    id: 'guide:kangur:create-account-nav',
    kind: 'guide',
    title: tutorContent.guidedCallout.authTitles.createAccountNav,
    summary: tutorContent.guidedCallout.authDetails.createAccountNav,
    source: 'kangur_ai_tutor_content',
    locale,
    sourceCollection: 'kangur_ai_tutor_content',
    sourceRecordId: locale,
    sourcePath: 'guidedCallout.auth.createAccountNav',
    tags: ['auth', 'signup', 'guided-callout'],
  });
  createNode(nodes, {
    id: 'faq:kangur:guest-intro',
    kind: 'faq',
    title: tutorContent.guestIntro.initial.headline,
    summary: tutorContent.guestIntro.initial.description,
    source: 'kangur_ai_tutor_content',
    locale,
    sourceCollection: 'kangur_ai_tutor_content',
    sourceRecordId: locale,
    sourcePath: 'guestIntro.initial',
    tags: ['guest-intro', 'website-help'],
  });
  createEdge(edges, {
    kind: 'EXPLAINS',
    from: 'flow:kangur:sign-in',
    to: 'guide:kangur:sign-in-nav',
    description: 'Tutor sign-in flow explains how to start signing in from the website shell.',
  });
  createEdge(edges, {
    kind: 'EXPLAINS',
    from: 'flow:kangur:create-account',
    to: 'guide:kangur:create-account-nav',
    description: 'Tutor signup flow explains how to start account creation from the website shell.',
  });
  createEdge(edges, {
    kind: 'RELATED_TO',
    from: 'faq:kangur:guest-intro',
    to: 'flow:kangur:sign-in',
    description: 'Guest intro offers the sign-in guidance path.',
  });
  createEdge(edges, {
    kind: 'RELATED_TO',
    from: 'faq:kangur:guest-intro',
    to: 'flow:kangur:create-account',
    description: 'Guest intro offers the create-account guidance path.',
  });

  for (const [rootKey, refs] of Object.entries(KANGUR_CONTEXT_ROOT_IDS)) {
    const definition = ROOT_DEFINITIONS[rootKey as keyof typeof ROOT_DEFINITIONS];
    const rootId = `root:kangur:${rootKey}`;
    createNode(nodes, {
      id: rootId,
      kind: 'context_root',
      title: definition.title,
      summary: definition.summary,
      source: 'kangur_context_registry',
      locale,
      sourceCollection: 'kangur_context_registry',
      sourceRecordId: rootKey,
      sourcePath: rootKey,
      tags: ['context-root', rootKey],
    });
    createEdge(edges, {
      kind: 'RELATED_TO',
      from: rootId,
      to: definition.relatedFlowId,
      description: `${definition.title} supports the ${definition.relatedFlowId.split(':').at(-1)} website-help flow.`,
    });
    for (const refId of refs) {
      createNode(nodes, buildReferenceNode(refId));
      createEdge(edges, {
        kind: 'HAS_REFERENCE',
        from: rootId,
        to: refId,
        description: `${definition.title} uses ${refId} as part of its Kangur knowledge context.`,
      });
    }
  }

  for (const entry of nativeGuideStore.entries) {
    if (!entry.enabled) {
      continue;
    }

    const guideNodeId = `guide:native:${entry.id}`;
    createNode(nodes, {
      id: guideNodeId,
      kind: 'guide',
      title: entry.title,
      summary: entry.shortDescription,
      source: 'kangur_ai_tutor_native_guides',
      locale,
      sourceCollection: 'kangur_ai_tutor_native_guides',
      sourceRecordId: entry.id,
      sourcePath: `entry:${entry.id}`,
      tags: [
        'native-guide',
        ...(entry.surface ? [entry.surface] : []),
        ...(entry.focusKind ? [entry.focusKind] : []),
      ],
      metadata: {
        hintCount: entry.hints.length,
        followUpActionCount: entry.followUpActions.length,
      },
    });

    createEdge(edges, {
      kind: 'RELATED_TO',
      from: 'app:kangur',
      to: guideNodeId,
      description: `Kangur native guide entry: ${entry.title}.`,
    });

    const flowId = entry.surface ? SURFACE_FLOW_IDS[entry.surface] : null;
    if (flowId) {
      createEdge(edges, {
        kind: 'EXPLAINS',
        from: flowId,
        to: guideNodeId,
        description: `${entry.title} supports ${flowId.split(':').at(-1)} help.`,
      });
    }
  }

  return {
    graphKey: KANGUR_KNOWLEDGE_GRAPH_KEY,
    locale,
    generatedAt: new Date().toISOString(),
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
};
