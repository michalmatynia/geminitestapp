import {
  KANGUR_CONTEXT_ROOT_IDS,
  KANGUR_RUNTIME_PROVIDER_ID,
} from '@/features/kangur/context-registry/refs';
import {
  getKangurHomeHref,
  getKangurPageSlug,
} from '@/features/kangur/config/routing';
import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  type KangurAiTutorContent,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  type KangurAiTutorNativeGuideStore,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';
import { buildDefaultKangurPageContentStore } from '@/features/kangur/page-content-catalog';
import type { KangurPageContentStore } from '@/features/kangur/shared/contracts/kangur-page-content';
import type { Page } from '@/shared/contracts/cms';
import {
  extractCmsPageTextContent,
  buildCmsPageSemanticText,
  hasMeaningfulTextContent,
} from '@/features/cms/server';
import {
  KANGUR_KNOWLEDGE_GRAPH_KEY,
  type KangurKnowledgeEdgeKind,
  type KangurKnowledgeGraphEdge,
  type KangurKnowledgeGraphNode,
  type KangurKnowledgeGraphSnapshot,
  type KangurKnowledgeNodeKind,
  type KangurKnowledgeNodeSource,
} from '@/features/kangur/shared/contracts/kangur-knowledge-graph';

import { buildKangurKnowledgeNodeSemanticText } from './semantic';

type BuildKangurKnowledgeGraphOptions = {
  locale?: string;
  tutorContent?: KangurAiTutorContent;
  nativeGuideStore?: KangurAiTutorNativeGuideStore;
  pageContentStore?: KangurPageContentStore;
  cmsPages?: Page[];
};

type LocalizedValue<T> = T | Partial<Record<string, T>>;

type ReferenceDetail = {
  title: LocalizedValue<string>;
  summary: LocalizedValue<string>;
  route?: string;
  triggerPhrases?: LocalizedValue<string[]>;
  tags?: LocalizedValue<string[]>;
  semanticText?: LocalizedValue<string>;
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
  gameLibraryContext: {
    title: 'Games and practice help',
    summary:
      'Game-home navigation, reusable game catalog references, and tutor context for practice-mode guidance.',
    relatedFlowId: 'flow:kangur:game-help',
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

const KANGUR_HOME_ROUTE = getKangurHomeHref('/');

const toRelativeKangurPageRoute = (pageName: string): string => {
  const slug = getKangurPageSlug(pageName).trim().replace(/^\/+/, '');
  return slug.length > 0 ? `/${slug}` : KANGUR_HOME_ROUTE;
};

const FLOW_TARGETS: Partial<Record<string, {
  route: string;
  anchorId?: string;
}>> = {
  'flow:kangur:sign-in': {
    route: KANGUR_HOME_ROUTE,
    anchorId: 'kangur-primary-nav-login',
  },
  'flow:kangur:create-account': {
    route: KANGUR_HOME_ROUTE,
    anchorId: 'kangur-primary-nav-login',
  },
  'flow:kangur:game-help': {
    route: toRelativeKangurPageRoute('Game'),
  },
};

const SURFACE_ROUTES: Partial<Record<string, string>> = {
  lesson: toRelativeKangurPageRoute('Lessons'),
  test: '/tests',
  game: toRelativeKangurPageRoute('Game'),
  profile: toRelativeKangurPageRoute('LearnerProfile'),
  parent_dashboard: toRelativeKangurPageRoute('ParentDashboard'),
  auth: KANGUR_HOME_ROUTE,
};

const PAGE_CONTENT_PARENT_NODE_IDS: Partial<Record<string, string>> = {
  Game: 'page:kangur-game',
  Lessons: 'page:kangur-lessons',
  Tests: 'page:kangur-tests',
  LearnerProfile: 'page:kangur-learner-profile',
  ParentDashboard: 'page:kangur-parent-dashboard',
};

const REFERENCE_DETAILS: Partial<Record<string, ReferenceDetail>> = {
  'page:kangur-learner-profile': {
    title: 'Learner profile page',
    summary: 'Kangur learner profile with progress, streaks, and recommendations.',
    route: toRelativeKangurPageRoute('LearnerProfile'),
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
    title: {
      pl: 'Lekcje',
      en: 'Lessons page',
    },
    summary: {
      pl: 'Biblioteka lekcji i ekran nawigacji po lekcjach w Kangurze.',
      en: 'Lesson library and lesson navigation surface in Kangur.',
    },
    route: toRelativeKangurPageRoute('Lessons'),
    triggerPhrases: {
      pl: [
        'lekcje',
        'gdzie są lekcje',
        'gdzie znajdę lekcje',
        'otwórz lekcje',
        'biblioteka lekcji',
        'wróć do lekcji',
        'wrócić do lekcji',
      ],
      en: ['lessons', 'lesson library', 'open lessons'],
    },
    tags: {
      pl: ['lekcje', 'biblioteka-lekcji'],
      en: ['lessons', 'lesson-library'],
    },
    semanticText: {
      pl: 'Ekran lekcji w Kangurze. To tutaj uczeń znajduje lekcje, bibliotekę lekcji i wraca do tematów.',
      en: 'Kangur lessons page where learners find lessons and the lesson library.',
    },
  },
  'collection:kangur-lessons': {
    title: 'Lessons collection',
    summary: 'Lesson metadata and library entries referenced by the tutor.',
  },
  'collection:kangur-games': {
    title: 'Games collection',
    summary: 'Available Kangur games and practice metadata referenced by the tutor.',
  },
  'policy:kangur-ai-tutor-socratic': {
    title: 'Socratic tutor policy',
    summary: 'Tutor behavior policy for guided, answer-safe Kangur explanations.',
  },
  'page:kangur-tests': {
    title: {
      pl: 'Testy',
      en: 'Tests page',
    },
    summary: {
      pl: 'Ekran testów i nawigacji po testach w Kangurze.',
      en: 'Kangur tests and exam-navigation surface.',
    },
    route: SURFACE_ROUTES['test'],
    triggerPhrases: {
      pl: [
        'testy',
        'testów',
        'gdzie są testy',
        'gdzie znajdę testy',
        'otwórz testy',
        'wróć do testów',
        'wrócić do testów',
        'jak wrócić do testów',
        'powrót do testów',
        'ekran testów',
      ],
      en: ['tests', 'open tests', 'tests page'],
    },
    tags: {
      pl: ['testy', 'ekran-testow'],
      en: ['tests', 'tests-page'],
    },
    semanticText: {
      pl: 'Ekran testów w Kangurze. To tutaj uczeń znajduje testy, wraca do testów i przechodzi do zestawów testowych. Gdy pyta, gdzie są testy albo jak wrócić do testów, odpowiedzią jest ta strona.',
      en: 'Kangur tests page where learners find and return to tests.',
    },
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
    route: toRelativeKangurPageRoute('ParentDashboard'),
  },
  'page:kangur-game': {
    title: 'Game home page',
    summary: 'Learner home and quick-start Kangur game surface.',
    route: toRelativeKangurPageRoute('Game'),
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
    id: 'flow:kangur:game-help',
    title: 'Games and practice help',
    summary: 'How to find games and start practice activities in Kangur.',
    tags: ['games', 'navigation', 'practice'],
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

const resolveLocalizedValue = <T>(value: LocalizedValue<T> | undefined, locale: string): T | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value) || typeof value !== 'object' || value === null) {
    return value as T;
  }
  const localizedRecord = value as Partial<Record<string, T>>;
  return localizedRecord[locale] ?? localizedRecord['pl'] ?? Object.values(localizedRecord)[0];
};

const inferReferenceTitle = (refId: string, locale: string): string => {
  const detail = REFERENCE_DETAILS[refId];
  const title = resolveLocalizedValue(detail?.title, locale);
  if (title) return title;
  const [, raw = refId] = refId.split(':', 2);
  return `${toSentenceCase(raw)} reference`;
};

const inferReferenceSummary = (refId: string, locale: string): string => {
  const detail = REFERENCE_DETAILS[refId];
  const summary = resolveLocalizedValue(detail?.summary, locale);
  if (summary) return summary;
  return 'Kangur website knowledge reference.';
};

const createNode = (
  nodes: Map<string, KangurKnowledgeGraphNode>,
  node: KangurKnowledgeGraphNode
): void => {
  nodes.set(node.id, {
    ...node,
    semanticText: buildKangurKnowledgeNodeSemanticText(node),
  });
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
  source: KangurKnowledgeNodeSource = 'kangur_context_registry',
  locale = 'pl'
): KangurKnowledgeGraphNode => {
  const detail = REFERENCE_DETAILS[refId];
  const kind = inferReferenceKind(refId);

  return {
    id: refId,
    kind,
    title: inferReferenceTitle(refId, locale),
    summary: inferReferenceSummary(refId, locale),
    source,
    refId,
    sourceCollection: 'kangur_context_registry',
    sourceRecordId: refId,
    sourcePath: refId,
    route: detail?.route,
    triggerPhrases: resolveLocalizedValue(detail?.triggerPhrases, locale),
    semanticText: resolveLocalizedValue(detail?.semanticText, locale),
    tags: [
      'kangur',
      kind,
      ...(resolveLocalizedValue(detail?.tags, locale) ?? []),
    ],
  };
};

const SURFACE_FLOW_IDS: Partial<Record<string, string>> = {
  lesson: 'flow:kangur:lesson-help',
  game: 'flow:kangur:game-help',
  test: 'flow:kangur:test-help',
  assignment: 'flow:kangur:assignment-help',
};

const resolveNativeGuidePrimaryActionRoute = (
  pageName: string | null | undefined
): string | undefined => (pageName ? toRelativeKangurPageRoute(pageName) : undefined);

const resolveConcreteAnchorId = (value: string | null | undefined): string | undefined => {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.endsWith(':') ? undefined : normalized;
};

const resolveNativeGuideDirectTarget = (entry: {
  id: string;
  surface?: string | null;
  focusKind?: string | null;
  focusIdPrefixes: string[];
  followUpActions: Array<{ page: string }>;
}): { route?: string; anchorId?: string } => {
  if (entry.focusKind === 'login_action') {
    return {
      route: KANGUR_HOME_ROUTE,
      anchorId: 'kangur-primary-nav-login',
    };
  }

  if (entry.focusKind === 'create_account_action') {
    return {
      route: KANGUR_HOME_ROUTE,
      anchorId: 'kangur-primary-nav-login',
    };
  }

  if (entry.surface === 'auth') {
    return {
      route: KANGUR_HOME_ROUTE,
    };
  }

  const surfaceRoute = entry.surface ? SURFACE_ROUTES[entry.surface] : undefined;
  if (surfaceRoute) {
    return {
      route: surfaceRoute,
      anchorId: resolveConcreteAnchorId(entry.focusIdPrefixes[0]),
    };
  }

  return {
    route: resolveNativeGuidePrimaryActionRoute(entry.followUpActions[0]?.page),
    anchorId: resolveConcreteAnchorId(entry.focusIdPrefixes[0]),
  };
};

export const buildKangurKnowledgeGraph = (
  options: BuildKangurKnowledgeGraphOptions = {}
): KangurKnowledgeGraphSnapshot => {
  const locale = options.locale?.trim() || 'pl';
  const tutorContent = options.tutorContent ?? DEFAULT_KANGUR_AI_TUTOR_CONTENT;
  const nativeGuideStore =
    options.nativeGuideStore ?? DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE;
  const pageContentStore = options.pageContentStore ?? buildDefaultKangurPageContentStore(locale);
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
    const target = FLOW_TARGETS[flow.id];
    createNode(nodes, {
      id: flow.id,
      kind: 'flow',
      title: flow.title,
      summary: flow.summary,
      source: 'kangur_manual_manifest',
      locale,
      route: target?.route,
      anchorId: target?.anchorId,
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
    route: KANGUR_HOME_ROUTE,
    anchorId: 'kangur-primary-nav-login',
    sourceCollection: 'kangur_ai_tutor_content',
    sourceRecordId: locale,
    sourcePath: 'common.signInLabel',
    tags: ['auth', 'login', 'anchor'],
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
    to: 'anchor:kangur:login',
    description: 'Guided signup starts from the main login navigation anchor.',
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
      createNode(nodes, buildReferenceNode(refId, 'kangur_context_registry', locale));
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
    const directTarget = resolveNativeGuideDirectTarget(entry);
    createNode(nodes, {
      id: guideNodeId,
      kind: 'guide',
      title: entry.title,
      summary: entry.shortDescription,
      source: 'kangur_ai_tutor_native_guides',
      locale,
      surface: entry.surface ?? undefined,
      focusKind: entry.focusKind ?? undefined,
      route: directTarget.route,
      anchorId: directTarget.anchorId,
      sourceCollection: 'kangur_ai_tutor_native_guides',
      sourceRecordId: entry.id,
      sourcePath: `entry:${entry.id}`,
      focusIdPrefixes: entry.focusIdPrefixes,
      contentIdPrefixes: entry.contentIdPrefixes,
      triggerPhrases: entry.triggerPhrases,
      semanticText: [
        entry.title,
        entry.shortDescription,
        entry.fullDescription,
        entry.hints.length > 0 ? `Hints: ${entry.hints.join(' | ')}` : null,
        entry.followUpActions.length > 0
          ? `Follow up actions: ${entry.followUpActions.map((action) => `${action.label} -> ${action.page}`).join(' | ')}`
          : null,
        entry.relatedGames.length > 0 ? `Related games: ${entry.relatedGames.join(', ')}` : null,
        entry.relatedTests.length > 0 ? `Related tests: ${entry.relatedTests.join(', ')}` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join('\n'),
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

    if (entry.focusKind === 'login_action') {
      createEdge(edges, {
        kind: 'LEADS_TO',
        from: guideNodeId,
        to: 'anchor:kangur:login',
        description: `${entry.title} sends learners to the Kangur login anchor.`,
      });
      createEdge(edges, {
        kind: 'RELATED_TO',
        from: guideNodeId,
        to: 'flow:kangur:sign-in',
        description: `${entry.title} supports the Kangur sign-in flow.`,
      });
    } else if (entry.focusKind === 'create_account_action') {
      createEdge(edges, {
        kind: 'LEADS_TO',
        from: guideNodeId,
        to: 'anchor:kangur:login',
        description: `${entry.title} sends learners to the Kangur login anchor before account creation.`,
      });
      createEdge(edges, {
        kind: 'RELATED_TO',
        from: guideNodeId,
        to: 'flow:kangur:create-account',
        description: `${entry.title} supports the Kangur create-account flow.`,
      });
    } else if (entry.surface === 'auth') {
      createEdge(edges, {
        kind: 'RELATED_TO',
        from: guideNodeId,
        to: 'flow:kangur:sign-in',
        description: `${entry.title} supports the Kangur sign-in flow.`,
      });
    }

    for (const action of entry.followUpActions) {
      const actionNodeId = `action:native:${entry.id}:${action.id}`;
      createNode(nodes, {
        id: actionNodeId,
        kind: 'action',
        title: action.label,
        summary: action.reason ?? `Suggested Kangur action from ${entry.title}.`,
        source: 'kangur_ai_tutor_native_guides',
        locale,
        route: toRelativeKangurPageRoute(action.page),
        sourceCollection: 'kangur_ai_tutor_native_guides',
        sourceRecordId: entry.id,
        sourcePath: `entry:${entry.id}.followUpAction:${action.id}`,
        tags: ['native-guide-action', action.page],
      });
      createEdge(edges, {
        kind: 'LEADS_TO',
        from: guideNodeId,
        to: actionNodeId,
        description: `${entry.title} suggests the ${action.label} follow-up action.`,
      });
    }
  }

  for (const entry of pageContentStore.entries) {
    if (!entry.enabled) {
      continue;
    }

    const sectionNodeId = `guide:page-content:${entry.id}`;
    createNode(nodes, {
      id: sectionNodeId,
      kind: 'guide',
      title: entry.title,
      summary: entry.summary,
      source: 'kangur_page_content',
      locale,
      surface: entry.surface ?? undefined,
      focusKind: entry.focusKind ?? undefined,
      route: entry.route ?? undefined,
      anchorId: entry.anchorIdPrefix ?? undefined,
      sourceCollection: 'kangur_page_content',
      sourceRecordId: entry.id,
      sourcePath: `entry:${entry.id}`,
      contentIdPrefixes: entry.contentIdPrefixes,
      triggerPhrases: entry.triggerPhrases,
      semanticText: [entry.title, entry.summary, entry.body, entry.notes ?? null]
        .filter((value): value is string => Boolean(value))
        .join('\n'),
      tags: entry.tags,
      metadata: {
        pageKey: entry.pageKey,
        screenKey: entry.screenKey,
        widget: entry.widget,
      },
    });

    const parentNodeId = PAGE_CONTENT_PARENT_NODE_IDS[entry.pageKey];
    if (parentNodeId) {
      createEdge(edges, {
        kind: 'HAS_REFERENCE',
        from: parentNodeId,
        to: sectionNodeId,
        description: `${entry.title} is a tracked Kangur page-content section on ${entry.pageKey}.`,
      });
    } else {
      createEdge(edges, {
        kind: 'RELATED_TO',
        from: 'app:kangur',
        to: sectionNodeId,
        description: `${entry.title} is a tracked Kangur auth or shared-chrome content section.`,
      });
    }

    for (const nativeGuideId of entry.nativeGuideIds) {
      createEdge(edges, {
        kind: 'EXPLAINS',
        from: sectionNodeId,
        to: `guide:native:${nativeGuideId}`,
        description: `${entry.title} resolves to the ${nativeGuideId} native guide explanation.`,
      });
    }
  }

  // Source 6: CMS pages
  const cmsPages = options.cmsPages ?? [];
  for (const page of cmsPages) {
    if (page.status !== 'published') {
      continue;
    }

    const textContent = extractCmsPageTextContent(page);
    if (!hasMeaningfulTextContent(textContent)) {
      continue;
    }

    const cmsNodeId = `cms-page:${page.id}`;
    const defaultSlug = page.slugs?.[0]?.slug;
    const route = defaultSlug ? `/${defaultSlug}` : undefined;
    const title = page.seoTitle ?? page.name;
    const triggerPhrases: string[] = [];

    if (page.name) {
      triggerPhrases.push(page.name.toLowerCase());
    }
    if (defaultSlug) {
      triggerPhrases.push(defaultSlug.replace(/-/g, ' '));
    }

    createNode(nodes, {
      id: cmsNodeId,
      kind: 'page',
      title,
      summary: page.seoDescription ?? '',
      source: 'cms_pages',
      locale,
      route,
      sourceCollection: 'cms_pages',
      sourceRecordId: page.id,
      sourcePath: `cms-page:${page.id}`,
      triggerPhrases,
      semanticText: buildCmsPageSemanticText(textContent),
      tags: ['cms', 'cms-page', 'website'],
    });

    createEdge(edges, {
      kind: 'RELATED_TO',
      from: 'app:kangur',
      to: cmsNodeId,
      description: `Kangur CMS website page: ${title}.`,
    });
  }

  return {
    graphKey: KANGUR_KNOWLEDGE_GRAPH_KEY,
    locale,
    generatedAt: new Date().toISOString(),
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
};
