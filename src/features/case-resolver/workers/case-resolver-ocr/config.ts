export const LOG_SOURCE = 'case-resolver-ocr-queue';
export const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';
export const MAX_PDF_OCR_TEXT_CHARS = 80_000;
export const OLLAMA_OCR_TIMEOUT_MS = 90_000;
export const REMOTE_OCR_TIMEOUT_MS = 120_000;
