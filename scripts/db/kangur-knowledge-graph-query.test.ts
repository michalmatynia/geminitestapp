import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseKangurKnowledgeGraphQueryArgs } from './lib/kangur-knowledge-graph-query';

describe('kangur knowledge graph query CLI parser', () => {
  const scriptsDir = dirname(fileURLToPath(import.meta.url));

  it('parses a minimal message-only query', () => {
    expect(
      parseKangurKnowledgeGraphQueryArgs(['--message=Jak się zalogować?'])
    ).toEqual({
      latestUserMessage: 'Jak się zalogować?',
      learnerId: 'preview-learner',
      locale: 'pl',
    });
  });

  it('parses a contextual lesson query', () => {
    expect(
      parseKangurKnowledgeGraphQueryArgs([
        '--message=Wyjaśnij ten fragment lekcji.',
        '--learner-id=learner-ada',
        '--locale=en',
        '--surface=lesson',
        '--content-id=lesson-adding-doc',
        '--title=Dodawanie',
        '--selected-text=10 + 4 = 14',
        '--focus-kind=selection',
        '--focus-id=lesson-text-1',
        '--focus-label=Dodawanie w pamięci',
        '--prompt-mode=selected_text',
        '--interaction-intent=explain',
        '--repeated-question-count=2',
      ])
    ).toMatchObject({
      latestUserMessage: 'Wyjaśnij ten fragment lekcji.',
      learnerId: 'learner-ada',
      locale: 'en',
      context: {
        surface: 'lesson',
        contentId: 'lesson-adding-doc',
        title: 'Dodawanie',
        selectedText: '10 + 4 = 14',
        focusKind: 'selection',
        focusId: 'lesson-text-1',
        focusLabel: 'Dodawanie w pamięci',
        promptMode: 'selected_text',
        interactionIntent: 'explain',
        repeatedQuestionCount: 2,
      },
    });
  });

  it('rejects context flags without a surface', () => {
    expect(() =>
      parseKangurKnowledgeGraphQueryArgs([
        '--message=Gdzie jest logowanie?',
        '--content-id=lesson-adding-doc',
      ])
    ).toThrow('The --surface flag is required when passing Kangur tutor context flags.');
  });

  it('keeps the Kangur Neo4j helper scripts wired to dotenv config', () => {
    for (const filename of [
      'query-kangur-knowledge-graph.ts',
      'kangur-knowledge-graph-status.ts',
      'sync-kangur-knowledge-graph.ts',
    ]) {
      const source = readFileSync(resolve(scriptsDir, filename), 'utf8');
      expect(source).toContain('import \'dotenv/config\';');
    }
  });
});
