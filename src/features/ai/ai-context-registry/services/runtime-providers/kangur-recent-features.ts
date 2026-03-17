import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import type {
  ContextRegistryRef,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';

import type { RuntimeContextProvider } from '../runtime-provider';

export const KANGUR_RECENT_FEATURES_PROVIDER_ID = 'kangur-recent-features';
export const KANGUR_RECENT_FEATURES_REF_ID = 'runtime:kangur:recent-features';
export const KANGUR_RECENT_FEATURES_ENTITY_TYPE = 'kangur_recent_features';
export const KANGUR_RECENT_FEATURES_DOC_PATH = 'docs/kangur/recent-feature-updates.md';
export const KANGUR_RECENT_FEATURES_CONTEXT_ROOT_IDS = [
  'page:kangur-recent-features',
  'policy:kangur-recent-features-source',
] as const;

const PROVIDER_VERSION = '1';
const MAX_TEXT_LENGTH = 6000;
const MAX_SUMMARY_LENGTH = 500;

const stripFrontMatter = (value: string): string => {
  const trimmed = value.trimStart();
  if (!trimmed.startsWith('---')) return value;
  const endIndex = trimmed.indexOf('\n---', 3);
  if (endIndex === -1) return value;
  return trimmed.slice(endIndex + 4);
};

const truncateText = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  if (maxLength <= 1) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
};

const parseFrontMatterValue = (raw: string, key: string): string | null => {
  const regex = new RegExp(`^${key}:[\t ]*['\"]?(.+?)['\"]?$`, 'im');
  const match = raw.match(regex);
  return match ? match[1]?.trim() ?? null : null;
};

const parseWindowRange = (content: string): { start: string | null; end: string | null } => {
  const regex = /between\s+(\d{4}-\d{2}-\d{2})\s+and\s+(\d{4}-\d{2}-\d{2})/i;
  const match = content.match(regex);
  if (!match) return { start: null, end: null };
  return {
    start: match[1] ?? null,
    end: match[2] ?? null,
  };
};

const buildSections = (input: {
  content: string;
  windowStart: string | null;
  windowEnd: string | null;
  lastReviewed: string | null;
}): ContextRuntimeDocumentSection[] => {
  const sections: ContextRuntimeDocumentSection[] = [
    {
      kind: 'facts',
      title: 'Summary metadata',
      items: [
        {
          docPath: KANGUR_RECENT_FEATURES_DOC_PATH,
          windowStart: input.windowStart,
          windowEnd: input.windowEnd,
          lastReviewed: input.lastReviewed,
        },
      ],
    },
  ];

  const trimmedContent = input.content.trim();
  if (trimmedContent) {
    sections.push({
      kind: 'text',
      title: 'Recent feature updates',
      summary: 'Canonical summary of recent Kangur and StudiQ feature work.',
      text: truncateText(trimmedContent, MAX_TEXT_LENGTH),
    });
  }

  return sections;
};

const resolveAbsoluteDocPath = (): string =>
  path.resolve(process.cwd(), KANGUR_RECENT_FEATURES_DOC_PATH);

const loadRecentFeaturesDocument = async (): Promise<{
  content: string;
  lastReviewed: string | null;
  updatedAt: string | null;
}> => {
  const absolutePath = resolveAbsoluteDocPath();
  const [raw, stat] = await Promise.all([
    fs.readFile(absolutePath, 'utf8'),
    fs.stat(absolutePath).catch(() => null),
  ]);
  const lastReviewed = parseFrontMatterValue(raw, 'last_reviewed');
  const updatedAt = stat ? new Date(stat.mtime).toISOString() : null;
  const content = stripFrontMatter(raw).trim();
  return { content, lastReviewed, updatedAt };
};

const createRecentFeaturesRef = (): ContextRegistryRef => ({
  id: KANGUR_RECENT_FEATURES_REF_ID,
  kind: 'runtime_document',
  providerId: KANGUR_RECENT_FEATURES_PROVIDER_ID,
  entityType: KANGUR_RECENT_FEATURES_ENTITY_TYPE,
});

const buildRecentFeaturesRuntimeDocument = async (): Promise<ContextRuntimeDocument> => {
  const { content, lastReviewed, updatedAt } = await loadRecentFeaturesDocument();
  const windowRange = parseWindowRange(content);
  const summarySource = content || 'No recent feature updates available.';

  return {
    id: KANGUR_RECENT_FEATURES_REF_ID,
    kind: 'runtime_document',
    entityType: KANGUR_RECENT_FEATURES_ENTITY_TYPE,
    title: 'Kangur recent feature updates',
    summary: truncateText(summarySource, MAX_SUMMARY_LENGTH),
    status: null,
    tags: ['kangur', 'studiq', 'documentation', 'recent-features', 'release-notes'],
    relatedNodeIds: [...KANGUR_RECENT_FEATURES_CONTEXT_ROOT_IDS],
    timestamps: {
      updatedAt: updatedAt ?? undefined,
    },
    facts: {
      docPath: KANGUR_RECENT_FEATURES_DOC_PATH,
      windowStart: windowRange.start,
      windowEnd: windowRange.end,
      lastReviewed,
    },
    sections: buildSections({
      content,
      windowStart: windowRange.start,
      windowEnd: windowRange.end,
      lastReviewed,
    }),
    provenance: {
      source: KANGUR_RECENT_FEATURES_DOC_PATH,
      persisted: true,
    },
  };
};

export const kangurRecentFeaturesContextProvider: RuntimeContextProvider = {
  id: KANGUR_RECENT_FEATURES_PROVIDER_ID,
  canInferRefs(): boolean {
    return false;
  },
  inferRefs(): ContextRegistryRef[] {
    return [];
  },
  canResolveRef(ref: ContextRegistryRef): boolean {
    return ref.kind === 'runtime_document' && ref.id === KANGUR_RECENT_FEATURES_REF_ID;
  },
  async resolveRefs(refs: ContextRegistryRef[], options?): Promise<ContextRuntimeDocument[]> {
    const matching = refs.filter((ref) =>
      ref.kind === 'runtime_document' && ref.id === KANGUR_RECENT_FEATURES_REF_ID
    );
    if (matching.length === 0) return [];

    const doc = await buildRecentFeaturesRuntimeDocument();
    const docs = Array(matching.length).fill(doc);
    if (options?.maxDocuments && docs.length > options.maxDocuments) {
      return docs.slice(0, options.maxDocuments);
    }
    return docs;
  },
  getVersion(): string {
    return PROVIDER_VERSION;
  },
};

export const createKangurRecentFeaturesRef = createRecentFeaturesRef;
