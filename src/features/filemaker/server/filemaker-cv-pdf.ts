import 'server-only';

import { createPdfDownloadResponse, renderHtmlToPdfBuffer } from '@/features/pdf-export/server';

import { compileCvBlocksToHtml } from '../components/cv-builder/compile-cv-blocks';
import type { FilemakerCv } from '../filemaker-cv.types';
import { requireMongoFilemakerCvById } from './filemaker-cv-repository';

export type FilemakerCvPdfExportInput = {
  cvId: string;
};

export type FilemakerCvPdfExportResult = {
  filename: string;
  pdfBuffer: Buffer;
};

const normalizeFilenamePart = (value: string): string =>
  value
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const composeCvFilename = (cv: FilemakerCv): string => {
  const title = normalizeFilenamePart(cv.title);
  const person = normalizeFilenamePart(cv.personName);
  let base = 'cv';
  if (title.length > 0) {
    base = title;
  } else if (person.length > 0) {
    base = person;
  }
  return `${base}.pdf`;
};

const compileCvHtml = (cv: FilemakerCv): string =>
  compileCvBlocksToHtml(cv.bodyBlocks ?? [], {
    highlightedTechnologyTerms: cv.highlightTechnologyTerms ?? [],
  });

const hasCvBodyBlocks = (cv: FilemakerCv): boolean => (cv.bodyBlocks ?? []).length > 0;

const resolvePersistedCvHtml = (cv: FilemakerCv): string | null => {
  if (cv.bodyHtml === null) return null;
  const normalized = cv.bodyHtml.trim();
  return normalized.length > 0 ? cv.bodyHtml : null;
};

const resolveCvHtml = (cv: FilemakerCv): string => {
  if (hasCvBodyBlocks(cv)) return compileCvHtml(cv);
  return resolvePersistedCvHtml(cv) ?? compileCvHtml(cv);
};

export async function createFilemakerCvPdfExport(
  input: FilemakerCvPdfExportInput
): Promise<FilemakerCvPdfExportResult> {
  const cv = await requireMongoFilemakerCvById(input.cvId);
  return {
    filename: composeCvFilename(cv),
    pdfBuffer: await renderHtmlToPdfBuffer({ html: resolveCvHtml(cv) }),
  };
}

export async function createFilemakerCvPdfResponse(
  input: FilemakerCvPdfExportInput
): Promise<Response> {
  const result = await createFilemakerCvPdfExport(input);
  return createPdfDownloadResponse(result);
}
