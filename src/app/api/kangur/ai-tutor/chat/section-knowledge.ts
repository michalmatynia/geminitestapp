import 'server-only';

import { resolveKangurTutorSectionKnowledgeReference } from '@/features/kangur/ai-tutor-section-knowledge';
import { getKangurAiTutorNativeGuideStore } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorFollowUpAction,
  KangurAiTutorKnowledgeReference,
} from '@/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorNativeGuideEntry } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import type { KangurPageContentEntry } from '@/shared/contracts/kangur-page-content';

export type KangurAiTutorSectionKnowledgeBundle = {
  section: KangurPageContentEntry;
  linkedNativeGuides: KangurAiTutorNativeGuideEntry[];
  instructions: string;
  sources: AgentTeachingChatSource[];
  followUpActions: KangurAiTutorFollowUpAction[];
};

const LOCATION_LOOKUP_PATTERNS = [
  /gdzie/u,
  /jak przejsc/u,
  /jak przejść/u,
  /dokad/u,
  /dokąd/u,
  /jak wejsc/u,
  /jak wejść/u,
  /jak otworzyc/u,
  /jak otworzyć/u,
  /na jaka strone/u,
  /na jaką stronę/u,
];

const normalizeText = (value: string | null | undefined): string =>
  typeof value === 'string'
    ? value
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

const isLocationLookup = (value: string | null | undefined): boolean => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return false;
  }
  return LOCATION_LOOKUP_PATTERNS.some((pattern) => pattern.test(normalized));
};

const dedupeSources = (sources: AgentTeachingChatSource[]): AgentTeachingChatSource[] => {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.collectionId}:${source.documentId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const dedupeFollowUpActions = (
  actions: KangurAiTutorFollowUpAction[]
): KangurAiTutorFollowUpAction[] => {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.id}:${action.page}:${action.label}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const buildPageContentSourceText = (entry: KangurPageContentEntry): string =>
  [
    `Section: ${entry.title}`,
    `Page: ${entry.pageKey}`,
    entry.summary,
    entry.body,
    entry.route ? `Route: ${entry.route}` : null,
    entry.anchorIdPrefix ? `Anchor prefix: ${entry.anchorIdPrefix}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n');

const buildNativeGuideSourceText = (entry: KangurAiTutorNativeGuideEntry): string =>
  [
    `Guide: ${entry.title}`,
    entry.shortDescription,
    entry.fullDescription,
    entry.hints.length > 0 ? `Hints: ${entry.hints.join(' | ')}` : null,
    entry.followUpActions.length > 0
      ? `Follow-up actions: ${entry.followUpActions.map((action) => `${action.label} -> ${action.page}`).join(' | ')}`
      : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n');

const buildSectionKnowledgeInstructions = (input: {
  section: KangurPageContentEntry;
  linkedNativeGuides: KangurAiTutorNativeGuideEntry[];
  followUpActions: KangurAiTutorFollowUpAction[];
}): string => {
  const lines = [
    'Current visible Kangur website section (canonical website content):',
    `- ${input.section.title}`,
    `  Summary: ${input.section.summary}`,
    `  Body: ${input.section.body}`,
    ...(input.section.route || input.section.anchorIdPrefix
      ? [
          `  Website target: ${[input.section.route, input.section.anchorIdPrefix ? `anchor=${input.section.anchorIdPrefix}` : null]
            .filter(Boolean)
            .join(' · ')}`,
        ]
      : []),
  ];

  if (input.linkedNativeGuides.length > 0) {
    lines.push('');
    lines.push('Linked Kangur knowledge-base guidance for this section:');
    input.linkedNativeGuides.forEach((guide) => {
      lines.push(`- ${guide.title}`);
      lines.push(`  ${guide.shortDescription}`);
      lines.push(`  ${guide.fullDescription}`);
      if (guide.hints.length > 0) {
        lines.push(`  Hints: ${guide.hints.join(' | ')}`);
      }
    });
  }

  if (input.followUpActions.length > 0) {
    lines.push('');
    lines.push(
      `If the learner asks where to go next, these page actions are valid: ${input.followUpActions
        .map((action) => `${action.label} -> ${action.page}`)
        .join(' | ')}`
    );
  }

  lines.push('');
  lines.push(
    'When the learner asks about this part of the website, combine what the section is/contains with how to use it. Explain the visible section first, then suggest next navigation only if it is actually needed.'
  );

  return lines.join('\n');
};

const resolvePageContentReferenceFromNativeGuide = (
  input: {
    context: KangurAiTutorConversationContext;
    pageContentEntries: KangurPageContentEntry[];
  }
): KangurAiTutorKnowledgeReference | null => {
  const guideId =
    input.context.knowledgeReference?.sourceCollection === 'kangur_ai_tutor_native_guides'
      ? input.context.knowledgeReference.sourceRecordId
      : null;
  if (!guideId) {
    return null;
  }

  const normalizedContentId = normalizeText(input.context.contentId);
  const normalizedFocusId = normalizeText(input.context.focusId);
  const candidates = input.pageContentEntries
    .map((entry) => {
      if (!entry.enabled || !entry.nativeGuideIds.includes(guideId)) {
        return null;
      }

      let score = 400;
      if (entry.surface && entry.surface === input.context.surface) {
        score += 120;
      }
      if (entry.focusKind && entry.focusKind === input.context.focusKind) {
        score += 180;
      }
      if (normalizedContentId) {
        if (entry.contentIdPrefixes.some((prefix) => normalizeText(prefix) === normalizedContentId)) {
          score += 140;
        } else if (
          entry.contentIdPrefixes.some((prefix) => normalizedContentId.startsWith(normalizeText(prefix)))
        ) {
          score += 80;
        }
      }
      if (normalizedFocusId && entry.anchorIdPrefix) {
        const normalizedAnchorPrefix = normalizeText(entry.anchorIdPrefix);
        if (normalizedFocusId === normalizedAnchorPrefix) {
          score += 160;
        } else if (normalizedFocusId.startsWith(normalizedAnchorPrefix)) {
          score += 100;
        }
      }

      return { entry, score };
    })
    .filter((candidate): candidate is { entry: KangurPageContentEntry; score: number } => Boolean(candidate))
    .sort((left, right) => right.score - left.score);

  const selected = candidates[0]?.entry;
  if (!selected) {
    return null;
  }

  return {
    sourceCollection: 'kangur_page_content',
    sourceRecordId: selected.id,
    sourcePath: `entry:${selected.id}`,
  };
};

const resolvePageContentReference = (input: {
  context: KangurAiTutorConversationContext | undefined;
  pageContentEntries: KangurPageContentEntry[];
}): KangurAiTutorKnowledgeReference | null => {
  const context = input.context;
  if (!context) {
    return null;
  }

  if (context.knowledgeReference?.sourceCollection === 'kangur_page_content') {
    return context.knowledgeReference;
  }

  const resolvedFromNativeGuide = resolvePageContentReferenceFromNativeGuide({
    context,
    pageContentEntries: input.pageContentEntries,
  });
  if (resolvedFromNativeGuide) {
    return resolvedFromNativeGuide;
  }

  if (!context.focusId || !context.focusKind) {
    return null;
  }

  return resolveKangurTutorSectionKnowledgeReference({
    anchorId: context.focusId,
    contentId: context.contentId ?? null,
    focusKind: context.focusKind,
  });
};

export async function resolveKangurAiTutorSectionKnowledgeBundle(input: {
  context: KangurAiTutorConversationContext | undefined;
  latestUserMessage: string | null;
  locale?: string;
}): Promise<KangurAiTutorSectionKnowledgeBundle | null> {
  if (!input.context) {
    return null;
  }

  const locale = input.locale ?? 'pl';
  const [pageContentStore, nativeGuideStore] = await Promise.all([
    getKangurPageContentStore(locale).catch(() => null),
    getKangurAiTutorNativeGuideStore(locale).catch(() => null),
  ]);
  if (!pageContentStore) {
    return null;
  }

  const pageContentReference = resolvePageContentReference({
    context: input.context,
    pageContentEntries: pageContentStore.entries,
  });
  if (
    !pageContentReference ||
    pageContentReference.sourceCollection !== 'kangur_page_content'
  ) {
    return null;
  }

  const section = pageContentStore.entries.find(
    (entry) => entry.id === pageContentReference.sourceRecordId && entry.enabled
  );
  if (!section) {
    return null;
  }

  const nativeGuideEntriesById = new Map(
    (nativeGuideStore?.entries ?? []).map((entry) => [entry.id, entry] as const)
  );
  const linkedGuideIds = [
    ...section.nativeGuideIds,
    ...(input.context.knowledgeReference?.sourceCollection === 'kangur_ai_tutor_native_guides'
      ? [input.context.knowledgeReference.sourceRecordId]
      : []),
  ];
  const resolvedGuides = linkedGuideIds
    .map((guideId) => nativeGuideEntriesById.get(guideId))
    .filter((entry): entry is KangurAiTutorNativeGuideEntry => Boolean(entry && entry.enabled))
    .filter(
      (entry, index, entries) => entries.findIndex((candidate) => candidate.id === entry.id) === index
    );

  const linkedGuideFollowUpActions = dedupeFollowUpActions(
    resolvedGuides.flatMap((entry) => entry.followUpActions)
  );

  const followUpActions = isLocationLookup(input.latestUserMessage)
    ? linkedGuideFollowUpActions
    : [];
  const sources = dedupeSources([
    {
      documentId: section.id,
      collectionId: 'kangur_page_content',
      text: buildPageContentSourceText(section),
      score: 0.99,
      metadata: {
        source: 'manual-text',
        sourceId: section.id,
        title: section.title,
        description: section.summary,
        tags: ['kangur', 'page-content', ...(section.tags ?? [])],
      },
    },
    ...resolvedGuides.map((guide, index) => ({
      documentId: guide.id,
      collectionId: 'kangur_ai_tutor_native_guides',
      text: buildNativeGuideSourceText(guide),
      score: Math.max(0.84, 0.95 - index * 0.05),
      metadata: {
        source: 'manual-text' as const,
        sourceId: guide.id,
        title: guide.title,
        description: guide.shortDescription,
        tags: ['kangur', 'knowledge-base', 'native-guide', ...(guide.triggerPhrases ?? [])],
      },
    })),
  ]);

  return {
    section,
    linkedNativeGuides: resolvedGuides,
    instructions: buildSectionKnowledgeInstructions({
      section,
      linkedNativeGuides: resolvedGuides,
      followUpActions,
    }),
    sources,
    followUpActions,
  };
}
