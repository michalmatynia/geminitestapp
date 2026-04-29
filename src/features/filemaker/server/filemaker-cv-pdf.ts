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

const resolveCvHtml = (cv: FilemakerCv): string => {
  if ((cv.bodyBlocks ?? []).length > 0) {
    return compileCvBlocksToHtml(cv.bodyBlocks ?? [], {
      highlightedTechnologyTerms: cv.highlightTechnologyTerms ?? [],
    });
  }
  if (cv.bodyHtml !== null && cv.bodyHtml.trim().length > 0) {
    return cv.bodyHtml;
  }
  return compileCvBlocksToHtml(cv.bodyBlocks ?? [], {
    highlightedTechnologyTerms: cv.highlightTechnologyTerms ?? [],
  });
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
