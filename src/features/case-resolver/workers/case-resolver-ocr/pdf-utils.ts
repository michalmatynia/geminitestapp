import fs from 'fs/promises';
import { MAX_PDF_OCR_TEXT_CHARS } from './config';

type PdfParseResult = {
  text?: unknown;
};

type PdfParseModule = {
  default: (buffer: Buffer) => Promise<PdfParseResult>;
};

export const extractPdfTextForOcr = async (diskPath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(diskPath);
  const pdfParseModule = (await import('pdf-parse')) as PdfParseModule;
  const parsed = await pdfParseModule.default(fileBuffer);
  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
  if (!text) return '';
  if (text.length <= MAX_PDF_OCR_TEXT_CHARS) return text;
  const truncatedChars = text.length - MAX_PDF_OCR_TEXT_CHARS;
  return `${text.slice(0, MAX_PDF_OCR_TEXT_CHARS)}

[TRUNCATED ${truncatedChars} chars]`;
};
