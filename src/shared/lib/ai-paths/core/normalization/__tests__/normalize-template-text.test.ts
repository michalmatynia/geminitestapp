import { describe, expect, it } from 'vitest';

import { normalizeTemplateText } from '@/shared/lib/ai-paths/core/normalization';

describe('normalizeTemplateText', () => {
  it('decodes escaped newlines for JSON-like templates', () => {
    expect(normalizeTemplateText('{\\n  "id": "{{value}}"\\n}')).toBe('{\n  "id": "{{value}}"\n}');
  });

  it('does not modify templates that already contain real newlines', () => {
    const template = '{\n  "id": "{{value}}"\n}';
    expect(normalizeTemplateText(template)).toBe(template);
  });

  it('does not decode escaped newlines for non-json text', () => {
    const template = 'prefix\\nvalue';
    expect(normalizeTemplateText(template)).toBe(template);
  });
});
