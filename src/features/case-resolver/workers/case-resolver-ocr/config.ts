export const LOG_SOURCE = 'case-resolver-ocr-queue';
const rawOllamaUrl = process.env['OLLAMA_BASE_URL'];
export const OLLAMA_BASE_URL = (rawOllamaUrl !== undefined && rawOllamaUrl !== '') ? rawOllamaUrl : 'http://localhost:11434';
export const MAX_PDF_OCR_TEXT_CHARS = 80_000;
export const OLLAMA_OCR_TIMEOUT_MS = 90_000;
export const REMOTE_OCR_TIMEOUT_MS = 120_000;
