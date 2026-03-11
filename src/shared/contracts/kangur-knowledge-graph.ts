export const KANGUR_KNOWLEDGE_GRAPH_KEY = 'kangur-website-help-v1';

export const KANGUR_KNOWLEDGE_NODE_KINDS = [
  'app',
  'flow',
  'faq',
  'guide',
  'anchor',
  'context_root',
  'page',
  'collection',
  'action',
  'policy',
] as const;

export type KangurKnowledgeNodeKind = (typeof KANGUR_KNOWLEDGE_NODE_KINDS)[number];

export const KANGUR_KNOWLEDGE_EDGE_KINDS = [
  'HAS_FLOW',
  'HAS_REFERENCE',
  'LEADS_TO',
  'EXPLAINS',
  'RELATED_TO',
  'USES_ANCHOR',
] as const;

export type KangurKnowledgeEdgeKind = (typeof KANGUR_KNOWLEDGE_EDGE_KINDS)[number];

export const KANGUR_KNOWLEDGE_NODE_SOURCES = [
  'kangur_context_registry',
  'kangur_ai_tutor_content',
  'kangur_ai_tutor_native_guides',
  'kangur_manual_manifest',
] as const;

export type KangurKnowledgeNodeSource = (typeof KANGUR_KNOWLEDGE_NODE_SOURCES)[number];

export const KANGUR_KNOWLEDGE_CANONICAL_SOURCE_COLLECTIONS = [
  'kangur_ai_tutor_content',
  'kangur_ai_tutor_native_guides',
  'kangur_context_registry',
] as const;

export type KangurKnowledgeCanonicalSourceCollection =
  (typeof KANGUR_KNOWLEDGE_CANONICAL_SOURCE_COLLECTIONS)[number];

export type KangurKnowledgeMetadataValue = string | number | boolean | null;

export interface KangurKnowledgeGraphNode {
  id: string;
  kind: KangurKnowledgeNodeKind;
  title: string;
  summary?: string | undefined;
  source: KangurKnowledgeNodeSource;
  locale?: string | undefined;
  route?: string | undefined;
  anchorId?: string | undefined;
  refId?: string | undefined;
  sourceCollection?: KangurKnowledgeCanonicalSourceCollection | undefined;
  sourceRecordId?: string | undefined;
  sourcePath?: string | undefined;
  tags?: string[] | undefined;
  metadata?: Record<string, KangurKnowledgeMetadataValue> | undefined;
}

export interface KangurKnowledgeGraphEdge {
  id: string;
  kind: KangurKnowledgeEdgeKind;
  from: string;
  to: string;
  description?: string | undefined;
  weight?: number | undefined;
  metadata?: Record<string, KangurKnowledgeMetadataValue> | undefined;
}

export interface KangurKnowledgeGraphSnapshot {
  graphKey: string;
  locale: string;
  generatedAt: string;
  nodes: KangurKnowledgeGraphNode[];
  edges: KangurKnowledgeGraphEdge[];
}
