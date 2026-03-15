import { NextRequest, NextResponse } from 'next/server';

import {
  chatbotContextUploadResponseSchema,
  type ChatbotContextUploadResponse,
} from '@/shared/contracts/chatbot';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, configurationError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const chunkText = (text: string, maxChars: number): string[] => {
  const chunks: string[] = [];
  let cursor = 0;
  const cleaned = text.replace(/\r/g, '').trim();
  if (!cleaned) return chunks;

  while (cursor < cleaned.length) {
    chunks.push(cleaned.slice(cursor, cursor + maxChars).trim());
    cursor += maxChars;
  }
  return chunks.filter(Boolean);
};

type PdfParseResult = {
  text?: unknown;
};

type PdfParseFn = (buffer: Buffer) => Promise<PdfParseResult>;

const isPdfParseFn = (value: unknown): value is PdfParseFn => typeof value === 'function';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw badRequestError('Missing PDF file.');
  }

  if (file.type !== 'application/pdf') {
    throw badRequestError('Only PDF files are supported.');
  }

  let pdfParse: PdfParseFn;
  try {
    const pdfModule = await import('pdf-parse');
    const pdfParseCandidate = Reflect.get(pdfModule, 'default') ?? pdfModule;
    if (!isPdfParseFn(pdfParseCandidate)) {
      throw configurationError('PDF parser not installed. Run `npm install pdf-parse`.');
    }
    pdfParse = pdfParseCandidate;
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw configurationError('PDF parser not installed. Run `npm install pdf-parse`.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await pdfParse(buffer);
  const rawText = typeof result.text === 'string' ? result.text : '';
  const pages = rawText.split('\f').map((chunk: string) => chunk.trim());
  const segments: Array<{ title: string; content: string }> = [];

  const baseName = file.name.replace(/\.pdf$/i, '');
  if (pages.length > 1) {
    pages.forEach((pageText: string, index: number) => {
      if (!pageText) return;
      const chunks = chunkText(pageText, 2000);
      if (chunks.length <= 1) {
        segments.push({
          title: `${baseName} (page ${index + 1})`,
          content: pageText,
        });
      } else {
        chunks.forEach((chunk: string, chunkIndex: number) => {
          segments.push({
            title: `${baseName} (page ${index + 1}.${chunkIndex + 1})`,
            content: chunk,
          });
        });
      }
    });
  } else {
    const chunks = chunkText(rawText, 2000);
    chunks.forEach((chunk: string, index: number) => {
      segments.push({
        title: chunks.length === 1 ? baseName : `${baseName} (part ${index + 1})`,
        content: chunk,
      });
    });
  }

  const response: ChatbotContextUploadResponse = { segments };
  return NextResponse.json(chatbotContextUploadResponseSchema.parse(response));
}
