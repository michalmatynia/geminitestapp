import { describe, expect, it } from 'vitest';
import { renderHtmlToPdfBuffer } from '@/features/pdf-export/server/html-pdf-export';

describe('html-pdf-export', () => {
  it('should export PDF content from valid HTML', async () => {
    const html = '<html><body><h1>Test</h1></body></html>';
    const pdf = await renderHtmlToPdfBuffer({ html });
    expect(pdf).toBeDefined();
    expect(pdf.length).toBeGreaterThan(0);
  });
});
