import fs from 'fs/promises';

import { MAX_PDF_OCR_TEXT_CHARS } from './config';

type PdfParseResult = {
  text?: unknown;
};

type PdfParseFunction = (buffer: Buffer) => Promise<PdfParseResult>;

const resolvePdfParseFunction = (module: unknown): PdfParseFunction => {
  if (
    typeof module === 'object' &&
    module !== null &&
    'default' in module &&
    typeof module.default === 'function'
  ) {
    return module.default as PdfParseFunction;
  }

  return module as PdfParseFunction;
};

export const extractPdfTextForOcr = async (diskPath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(diskPath);
  const pdfParse = resolvePdfParseFunction(await import('pdf-parse'));
  const parsed = await pdfParse(fileBuffer);
  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
  if (text === '') return '';
  if (text.length <= MAX_PDF_OCR_TEXT_CHARS) return text;
  const truncatedChars = text.length - MAX_PDF_OCR_TEXT_CHARS;
  return `${text.slice(0, MAX_PDF_OCR_TEXT_CHARS)}

[TRUNCATED ${truncatedChars} chars]`;
};
