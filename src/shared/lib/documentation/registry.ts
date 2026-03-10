import type {
  DocumentationEntry,
  DocumentationEntryKey,
  DocumentationModuleId,
} from '@/shared/contracts/documentation';

import { DOCUMENTATION_CATALOG } from './catalogs';

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const buildDocumentationEntryKey = (
  moduleId: DocumentationModuleId,
  id: string
): DocumentationEntryKey => `${moduleId}:${id}`;

const DOCS_BY_KEY = new Map<DocumentationEntryKey, DocumentationEntry>();
const DOCS_BY_MODULE = new Map<DocumentationModuleId, DocumentationEntry[]>();
const DOCS_BY_ALIAS = new Map<DocumentationModuleId, Map<string, DocumentationEntry>>();

for (const entry of DOCUMENTATION_CATALOG) {
  const key = buildDocumentationEntryKey(entry.moduleId, entry.id);
  DOCS_BY_KEY.set(key, entry);

  const moduleDocs = DOCS_BY_MODULE.get(entry.moduleId) ?? [];
  moduleDocs.push(entry);
  DOCS_BY_MODULE.set(entry.moduleId, moduleDocs);

  const moduleAliases = DOCS_BY_ALIAS.get(entry.moduleId) ?? new Map<string, DocumentationEntry>();
  const aliases = [entry.id, entry.title, ...entry.keywords];
  for (const alias of aliases) {
    const normalizedAlias = normalize(alias);
    if (!normalizedAlias) continue;
    if (!moduleAliases.has(normalizedAlias)) {
      moduleAliases.set(normalizedAlias, entry);
    }
  }
  DOCS_BY_ALIAS.set(entry.moduleId, moduleAliases);
}

export const ALL_DOCUMENTATION_ENTRIES: DocumentationEntry[] = DOCUMENTATION_CATALOG;

export function getDocumentationEntry(
  moduleId: DocumentationModuleId,
  id: string
): DocumentationEntry | null {
  return DOCS_BY_KEY.get(buildDocumentationEntryKey(moduleId, id)) ?? null;
}

export function getDocumentationEntriesByModule(
  moduleId: DocumentationModuleId
): DocumentationEntry[] {
  return DOCS_BY_MODULE.get(moduleId) ?? [];
}

export function getDocumentationEntryByKey(key: DocumentationEntryKey): DocumentationEntry | null {
  return DOCS_BY_KEY.get(key) ?? null;
}

const findByAlias = (
  moduleId: DocumentationModuleId,
  candidate: string
): DocumentationEntry | null => {
  const normalizedCandidate = normalize(candidate);
  if (!normalizedCandidate) return null;

  const moduleAliases = DOCS_BY_ALIAS.get(moduleId);
  if (!moduleAliases) return null;

  const direct = moduleAliases.get(normalizedCandidate);
  if (direct) return direct;

  for (const [alias, entry] of moduleAliases.entries()) {
    if (normalizedCandidate.includes(alias) || alias.includes(normalizedCandidate)) {
      return entry;
    }
  }

  return null;
};

export function resolveDocumentationEntry(
  moduleId: DocumentationModuleId,
  idOrKey: string
): DocumentationEntry | null {
  if (idOrKey.includes(':')) {
    const [rawModuleId, ...rest] = idOrKey.split(':');
    const localId = rest.join(':');
    if (rawModuleId && localId) {
      return getDocumentationEntry(rawModuleId as DocumentationModuleId, localId);
    }
  }
  return getDocumentationEntry(moduleId, idOrKey);
}

export function resolveDocumentationEntryFromElement(
  moduleId: DocumentationModuleId,
  element: HTMLElement
): DocumentationEntry | null {
  const docId = element.getAttribute('data-doc-id');
  if (docId) {
    const byId = resolveDocumentationEntry(moduleId, docId);
    if (byId) return byId;
  }

  const candidates = [
    element.getAttribute('data-doc-alias'),
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element.getAttribute('placeholder'),
    element.getAttribute('name'),
    element.getAttribute('id'),
    element.textContent,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = findByAlias(moduleId, candidate);
    if (match) return match;
  }

  return null;
}

export function searchDocumentationEntries(
  query: string,
  options?: {
    moduleId?: DocumentationModuleId;
  }
): DocumentationEntry[] {
  const normalizedQuery = normalize(query);
  const source = options?.moduleId
    ? getDocumentationEntriesByModule(options.moduleId)
    : ALL_DOCUMENTATION_ENTRIES;
  if (!normalizedQuery) return source;

  return source.filter((entry) => {
    const haystack = normalize(
      [
        entry.id,
        entry.title,
        entry.content,
        entry.keywords.join(' '),
        entry.relatedLinks?.join(' ') ?? '',
      ].join(' ')
    );
    return haystack.includes(normalizedQuery);
  });
}
