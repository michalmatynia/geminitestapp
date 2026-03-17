import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import { configurationError } from '@/shared/errors/app-error';
import {
  KANGUR_DOC_CATALOG,
  KANGUR_DOCUMENTATION_LIBRARY,
  type KangurDocumentationGuide,
  type KangurTooltipDocEntry,
} from '@/shared/lib/documentation/catalogs/kangur';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  supportsBrainJsonMode,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { buildKangurSocialPostCombinedBody } from '@/shared/contracts/kangur-social-posts';
import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

export type KangurSocialPostDraft = {
  titlePl: string;
  titleEn: string;
  bodyPl: string;
  bodyEn: string;
  combinedBody: string;
  summary: string;
  docReferences: string[];
};

type GenerationInput = {
  docReferences?: string[];
  notes?: string;
  modelId?: string;
  imageAddons?: KangurSocialImageAddon[];
};

const normalizeKey = (value: string): string => value.trim().toLowerCase();
const MAX_EXCERPT_DOCS = 3;
const MAX_EXCERPT_CHARS = 1200;
const MAX_CONTEXT_CHARS = 6000;

const resolveReferencedDocs = (refs: string[]): Array<KangurDocumentationGuide | KangurTooltipDocEntry> => {
  if (refs.length === 0) {
    return KANGUR_DOCUMENTATION_LIBRARY.slice(0, 5);
  }

  const normalizedRefs = refs.map(normalizeKey);
  const matches = new Map<string, KangurDocumentationGuide | KangurTooltipDocEntry>();

  const addMatch = (entry: KangurDocumentationGuide | KangurTooltipDocEntry): void => {
    if (!matches.has(entry.id)) {
      matches.set(entry.id, entry);
    }
  };

  KANGUR_DOCUMENTATION_LIBRARY.forEach((guide) => {
    const candidate = [
      guide.id,
      guide.title,
      guide.docPath,
      guide.summary,
      ...(guide.sectionsCovered ?? []),
    ]
      .map(normalizeKey)
      .join(' ');
    if (normalizedRefs.some((ref) => candidate.includes(ref))) {
      addMatch(guide);
    }
  });

  KANGUR_DOC_CATALOG.forEach((entry) => {
    const candidate = [
      entry.id,
      entry.title,
      entry.docPath,
      entry.summary,
      entry.section,
      ...(entry.aliases ?? []),
      ...(entry.tags ?? []),
      ...(entry.uiTargets ?? []),
    ]
      .map(normalizeKey)
      .join(' ');
    if (normalizedRefs.some((ref) => candidate.includes(ref))) {
      addMatch(entry);
    }
  });

  return Array.from(matches.values());
};

const buildSummary = (
  entries: Array<KangurDocumentationGuide | KangurTooltipDocEntry>
): string => {
  if (entries.length === 0) return 'No documentation references provided.';
  return entries
    .map((entry) => {
      const label = 'audience' in entry ? `Guide: ${entry.title}` : `Tooltip: ${entry.title}`;
      return `- ${label}: ${entry.summary}`;
    })
    .join('\n');
};

const buildImageAddonSummary = (addons: KangurSocialImageAddon[]): string => {
  if (addons.length === 0) return '';
  return addons
    .map((addon) => {
      const title = addon.title.trim() || 'Image add-on';
      const description = addon.description?.trim();
      const sourceUrl = addon.sourceUrl?.trim();
      const parts = [title];
      if (description) parts.push(description);
      if (sourceUrl) parts.push(`Source: ${sourceUrl}`);
      return `- ${parts.join(' — ')}`;
    })
    .join('\n');
};

const stripFrontMatter = (value: string): string => {
  const trimmed = value.trimStart();
  if (!trimmed.startsWith('---')) return value;
  const endIndex = trimmed.indexOf('\n---', 3);
  if (endIndex === -1) return value;
  return trimmed.slice(endIndex + 4);
};

const truncateText = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
};

const extractMarkdownExcerpt = (
  content: string,
  keywords: string[]
): string => {
  const normalizedKeywords = keywords.map(normalizeKey).filter(Boolean);
  const cleaned = stripFrontMatter(content);
  if (normalizedKeywords.length === 0) {
    return truncateText(cleaned.trim(), MAX_EXCERPT_CHARS);
  }

  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  const headings: Array<{ title: string; start: number; contentStart: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(cleaned)) !== null) {
    const lineEnd = cleaned.indexOf('\n', match.index);
    headings.push({
      title: match[1]?.trim() ?? '',
      start: match.index,
      contentStart: lineEnd >= 0 ? lineEnd + 1 : cleaned.length,
    });
  }

  const matchIndex = headings.findIndex((heading) =>
    normalizedKeywords.some((keyword) => normalizeKey(heading.title).includes(keyword))
  );

  if (matchIndex >= 0) {
    const start = headings[matchIndex]?.contentStart ?? 0;
    const end =
      matchIndex + 1 < headings.length ? headings[matchIndex + 1]?.start ?? cleaned.length : cleaned.length;
    const excerpt = cleaned.slice(start, end).trim();

    if (excerpt) {
      return truncateText(excerpt, MAX_EXCERPT_CHARS);
    }
  }

  return truncateText(cleaned.trim(), MAX_EXCERPT_CHARS);
};

const readDocExcerpt = async (
  entry: KangurDocumentationGuide | KangurTooltipDocEntry
): Promise<string | null> => {
  const docPath = entry.docPath?.trim();
  if (!docPath) return null;
  try {
    const absolute = path.resolve(process.cwd(), docPath.replace(/^\//, ''));
    const content = await fs.readFile(absolute, 'utf8');
    const keywords =
      'audience' in entry
        ? [entry.title, ...(entry.sectionsCovered ?? [])]
        : [entry.title, entry.section, ...(entry.aliases ?? [])];
    return extractMarkdownExcerpt(content, keywords);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

const buildDocContext = async (
  entries: Array<KangurDocumentationGuide | KangurTooltipDocEntry>
): Promise<{ summary: string; context: string }> => {
  const summary = buildSummary(entries);
  const excerptEntries = await Promise.all(
    entries.slice(0, MAX_EXCERPT_DOCS).map(async (entry) => {
      const excerpt = await readDocExcerpt(entry);
      if (!excerpt) return null;
      return {
        title: entry.title,
        docPath: entry.docPath,
        excerpt,
      };
    })
  );
  const excerpts = excerptEntries
    .filter(Boolean)
    .map((entry) =>
      `### ${entry!.title}${entry!.docPath ? ` (${entry!.docPath})` : ''}\n${entry!.excerpt}`
    )
    .join('\n\n');

  const combined = [summary, excerpts].filter(Boolean).join('\n\n');
  const trimmedContext = truncateText(combined, MAX_CONTEXT_CHARS);

  return {
    summary: trimmedContext,
    context: trimmedContext,
  };
};

const buildSystemPrompt = (basePrompt: string): string => {
  const lines = [
    basePrompt.trim(),
    'You are writing a LinkedIn post about recent Kangur and StudiQ improvements.',
    'Generate bilingual content in Polish and English.',
    'Return a JSON object with keys: titlePl, titleEn, bodyPl, bodyEn.',
    'Keep each body concise and professional for LinkedIn.',
    'If image add-ons are provided, reference them naturally in the post.',
  ].filter(Boolean);
  return lines.join('\n');
};

export async function generateKangurSocialPostDraft(
  input: GenerationInput
): Promise<KangurSocialPostDraft> {
  const startedAt = Date.now();
  const docReferences = (input.docReferences ?? []).map((ref) => ref.trim()).filter(Boolean);
  const docs = resolveReferencedDocs(docReferences);
  const { summary, context } = await buildDocContext(docs);
  const notes = input.notes?.trim() ?? '';
  const imageAddons = input.imageAddons ?? [];
  const imageAddonSummary = buildImageAddonSummary(imageAddons);
  const notesLength = notes.length;
  let modelId = '';

  try {
    const overrideModelId = input.modelId?.trim() ?? '';
    const brainConfig = await resolveBrainExecutionConfigForCapability(
      'kangur_social.post_generation',
      {
        defaultTemperature: 0.6,
        defaultMaxTokens: 900,
        defaultModelId: overrideModelId,
        runtimeKind: 'chat',
      }
    );
    modelId = overrideModelId || brainConfig.modelId.trim();
    if (!modelId) {
      throw configurationError(
        'Kangur Social Post Generation model is missing. Configure it in AI Brain.'
      );
    }

    const systemPrompt = buildSystemPrompt(brainConfig.systemPrompt ?? '');
    const userPromptLines = [
      'Use the following documentation summary and excerpts to craft the post:',
      '',
      context,
    ];
    if (imageAddonSummary) {
      userPromptLines.push('', 'Visual add-ons available for the post:', imageAddonSummary);
    }
    if (notes) {
      userPromptLines.push('', 'Additional notes:', notes);
    }

    const res = await runBrainChatCompletion({
      modelId,
      temperature: brainConfig.temperature,
      maxTokens: brainConfig.maxTokens,
      jsonMode: supportsBrainJsonMode(modelId),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPromptLines.join('\n') },
      ],
    });

    let parsed: Partial<KangurSocialPostDraft> = {};
    try {
      parsed = JSON.parse(res.text) as Partial<KangurSocialPostDraft>;
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'kangur.social-posts.generate',
        action: 'parseDraft',
        durationMs: Date.now() - startedAt,
        modelId: modelId || null,
        docReferenceCount: docReferences.length,
        resolvedDocCount: docs.length,
        imageAddonCount: imageAddons.length,
        notesLength,
      });
      parsed = {};
    }

    const titlePl = (parsed.titlePl ?? '').trim();
    const titleEn = (parsed.titleEn ?? '').trim();
    const bodyPl = (parsed.bodyPl ?? '').trim();
    const bodyEn = (parsed.bodyEn ?? '').trim();
    const combinedBody = buildKangurSocialPostCombinedBody(bodyPl, bodyEn);

    const draft = {
      titlePl,
      titleEn,
      bodyPl,
      bodyEn,
      combinedBody,
      summary,
      docReferences: docReferences.length > 0 ? docReferences : docs.map((doc) => doc.id),
    };

    void ErrorSystem.logInfo('Kangur social post draft generated', {
      service: 'kangur.social-posts.generate',
      durationMs: Date.now() - startedAt,
      modelId,
      docReferenceCount: docReferences.length,
      resolvedDocCount: docs.length,
      usedDocReferenceCount: draft.docReferences.length,
      imageAddonCount: imageAddons.length,
      notesLength,
    });

    return draft;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'kangur.social-posts.generate',
      action: 'generateDraft',
      durationMs: Date.now() - startedAt,
      modelId: modelId || null,
      docReferenceCount: docReferences.length,
      resolvedDocCount: docs.length,
      imageAddonCount: imageAddons.length,
      notesLength,
    });
    throw error;
  }
}
