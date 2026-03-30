import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

const PAGED_PRINT_PANEL_FILES = [
  {
    path: 'src/features/kangur/ui/components/lesson-runtime/LessonActivityShell.tsx',
    expectedCount: 2,
  },
  {
    path: 'src/features/kangur/ui/components/LessonSlideSection.tsx',
    expectedCount: 1,
  },
  {
    path: 'src/features/kangur/ui/components/lesson-runtime/KangurLessonDocumentRenderer.tsx',
    expectedCount: 1,
  },
  {
    path: 'src/features/kangur/ui/components/ClockTrainingGame.tsx',
    expectedCount: 1,
  },
  {
    path: 'src/features/kangur/ui/components/KangurGame.tsx',
    expectedCount: 2,
  },
  {
    path: 'src/features/kangur/ui/components/KangurExam.tsx',
    expectedCount: 3,
  },
  {
    path: 'src/features/kangur/ui/components/lesson-runtime/KangurLessonActivityBlock.tsx',
    expectedCount: 1,
  },
] as const;

const PAGED_PRINT_MARKER = "data-kangur-print-paged-panel='true'";
const PREFERRED_PRINT_TARGET_FILES = [
  {
    path: 'src/features/kangur/ui/components/ClockTrainingGame.tsx',
    expectedCount: 1,
  },
  {
    path: 'src/features/kangur/ui/components/KangurGame.tsx',
    expectedCount: 2,
  },
  {
    path: 'src/features/kangur/ui/components/KangurExam.tsx',
    expectedCount: 3,
  },
  {
    path: 'src/features/kangur/ui/components/LessonSlideSection.tsx',
    expectedCount: 1,
  },
] as const;
const PREFERRED_PRINT_TARGET_MARKER = "data-kangur-print-preferred-target='true'";

describe('lesson paged print panel inventory', () => {
  it('keeps the lesson-owned printable shells opted into paged print mode', () => {
    for (const entry of PAGED_PRINT_PANEL_FILES) {
      const content = readFileSync(resolve(ROOT, entry.path), 'utf8');
      const matchCount = content.split(PAGED_PRINT_MARKER).length - 1;

      expect(
        matchCount,
        `${entry.path} should contain ${entry.expectedCount} paged print panel marker(s)`
      ).toBe(entry.expectedCount);
    }
  });

  it('keeps the nested lesson/game print panels marked as preferred shell print targets', () => {
    for (const entry of PREFERRED_PRINT_TARGET_FILES) {
      const content = readFileSync(resolve(ROOT, entry.path), 'utf8');
      const matchCount = content.split(PREFERRED_PRINT_TARGET_MARKER).length - 1;

      expect(
        matchCount,
        `${entry.path} should contain ${entry.expectedCount} preferred print target marker(s)`
      ).toBe(entry.expectedCount);
    }
  });
});
