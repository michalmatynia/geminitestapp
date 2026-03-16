/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import {
  getKangurLessonAuthoringFilterCounts,
  getKangurLessonAuthoringStatus,
  matchesKangurLessonAuthoringFilter,
  summarizeKangurLessonPageNarrationCoverage,
  summarizeKangurContentCreator,
  validateKangurLessonDocumentDraft,
  validateKangurLessonPageDraft,
} from './content-creator-insights';
import type { KangurLesson, KangurLessonDocumentStore } from '@/features/kangur/shared/contracts/kangur';
import { buildKangurLessonDocumentNarrationSignature } from '../tts/script';

const buildLesson = (overrides: Partial<KangurLesson> = {}): KangurLesson => ({
  id: 'lesson-1',
  componentId: 'clock',
  contentMode: 'component',
  title: 'Lesson One',
  description: 'Intro lesson',
  emoji: '🕐',
  color: '#fff',
  activeBg: 'bg-indigo-500',
  sortOrder: 1000,
  enabled: true,
  ...overrides,
});

describe('content creator insights', () => {
  it('treats empty document-mode lessons as fixes instead of legacy import', () => {
    const lesson = buildLesson({ id: 'lesson-empty', contentMode: 'document' });
    const lessonDocuments: KangurLessonDocumentStore = {
      'lesson-empty': {
        version: 1,
        blocks: [],
      },
    };

    const status = getKangurLessonAuthoringStatus(lesson, lessonDocuments);

    expect(status.needsLegacyImport).toBe(false);
    expect(status.hasStructuralWarnings).toBe(true);
    expect(status.hasContent).toBe(false);
  });

  it('treats complete document lessons as content-ready without structural fixes', () => {
    const lesson = buildLesson({ id: 'lesson-custom', contentMode: 'document' });
    const lessonDocuments: KangurLessonDocumentStore = {
      'lesson-custom': {
        version: 1,
        blocks: [
          {
            id: 'svg-1',
            type: 'svg',
            title: '',
            markup: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" /></svg>',
            viewBox: '0 0 100 100',
            align: 'center',
            fit: 'contain',
            maxWidth: 420,
          },
        ],
      },
    };

    const status = getKangurLessonAuthoringStatus(lesson, lessonDocuments);

    expect(status.hasContent).toBe(true);
    expect(status.isMissingNarration).toBe(false);
    expect(status.hasStructuralWarnings).toBe(false);
    expect(matchesKangurLessonAuthoringFilter('missingNarration', lesson, lessonDocuments)).toBe(
      false
    );
    expect(matchesKangurLessonAuthoringFilter('needsFixes', lesson, lessonDocuments)).toBe(false);
  });

  it('summarizes fixes, import needs, and custom content independently', () => {
    const lessons = [
      buildLesson({ id: 'lesson-legacy', contentMode: 'component', title: 'Legacy lesson' }),
      buildLesson({ id: 'lesson-empty', contentMode: 'document', title: 'Empty draft' }),
      buildLesson({ id: 'lesson-custom', contentMode: 'document', title: 'Narrated later' }),
    ];
    const lessonDocuments: KangurLessonDocumentStore = {
      'lesson-empty': {
        version: 1,
        blocks: [],
      },
      'lesson-custom': {
        version: 1,
        blocks: [
          {
            id: 'svg-1',
            type: 'svg',
            title: '',
            markup: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
            viewBox: '0 0 100 100',
            align: 'center',
            fit: 'contain',
            maxWidth: 420,
          },
        ],
      },
    };

    const summary = summarizeKangurContentCreator({
      lessons,
      lessonDocuments,
      testSuiteCount: 2,
      questionStore: {},
    });
    const filterCounts = getKangurLessonAuthoringFilterCounts(lessons, lessonDocuments);

    expect(summary.legacyLessonCount).toBe(1);
    expect(summary.needsFixesCount).toBe(1);
    expect(summary.missingNarrationCount).toBe(0);
    expect(summary.customContentCount).toBe(1);
    expect(filterCounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'legacy', count: 1 }),
        expect.objectContaining({ id: 'needsFixes', count: 1 }),
        expect.objectContaining({ id: 'missingNarration', count: 0 }),
      ])
    );
  });

  it('reports page-level draft issues for blank and incomplete blocks', () => {
    const pageValidation = validateKangurLessonPageDraft({
      id: 'page-1',
      sectionKey: '',
      sectionTitle: '',
      sectionDescription: '',
      title: '',
      description: '',
      blocks: [
        {
          id: 'quiz-1',
          type: 'quiz',
          question: '',
          choices: [
            { id: 'choice-1', text: '' },
            { id: 'choice-2', text: '' },
          ],
          correctChoiceId: '',
        },
      ],
    });

    expect(pageValidation.hasStructuralWarnings).toBe(true);
    expect(pageValidation.issueCount).toBe(2);
    expect(pageValidation.warnings).toEqual(
      expect.arrayContaining([
        'This page has no visible learner content yet.',
        'One quiz block still needs a question, answer choices, or a correct answer.',
      ])
    );
    expect(pageValidation.narrationCoverage.state).toBe('waiting');
    expect(pageValidation.narrationCoverage.summaryLabel).toBe('Waiting for content');
  });

  it('summarizes page-level narration coverage for visuals and activities that need review', () => {
    const coverage = summarizeKangurLessonPageNarrationCoverage({
      id: 'page-2',
      sectionKey: '',
      sectionTitle: '',
      sectionDescription: '',
      title: 'Visual practice',
      description: '',
      blocks: [
        {
          id: 'svg-1',
          type: 'svg',
          title: '',
          markup: '<svg viewBox="0 0 100 100"></svg>',
          viewBox: '0 0 100 100',
          align: 'center',
          fit: 'contain',
          maxWidth: 420,
        },
        {
          id: 'activity-1',
          type: 'activity',
          activityId: 'clock-training',
          title: '',
          description: '',
        },
      ],
    });

    expect(coverage.state).toBe('needs-review');
    expect(coverage.summaryLabel).toBe('2 narration issues');
    expect(coverage.visualBlockCount).toBe(1);
    expect(coverage.activityBlockCount).toBe(1);
    expect(coverage.visualBlocksNeedingDescriptions).toBe(1);
    expect(coverage.activityBlocksUsingDefaultNarration).toBe(1);
  });

  it('marks narration as stale when the saved preview signature no longer matches the lesson draft', () => {
    const lesson = buildLesson({ id: 'lesson-stale', contentMode: 'document' });
    const baseDocument = {
      version: 1 as const,
      narration: {
        voice: 'coral' as const,
        locale: 'pl-PL',
      },
      blocks: [
        {
          id: 'text-1',
          type: 'text' as const,
          html: '<p>Visible explanation</p>',
          align: 'left' as const,
        },
      ],
    };
    const currentSignature = buildKangurLessonDocumentNarrationSignature({
      lessonId: lesson.id,
      title: lesson.title,
      description: lesson.description,
      document: baseDocument,
      voice: baseDocument.narration.voice,
      locale: baseDocument.narration.locale,
    });

    const validation = validateKangurLessonDocumentDraft({
      lesson,
      document: {
        ...baseDocument,
        narration: {
          ...baseDocument.narration,
          previewSourceSignature: `${currentSignature}-old`,
          lastPreviewedAt: '2026-03-09T12:00:00.000Z',
        },
      },
    });

    expect(validation.hasNarrationStale).toBe(true);
    expect(validation.narrationState).toBe('stale');
    expect(validation.hasNarrationWarning).toBe(true);
    expect(validation.warnings).toContain(
      'Narration preview needs refresh after content or voice changes.'
    );
    expect(validation.publishBlockers).toContain(
      'Refresh narration preview before publishing this lesson.'
    );
  });
});
