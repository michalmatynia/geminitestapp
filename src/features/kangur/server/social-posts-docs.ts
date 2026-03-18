import 'server-only';

import fs from 'fs/promises';
import path from 'path';

import {
  KANGUR_DOC_CATALOG,
  KANGUR_DOCUMENTATION_LIBRARY,
  type KangurDocumentationGuide,
  type KangurTooltipDocEntry,
} from '@/shared/lib/documentation/catalogs/kangur';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import {
  kangurRecentFeaturesContextProvider,
  createKangurRecentFeaturesRef,
} from '@/features/ai/ai-context-registry/services/runtime-providers/kangur-recent-features';

export type KangurDocEntry = KangurDocumentationGuide | KangurTooltipDocEntry;

const normalizeKey = (value: string): string => value.trim().toLowerCase();
const MAX_EXCERPT_DOCS = 3;
const MAX_EXCERPT_CHARS = 1200;
const MAX_CONTEXT_CHARS = 6000;
const DOCS_ROOT = path.resolve(process.cwd(), 'docs', 'kangur');

export const resolveKangurDocAbsolutePath = (docPath: string): string | null => {
  const normalized = docPath.trim().replace(/^\/+/, '');
  if (!normalized) return null;
  let relative = normalized.startsWith('docs/') ? normalized.slice('docs/'.length) : normalized;
  if (relative.startsWith('kangur/')) {
    relative = relative.slice('kangur/'.length);
  }
  if (!relative) return null;
  const absolute = path.resolve(DOCS_ROOT, relative);
  const relativeToDocs = path.relative(DOCS_ROOT, absolute);
  if (relativeToDocs.startsWith('..') || path.isAbsolute(relativeToDocs)) return null;
  const ext = path.extname(absolute).toLowerCase();
  if (ext && ext !== '.md' && ext !== '.mdx') return null;
  return absolute;
};

export const resolveKangurDocReferences = (refs: string[]): KangurDocEntry[] => {
  if (refs.length === 0) {
    return KANGUR_DOCUMENTATION_LIBRARY.slice(0, 5);
  }

  const normalizedRefs = refs.map(normalizeKey);
  const matches = new Map<string, KangurDocEntry>();

  const addMatch = (entry: KangurDocEntry): void => {
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

const buildSummary = (entries: KangurDocEntry[]): string => {
  if (entries.length === 0) return 'No documentation references provided.';
  return entries
    .map((entry) => {
      const label = 'audience' in entry ? `Guide: ${entry.title}` : `Tooltip: ${entry.title}`;
      return `- ${label}: ${entry.summary}`;
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

const extractMarkdownExcerpt = (content: string, keywords: string[]): string => {
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
      matchIndex + 1 < headings.length
        ? headings[matchIndex + 1]?.start ?? cleaned.length
        : cleaned.length;
    const excerpt = cleaned.slice(start, end).trim();

    if (excerpt) {
      return truncateText(excerpt, MAX_EXCERPT_CHARS);
    }
  }

  return truncateText(cleaned.trim(), MAX_EXCERPT_CHARS);
};

const readDocExcerpt = async (entry: KangurDocEntry): Promise<string | null> => {
  const docPath = entry.docPath?.trim();
  if (!docPath) return null;
  try {
    const absolute = resolveKangurDocAbsolutePath(docPath);
    if (!absolute) return null;
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

const loadRecentFeaturesContext = async (): Promise<string | null> => {
  try {
    const ref = createKangurRecentFeaturesRef();
    const docs = await kangurRecentFeaturesContextProvider.resolveRefs([ref]);
    if (docs.length === 0) return null;
    const doc = docs[0]!;
    const textSections = (doc.sections ?? [])
      .filter((s) => s.kind === 'text' && s.text)
      .map((s) => s.text!.trim())
      .filter(Boolean);
    if (textSections.length === 0) return null;
    return `### Recent Feature Updates (Context Registry)\n${textSections.join('\n\n')}`;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const buildKangurDocContext = async (
  entries: KangurDocEntry[]
): Promise<{ summary: string; context: string }> => {
  const [excerptEntries, recentFeaturesContext] = await Promise.all([
    Promise.all(
      entries.slice(0, MAX_EXCERPT_DOCS).map(async (entry) => {
        const excerpt = await readDocExcerpt(entry);
        if (!excerpt) return null;
        return {
          title: entry.title,
          docPath: entry.docPath,
          excerpt,
        };
      })
    ),
    loadRecentFeaturesContext(),
  ]);

  const summary = buildSummary(entries);
  const excerpts = excerptEntries
    .filter(Boolean)
    .map((entry) =>
      `### ${entry!.title}${entry!.docPath ? ` (${entry!.docPath})` : ''}\n${entry!.excerpt}`
    )
    .join('\n\n');

  const combined = [summary, recentFeaturesContext, excerpts].filter(Boolean).join('\n\n');
  const trimmedContext = truncateText(combined, MAX_CONTEXT_CHARS);

  return {
    summary: trimmedContext,
    context: trimmedContext,
  };
};
