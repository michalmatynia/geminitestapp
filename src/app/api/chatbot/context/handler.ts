import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, configurationError } from '@/shared/errors/app-error';

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

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw badRequestError('Missing PDF file.');
  }

  if (file.type !== 'application/pdf') {
    throw badRequestError('Only PDF files are supported.');
  }

  let pdfParse: ((buffer: Buffer) => Promise<{ text: string }>) | null = null;
  try {
    const pdfModule = await import('pdf-parse');
    pdfParse = (pdfModule as unknown as { default: (buffer: Buffer) => Promise<{ text: string }> }).default;
  } catch {
    throw configurationError('PDF parser not installed. Run `npm install pdf-parse`.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!pdfParse) {
    throw configurationError('Failed to initialize PDF parser.');
  }
  const result = await pdfParse(buffer);
  const rawText = result.text || '';
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

  return NextResponse.json({ segments });
}
