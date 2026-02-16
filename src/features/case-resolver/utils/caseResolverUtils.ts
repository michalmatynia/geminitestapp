'use client';

import type {
  FilemakerDatabase,
  FilemakerEntityKind,
  FilemakerOrganization,
  FilemakerPerson,
} from '@/features/filemaker/types';

import { normalizeCaseResolverComparable } from '../party-matching';
import { normalizeFolderPath } from '../settings';

import type {
  CaseResolverFile,
  CaseResolverScanSlot,
  CaseResolverDocumentVersion,
  CaseResolverTag,
  CaseResolverPartyReference,
  CaseResolverFileEditDraft,
} from '../types';

export const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

export const folderBaseName = (path: string): string => {
  const normalized = normalizeFolderPath(path);
  if (!normalized) return '';
  if (!normalized.includes('/')) return normalized;
  return normalized.slice(normalized.lastIndexOf('/') + 1);
};

export const isPathWithinFolder = (candidatePath: string, folderPath: string): boolean => (
  candidatePath === folderPath || candidatePath.startsWith(`${folderPath}/`)
);

export const createUniqueFolderPath = (existingFolders: string[], targetFolderPath: string | null): string => {
  const parent = normalizeFolderPath(targetFolderPath ?? '');
  const existing = new Set(existingFolders.map((folder: string) => normalizeFolderPath(folder)));
  const baseName = 'new-folder';

  let index = 1;
  while (index < 10000) {
    const candidateName = index === 1 ? baseName : `${baseName}-${index}`;
    const candidatePath = normalizeFolderPath(parent ? `${parent}/${candidateName}` : candidateName);
    if (candidatePath && !existing.has(candidatePath)) {
      return candidatePath;
    }
    index += 1;
  }

  return normalizeFolderPath(parent ? `${parent}/${baseName}-${Date.now()}` : `${baseName}-${Date.now()}`);
};

export const createUniqueDocumentName = (existingFiles: CaseResolverFile[], baseName: string): string => {
  const normalizedBase = baseName.trim() || 'Exploded Document';
  const existingNames = new Set(
    existingFiles.map((file: CaseResolverFile): string => file.name.trim().toLowerCase())
  );
  if (!existingNames.has(normalizedBase.toLowerCase())) {
    return normalizedBase;
  }

  let index = 2;
  while (index < 10000) {
    const candidate = `${normalizedBase} ${index}`;
    if (!existingNames.has(candidate.toLowerCase())) {
      return candidate;
    }
    index += 1;
  }

  return `${normalizedBase} ${Date.now()}`;
};

export const toNormalizedSearchValue = (...parts: Array<string | null | undefined>): string =>
  normalizeCaseResolverComparable(parts
    .map((value: string | null | undefined): string => value?.trim() ?? '')
    .filter((value: string): boolean => value.length > 0)
    .join(' '));

export const buildFilemakerAddressLabel = ({
  street,
  streetNumber,
  postalCode,
  city,
  country,
}: {
  street: string;
  streetNumber: string;
  postalCode: string;
  city: string;
  country: string;
}): string => {
  const streetLabel = [street.trim(), streetNumber.trim()].filter(Boolean).join(' ').trim();
  const cityLabel = [postalCode.trim(), city.trim()].filter(Boolean).join(' ').trim();
  return [streetLabel, cityLabel, country.trim()].filter(Boolean).join(', ');
};

export const buildCombinedOcrText = (slots: CaseResolverScanSlot[]): string => {
  const parts = slots
    .map((slot: CaseResolverScanSlot): string => {
      const text = slot.ocrText.trim();
      if (!text) return '';
      return text;
    })
    .filter((value: string): boolean => value.length > 0);
  return parts.join('\n\n');
};

const hashString32 = (value: string, seed: number): number => {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

export const buildCaseResolverDocumentHash = (id: string, createdAt: string): string => {
  const source = `${id.trim()}|${createdAt.trim()}`;
  const reversed = source.split('').reverse().join('');
  const partA = hashString32(source, 0x811c9dc5);
  const partB = hashString32(reversed, 0x9e3779b1);
  return `DOC-${partA.toString(16).padStart(8, '0')}${partB.toString(16).padStart(8, '0')}`.toUpperCase();
};

export const formatFileSize = (size: number | null): string => {
  if (size === null || !Number.isFinite(size) || size < 0) return 'Unknown';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const toLocalDateLabel = (value: string): string => {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return 'Not specified';
  }
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }
  return parsed.toLocaleDateString();
};

export const toLocalDateTimeLabel = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) return 'Not specified';
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toLocaleString();
};

export const buildDocumentPdfMarkup = ({
  documentDate,
  documentHash,
  createdAt,
  updatedAt,
  addresserLabel,
  addresseeLabel,
  documentContent,
}: {
  documentDate: string;
  documentHash: string;
  createdAt: string;
  updatedAt: string;
  addresserLabel: string;
  addresseeLabel: string;
  documentContent: string;
}): string => {
  const normalizedDocumentDate = toLocalDateLabel(documentDate);
  const normalizedCreatedAt = toLocalDateTimeLabel(createdAt);
  const normalizedUpdatedAt = toLocalDateTimeLabel(updatedAt);
  const normalizedDocumentHash = documentHash.trim() || 'DOC-UNKNOWN';
  const normalizedAddresser = addresserLabel.trim() || 'Not selected';
  const normalizedAddressee = addresseeLabel.trim() || 'Not selected';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Case Resolver Document - PDF Preview</title>
    <style>
      @page {
        size: A4;
        margin: 14mm;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
      }

      body {
        background: #e8edf3;
        color: #111827;
        font-family: "Times New Roman", Georgia, serif;
      }

      .sheet {
        width: 210mm;
        min-height: 297mm;
        margin: 20px auto;
        background: #ffffff;
        box-shadow: 0 0 0 1px #d1d5db, 0 10px 24px rgba(17, 24, 39, 0.16);
        padding: 16mm;
      }

      .meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 18px;
      }

      .document-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 14px;
      }

      .document-date {
        font-size: 12px;
        color: #111827;
      }

      .meta-card {
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 8px 10px;
      }

      .meta-label {
        color: #6b7280;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .meta-value {
        margin-top: 4px;
        font-size: 12px;
        line-height: 1.4;
        color: #111827;
        word-break: break-word;
      }

      .content {
        font-size: 12pt;
        line-height: 1.5;
      }

      .content p {
        margin: 0 0 0.9em 0;
      }

      .content h1,
      .content h2,
      .content h3,
      .content h4 {
        margin: 0.5em 0 0.35em 0;
        line-height: 1.25;
      }

      .content ul,
      .content ol {
        margin: 0 0 1em 1.4em;
        padding: 0;
      }

      .content blockquote {
        margin: 0 0 1em 0;
        padding-left: 12px;
        border-left: 3px solid #9ca3af;
      }

      .content table {
        border-collapse: collapse;
        width: 100%;
        margin: 0 0 1em 0;
      }

      .content th,
      .content td {
        border: 1px solid #d1d5db;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }

      .content img {
        max-width: 100%;
        height: auto;
      }

      .document-footer {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
      }

      .document-footer-meta {
        text-align: right;
        color: #4b5563;
        font-size: 10px;
        line-height: 1.35;
      }

      .document-id {
        margin-top: 3px;
        font-family: "Courier New", Courier, monospace;
        letter-spacing: 0.04em;
        color: #111827;
      }

      @media print {
        body {
          background: #ffffff;
        }

        .sheet {
          width: auto;
          min-height: auto;
          margin: 0;
          padding: 0;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <header class="document-header">
        <div class="document-date">Date: ${escapeHtml(normalizedDocumentDate)}</div>
      </header>
      <section class="meta">
        <article class="meta-card">
          <div class="meta-label">Addresser</div>
          <div class="meta-value">${escapeHtml(normalizedAddresser)}</div>
        </article>
        <article class="meta-card">
          <div class="meta-label">Addressee</div>
          <div class="meta-value">${escapeHtml(normalizedAddressee)}</div>
        </article>
      </section>
      <section class="content">${documentContent}</section>
      <footer class="document-footer">
        <div class="document-footer-meta">
          <div>Created: ${escapeHtml(normalizedCreatedAt)}</div>
          <div>Modified: ${escapeHtml(normalizedUpdatedAt)}</div>
          <div class="document-id">${escapeHtml(normalizedDocumentHash)}</div>
        </div>
      </footer>
    </main>
  </body>
</html>`;
};

type CaseResolverFilemakerPartySearchOption = {
  key: string;
  reference: CaseResolverPartyReference;
  label: string;
  details: string;
  searchLabel: string;
  value: string;
};

export const buildCaseResolverFilemakerPartySearchOptions = (
  database: FilemakerDatabase,
  kind: FilemakerEntityKind
): CaseResolverFilemakerPartySearchOption[] => {
  if (kind === 'person') {
    return database.persons
      .map((person: FilemakerPerson): CaseResolverFilemakerPartySearchOption => {
        const label = `${person.firstName} ${person.lastName}`.trim() || person.id;
        const details = buildFilemakerAddressLabel({
          street: person.street,
          streetNumber: person.streetNumber,
          postalCode: person.postalCode,
          city: person.city,
          country: person.country,
        });
        return {
          key: `person:${person.id}`,
          reference: { kind: 'person', id: person.id } as CaseResolverPartyReference,
          label,
          details,
          searchLabel: toNormalizedSearchValue(label, details, person.nip, person.regon, person.id),
          value: encodeFilemakerPartyReference({ kind: 'person', id: person.id }),
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  return database.organizations
    .map((organization: FilemakerOrganization): CaseResolverFilemakerPartySearchOption => {
      const label = organization.name.trim() || organization.id;
      const details = buildFilemakerAddressLabel({
        street: organization.street,
        streetNumber: organization.streetNumber,
        postalCode: organization.postalCode,
        city: organization.city,
        country: organization.country,
      });
      return {
        key: `organization:${organization.id}`,
        reference: { kind: 'organization', id: organization.id } as CaseResolverPartyReference,
        label,
        details,
        searchLabel: toNormalizedSearchValue(label, details, organization.id),
        value: encodeFilemakerPartyReference({ kind: 'organization', id: organization.id }),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
};

const encodeFilemakerPartyReference = (ref: CaseResolverPartyReference | null | undefined): string => {
  if (!ref) return '';
  return `${ref.kind}:${ref.id}`;
};

type CaseResolverTagPickerOption = {
  id: string;
  label: string;
  pathIds: string[];
  pathNames: string[];
  searchLabel: string;
};

export const buildCaseResolverTagPickerOptions = (
  tags: CaseResolverTag[]
): CaseResolverTagPickerOption[] => {
  const byId = new Map<string, CaseResolverTag>(
    tags.map((tag: CaseResolverTag): [string, CaseResolverTag] => [tag.id, tag])
  );
  const cache = new Map<string, { ids: string[]; names: string[] }>();

  const resolvePath = (tagId: string, trail: Set<string>): { ids: string[]; names: string[] } => {
    const cached = cache.get(tagId);
    if (cached) return cached;
    const tag = byId.get(tagId);
    if (!tag) return { ids: [], names: [] };
    if (trail.has(tagId)) {
      const fallback = { ids: [tag.id], names: [tag.name] };
      cache.set(tagId, fallback);
      return fallback;
    }
    if (!tag.parentId || !byId.has(tag.parentId)) {
      const rootPath = { ids: [tag.id], names: [tag.name] };
      cache.set(tagId, rootPath);
      return rootPath;
    }
    const nextTrail = new Set(trail);
    nextTrail.add(tagId);
    const parentPath = resolvePath(tag.parentId, nextTrail);
    const path = {
      ids: [...parentPath.ids, tag.id],
      names: [...parentPath.names, tag.name],
    };
    cache.set(tagId, path);
    return path;
  };

  return tags
    .map((tag: CaseResolverTag): CaseResolverTagPickerOption => {
      const path = resolvePath(tag.id, new Set<string>());
      const label = path.names.join(' / ');
      return {
        id: tag.id,
        label,
        pathIds: path.ids,
        pathNames: path.names,
        searchLabel: label.toLowerCase(),
      };
    })
    .sort((left, right) =>
      left.label.localeCompare(right.label)
    );
};

export const promptForName = (label: string, fallback: string): string | null => {
  const result = window.prompt(label, fallback);
  if (!result) return null;
  const normalized = result.trim();
  if (!normalized) return null;
  return normalized;
};

export const buildFileEditDraft = (file: CaseResolverFile): CaseResolverFileEditDraft => {
  const originalDocumentContent = file.originalDocumentContent ?? file.documentContent;
  const explodedDocumentContent = file.explodedDocumentContent ?? '';
  const requestedVersion: CaseResolverDocumentVersion = file.activeDocumentVersion === 'exploded'
    ? 'exploded'
    : 'original';
  const activeDocumentVersion: CaseResolverDocumentVersion =
    requestedVersion === 'exploded' && explodedDocumentContent.trim().length === 0
      ? 'original'
      : requestedVersion;
  return {
    id: file.id,
    fileType: file.fileType,
    name: file.name,
    folder: file.folder,
    parentCaseId: file.parentCaseId,
    referenceCaseIds: file.referenceCaseIds,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    documentDate: file.documentDate,
    originalDocumentContent,
    explodedDocumentContent,
    activeDocumentVersion,
    documentContent: activeDocumentVersion === 'exploded' && explodedDocumentContent.trim().length > 0
      ? explodedDocumentContent
      : originalDocumentContent,
    scanSlots: file.scanSlots,
    addresser: file.addresser,
    addressee: file.addressee,
    tagId: file.tagId,
    categoryId: file.categoryId,
    caseIdentifierId: file.caseIdentifierId,
  };
};
