import { describe, expect, it } from 'vitest';

import {
  CUSTOM_PLAYWRIGHT_SCRIPT_TEMPLATE,
  findPlaywrightScriptTemplate,
  findPlaywrightTemplateByScript,
  PLAYWRIGHT_SCRIPT_TEMPLATES,
} from '@/shared/lib/ai-paths/core/playwright/script-templates';

describe('playwright script templates', () => {
  it('defines non-empty template catalog', () => {
    expect(PLAYWRIGHT_SCRIPT_TEMPLATES.length).toBeGreaterThan(2);
    expect(CUSTOM_PLAYWRIGHT_SCRIPT_TEMPLATE).toBe('__custom__');
    expect(
      PLAYWRIGHT_SCRIPT_TEMPLATES.every((template) =>
        Boolean(
          template.id.trim() &&
          template.name.trim() &&
          template.description.trim() &&
          template.script.trim()
        )
      )
    ).toBe(true);
  });

  it('finds templates by id', () => {
    const first = PLAYWRIGHT_SCRIPT_TEMPLATES[0];
    expect(first).toBeDefined();
    const resolved = first ? findPlaywrightScriptTemplate(first.id) : null;
    expect(resolved?.id).toBe(first?.id);
    expect(findPlaywrightScriptTemplate('missing')).toBeNull();
  });

  it('finds templates by script', () => {
    const crawler =
      PLAYWRIGHT_SCRIPT_TEMPLATES.find((template) => template.id === 'link-crawler') ??
      PLAYWRIGHT_SCRIPT_TEMPLATES[1];
    expect(crawler).toBeDefined();
    if (!crawler) return;
    expect(findPlaywrightTemplateByScript(crawler.script)?.id).toBe(crawler.id);
    expect(findPlaywrightTemplateByScript(`\n${crawler.script}\n`)?.id).toBe(crawler.id);
    expect(findPlaywrightTemplateByScript('export default async function run() {}')).toBeNull();
  });
});
