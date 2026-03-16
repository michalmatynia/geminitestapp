import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type { KangurAiTutorWebsiteHelpTarget } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurKnowledgeCanonicalSourceCollection } from '@/features/kangur/shared/contracts/kangur-knowledge-graph';

export type GraphFollowUpAction = {
  id: string;
  label: string;
  page: string;
  reason: string | null;
};

export const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  '/game': 'Game',
  '/lessons': 'Lessons',
  '/profile': 'LearnerProfile',
  '/parent': 'ParentDashboard',
};

export type KangurKnowledgeGraphHit = {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  surface: string | null;
  focusKind: string | null;
  route: string | null;
  anchorId: string | null;
  semanticText: string | null;
  embedding: number[];
  embeddingModel: string | null;
  embeddingDimensions: number | null;
  focusIdPrefixes: string[];
  contentIdPrefixes: string[];
  triggerPhrases: string[];
  sourceCollection: KangurKnowledgeCanonicalSourceCollection | null;
  sourceRecordId: string | null;
  sourcePath: string | null;
  tags: string[];
  semanticScore: number;
  relations: Array<{
    kind: string | null;
    targetId: string | null;
    targetTitle: string | null;
    targetKind: string | null;
    targetAnchorId: string | null;
    targetRoute: string | null;
    hop?: number;
  }>;
  tokenHits: number;
};

export type HydratedKnowledgeGraphHit = KangurKnowledgeGraphHit & {
  canonicalTitle: string;
  canonicalSummary: string | null;
  canonicalText: string;
  canonicalTags: string[];
  canonicalSourceCollection: string;
  hydrationSource:
    | 'kangur_page_content'
    | 'kangur_ai_tutor_content'
    | 'kangur_ai_tutor_native_guides'
    | 'cms_pages'
    | 'kangur-runtime-context'
    | 'graph_fallback';
};

export const ROOT_ENTITY_TYPE_BY_NODE_ID: Partial<Record<string, ContextRuntimeDocument['entityType']>> = {
  'root:kangur:learnerSnapshot': 'kangur_learner_snapshot',
  'root:kangur:loginActivity': 'kangur_login_activity',
  'root:kangur:lessonContext': 'kangur_lesson_context',
  'root:kangur:testContext': 'kangur_test_context',
  'root:kangur:assignmentContext': 'kangur_assignment_context',
};

export type KangurKnowledgeGraphQueryMode = 'website_help' | 'semantic';
export type KangurKnowledgeGraphRecallStrategy =
  | 'metadata_only'
  | 'vector_only'
  | 'hybrid_vector';

export type KangurKnowledgeGraphRetrievalResult =
  | {
      status: 'disabled' | 'skipped' | 'miss';
      queryMode: null;
      instructions: null;
      sources: [];
      nodeIds: [];
    }
  | {
      status: 'hit';
      queryMode: KangurKnowledgeGraphQueryMode;
      recallStrategy: KangurKnowledgeGraphRecallStrategy;
      lexicalHitCount: number;
      vectorHitCount: number;
      vectorRecallAttempted: boolean;
      instructions: string;
      sources: AgentTeachingChatSource[];
      nodeIds: string[];
      websiteHelpTarget: KangurAiTutorWebsiteHelpTarget | null;
      graphFollowUpActions: GraphFollowUpAction[];
      sourceCollections: string[];
      hydrationSources: HydratedKnowledgeGraphHit['hydrationSource'][];
    };

export type KangurKnowledgeGraphDebugHit = {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  surface: string | null;
  focusKind: string | null;
  route: string | null;
  anchorId: string | null;
  sourceCollection: KangurKnowledgeCanonicalSourceCollection | null;
  sourceRecordId: string | null;
  sourcePath: string | null;
  semanticScore: number;
  tokenHits: number;
  relatedTargetIds: string[];
  canonicalTitle: string;
  canonicalSummary: string | null;
  canonicalSourceCollection: string;
  hydrationSource: HydratedKnowledgeGraphHit['hydrationSource'];
};

export type KangurKnowledgeGraphRetrievalPreviewResult =
  | {
      status: 'disabled' | 'skipped' | 'miss';
      queryMode: null;
      querySeed: string;
      normalizedQuerySeed: string;
      tokens: string[];
      instructions: null;
      sources: [];
      nodeIds: [];
      hits: [];
    }
  | {
      status: 'hit';
      queryMode: KangurKnowledgeGraphQueryMode;
      recallStrategy: KangurKnowledgeGraphRecallStrategy;
      lexicalHitCount: number;
      vectorHitCount: number;
      vectorRecallAttempted: boolean;
      querySeed: string;
      normalizedQuerySeed: string;
      tokens: string[];
      instructions: string;
      sources: AgentTeachingChatSource[];
      nodeIds: string[];
      websiteHelpTarget: KangurAiTutorWebsiteHelpTarget | null;
      graphFollowUpActions: GraphFollowUpAction[];
      hits: KangurKnowledgeGraphDebugHit[];
      sourceCollections: string[];
      hydrationSources: HydratedKnowledgeGraphHit['hydrationSource'][];
    };

export type KangurKnowledgeGraphQueryIntent = {
  preferredSurfaces: string[];
  preferredRoutes: string[];
  preferredFocusKinds: string[];
  isLocationLookup: boolean;
};

export const WEBSITE_HELP_PATTERNS = [
  /co to jest/u,
  /co robi/u,
  /jak dzia[łl]a/u,
  /jak korzysta[ćc]/u,
  /gdzie znajd[ęe]/u,
  /jak wej[śs]c/u,
  /jak si[eę] zalogowa[ćc]/u,
  /jak za[łl]o[żz]y[ćc] konto/u,
  /zaloguj/u,
  /login/u,
  /konto/u,
  /lekcj/u,
  /test/u,
  /zadani/u,
  /profil/u,
  /panel rodzica/u,
  /gdzie jest/u,
  /jak otw[oó]rzy[ćc]/u,
  /jak przej[śs]c/u,
  /stron/u,
  /witryn/u,
  /podstron/u,
  /informacj/u,
  /o nas/u,
  /kontakt/u,
  /regulamin/u,
  /cennik/u,
  /ofert/u,
];

export const SEMANTIC_HELP_PATTERNS = [
  ...WEBSITE_HELP_PATTERNS,
  /wyja[śs]nij/u,
  /opisz/u,
  /sekcj/u,
  /panel/u,
  /widok/u,
  /ekran/u,
  /plansz/u,
  /co widze/u,
  /co oznacza/u,
  /co dalej/u,
  /na czym polega/u,
  /powiedz o/u,
  /zapytaj o to/u,
];
