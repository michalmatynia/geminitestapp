import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { loadScripterFromJson } from '../loader';
import { runScripterDryRun } from '../scripter-dry-run';
import { createFixtureDriver } from '../test-utils/fixture-driver';

const HERE = dirname(fileURLToPath(import.meta.url));

const loadFixture = (relativePath: string): Promise<string> =>
  readFile(join(HERE, relativePath), 'utf8');

const loadDefinition = (): Promise<string> =>
  readFile(join(process.cwd(), 'data/scripters/artificialintelligence-news.json'), 'utf8');

describe('artificialintelligence-news golden scripter', () => {
  it('loads and validates the scripter definition', async () => {
    const loaded = loadScripterFromJson(await loadDefinition());
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const def = loaded.definition;
    expect(def.id).toBe('artificialintelligence-news');
    expect(def.siteHost).toBe('www.artificialintelligence-news.com');
    expect(def.fieldMap.bindings.sourceUrl).toBeDefined();
    expect(def.fieldMap.bindings.title).toBeDefined();
  });

  it('extracts article title, URL, and image from Elementor loop-grid listing HTML', async () => {
    const [definitionJson, pageHtml] = await Promise.all([
      loadDefinition(),
      loadFixture('fixtures/artificialintelligence-news-listing.html'),
    ]);

    const loaded = loadScripterFromJson(definitionJson);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const definition = loaded.definition;
    const driver = createFixtureDriver({
      initialUrl: 'https://www.artificialintelligence-news.com/',
      pages: [
        {
          url: 'https://www.artificialintelligence-news.com/',
          html: pageHtml,
        },
      ],
    });

    const result = await runScripterDryRun(definition, driver, { limit: 10 });

    expect(result.scripterId).toBe('artificialintelligence-news');
    // 3 articles on the single listing page
    expect(result.records).toHaveLength(3);

    const [claude, gpt, gemini] = result.records;

    // Article 1 — Claude 4
    expect(claude!.mapped.title).toBe('Anthropic releases Claude 4 with major reasoning improvements');
    expect(claude!.mapped.sourceUrl).toBe(
      'https://www.artificialintelligence-news.com/2026/05/01/anthropic-releases-claude-4/'
    );
    expect(claude!.mapped.images).toEqual([
      'https://www.artificialintelligence-news.com/wp-content/uploads/2026/05/claude4-1024x683.jpg',
    ]);
    expect(claude!.issues.filter((i) => i.severity === 'error')).toHaveLength(0);

    // Article 2 — GPT-5 (relative image URL resolved to absolute)
    expect(gpt!.mapped.title).toBe("OpenAI's GPT-5 brings native multimodal understanding");
    expect(gpt!.mapped.sourceUrl).toBe(
      'https://www.artificialintelligence-news.com/2026/04/28/openai-gpt5-multimodal/'
    );
    expect(gpt!.mapped.images).toEqual([
      'https://www.artificialintelligence-news.com/wp-content/uploads/2026/04/gpt5-1024x683.jpg',
    ]);
    expect(gpt!.issues.filter((i) => i.severity === 'error')).toHaveLength(0);

    // Article 3 — Gemini Ultra 2
    expect(gemini!.mapped.title).toBe('Google unveils Gemini Ultra 2 for enterprise AI workloads');
    expect(gemini!.mapped.sourceUrl).toBe(
      'https://www.artificialintelligence-news.com/2026/04/20/google-gemini-ultra-2/'
    );
    expect(gemini!.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('surfaces date in raw fields for the article adapter', async () => {
    const [definitionJson, pageHtml] = await Promise.all([
      loadDefinition(),
      loadFixture('fixtures/artificialintelligence-news-listing.html'),
    ]);

    const loaded = loadScripterFromJson(definitionJson);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const driver = createFixtureDriver({
      initialUrl: 'https://www.artificialintelligence-news.com/',
      pages: [{ url: 'https://www.artificialintelligence-news.com/', html: pageHtml }],
    });

    const result = await runScripterDryRun(loaded.definition, driver, { limit: 10 });
    const [claude] = result.records;

    expect(claude!.raw['date']).toBe('May 1, 2026');
  });
});
