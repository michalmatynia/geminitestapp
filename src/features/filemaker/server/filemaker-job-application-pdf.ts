import 'server-only';

import { createPdfDownloadResponse, renderHtmlToPdfBuffer } from '@/features/pdf-export/server';

import type { FilemakerJobApplication } from '../filemaker-job-application.types';
import { requireMongoFilemakerJobApplicationById } from './filemaker-job-application-repository';

export type FilemakerJobApplicationCoverLetterPdfInput = {
  applicationId: string;
};

export type FilemakerJobApplicationCoverLetterPdfExportResult = {
  filename: string;
  pdfBuffer: Buffer;
};

const normalizeFilenamePart = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const composeCoverLetterFilename = (application: FilemakerJobApplication): string => {
  const person = normalizeFilenamePart(application.personName ?? application.personId);
  const job = normalizeFilenamePart(application.jobTitle ?? application.coverLetter?.subject);
  const organization = normalizeFilenamePart(application.organizationName);
  const parts = ['cover-letter', person, job, organization].filter(
    (part: string): boolean => part.length > 0
  );
  const base = parts.join(' - ');
  return `${base.length > 0 ? base : 'cover-letter'}.pdf`;
};

const resolveCoverLetterSubject = (application: FilemakerJobApplication): string => {
  const subject = application.coverLetter?.subject?.trim() ?? '';
  if (subject.length > 0) return subject;
  const jobTitle = application.jobTitle?.trim() ?? '';
  return jobTitle.length > 0 ? `Application for ${jobTitle}` : 'Cover letter';
};

const resolveCoverLetterBody = (application: FilemakerJobApplication): string => {
  const body = application.coverLetter?.bodyMarkdown?.trim() ?? '';
  return body.length > 0 ? body : 'No cover letter content was generated.';
};

const resolveCoverLetterPerson = (application: FilemakerJobApplication): string => {
  const personName = application.personName?.trim() ?? '';
  return personName.length > 0 ? personName : application.personId;
};

const renderOptionalMetaPart = (value: string): string =>
  value.length > 0 ? ` · ${escapeHtml(value)}` : '';

const renderCoverLetterHtml = (application: FilemakerJobApplication): string => {
  const subject = resolveCoverLetterSubject(application);
  const body = resolveCoverLetterBody(application);
  const person = resolveCoverLetterPerson(application);
  const organization = application.organizationName?.trim() ?? '';
  const jobTitle = application.jobTitle?.trim() ?? '';
  const meta = `${escapeHtml(person)}${renderOptionalMetaPart(jobTitle)}${renderOptionalMetaPart(
    organization
  )}`;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(subject)}</title>
    <style>
      @page { size: A4; margin: 22mm; }
      body {
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.55;
      }
      h1 {
        font-size: 20px;
        line-height: 1.25;
        margin: 0 0 8px;
      }
      .meta {
        border-bottom: 1px solid #d1d5db;
        color: #4b5563;
        margin-bottom: 22px;
        padding-bottom: 12px;
      }
      .body {
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(subject)}</h1>
    <div class="meta">
      ${meta}
    </div>
    <div class="body">${escapeHtml(body)}</div>
  </body>
</html>`;
};

export async function createFilemakerJobApplicationCoverLetterPdfExport(
  input: FilemakerJobApplicationCoverLetterPdfInput
): Promise<FilemakerJobApplicationCoverLetterPdfExportResult> {
  const application = await requireMongoFilemakerJobApplicationById(input.applicationId);
  return {
    filename: composeCoverLetterFilename(application),
    pdfBuffer: await renderHtmlToPdfBuffer({ html: renderCoverLetterHtml(application) }),
  };
}

export async function createFilemakerJobApplicationCoverLetterPdfResponse(
  input: FilemakerJobApplicationCoverLetterPdfInput
): Promise<Response> {
  const result = await createFilemakerJobApplicationCoverLetterPdfExport(input);
  return createPdfDownloadResponse(result);
}
