import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MILKBAR_LOCALIZED_CONTENT,
  DEFAULT_MILKBAR_PAGE_SETTINGS,
  type MilkbarCmsUpdateInput,
} from '@/features/page-manager/milkbardesigners/milkbar-cms.types';
import {
  compactDrawingImageSlotValues,
  createDrawingImageSlotValues,
  fillDrawingImageSlotValues,
  parseMilkbarCmsEditorDraft,
  setDrawingImageSlotValue,
  swapDrawingImageSlotValues,
} from '@/features/page-manager/milkbardesigners/milkbar-cms-editor-state';

const createPayload = (): MilkbarCmsUpdateInput => ({
  localizedContent: DEFAULT_MILKBAR_LOCALIZED_CONTENT,
  pageSettings: DEFAULT_MILKBAR_PAGE_SETTINGS,
  projects: [],
  services: [],
});

describe('milkbar CMS editor state helpers', () => {
  it('normalizes drawing image slots to the fixed slot count', () => {
    expect(createDrawingImageSlotValues([' /one.png ', '/two.png'])).toEqual([
      '/one.png',
      '/two.png',
      '',
      '',
    ]);
  });

  it('compacts drawing image slots without losing filled leading slots', () => {
    expect(compactDrawingImageSlotValues(['/one.png', '', '/three.png', ''])).toEqual([
      '/one.png',
      '',
      '/three.png',
    ]);
  });

  it('sets drawing image slots from the latest values so completed uploads do not overwrite each other', () => {
    const firstUpload = setDrawingImageSlotValue([], 0, '/uploads/cms/visualisation/one.webp');
    expect(firstUpload).not.toBeNull();

    const secondUpload = setDrawingImageSlotValue(
      firstUpload ?? [],
      1,
      '/uploads/cms/visualisation/two.webp'
    );

    expect(compactDrawingImageSlotValues(secondUpload ?? [])).toEqual([
      '/uploads/cms/visualisation/one.webp',
      '/uploads/cms/visualisation/two.webp',
    ]);
  });

  it('fills selected drawing slots while preserving existing assignments', () => {
    expect(
      fillDrawingImageSlotValues(
        ['/uploads/cms/visualisation/one.webp', '', '/uploads/cms/visualisation/three.webp'],
        ['/uploads/cms/visualisation/two.webp', '/uploads/cms/visualisation/four.webp'],
        1
      )
    ).toEqual([
      '/uploads/cms/visualisation/one.webp',
      '/uploads/cms/visualisation/two.webp',
      '/uploads/cms/visualisation/three.webp',
      '/uploads/cms/visualisation/four.webp',
    ]);
  });

  it('swaps drawing image slots from the supplied latest values', () => {
    expect(swapDrawingImageSlotValues(['/one.webp', '/two.webp'], 0, 1)).toEqual([
      '/two.webp',
      '/one.webp',
      '',
      '',
    ]);
  });

  it('parses valid editor drafts and rejects invalid draft payloads', () => {
    const payload = createPayload();
    const draft = parseMilkbarCmsEditorDraft(
      JSON.stringify({
        payload,
        snapshotUpdatedAt: 'snapshot-1',
        updatedAt: '2026-05-18T20:00:00.000Z',
      })
    );

    expect(draft?.snapshotUpdatedAt).toBe('snapshot-1');
    expect(draft?.payload.localizedContent.en.drawing.thumbImages).toEqual([]);
    expect(parseMilkbarCmsEditorDraft(JSON.stringify({ payload: {}, updatedAt: 'now' }))).toBeNull();
  });
});
