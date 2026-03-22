import { describe, expect, it } from 'vitest';

import { SECTION_BLOCK_TYPES as frontendSectionBlockTypes } from '../frontend/sections/grid/frontend-grid-utils';
import { SECTION_BLOCK_TYPES as previewSectionBlockTypes } from '../page-builder/preview/preview-utils';
import {
  CMS_SECTION_BLOCK_TYPES,
  CMS_SECTION_BLOCK_TYPE_SET,
  getBlockMinHeight,
  getGapClass,
  getGapStyle,
  resolveAlignItems,
  resolveGapValue,
  resolveJustifyContent,
} from './layout-utils';

describe('cms layout utils', () => {
  it('keeps runtime and preview section block families aligned', () => {
    expect(Array.from(frontendSectionBlockTypes)).toEqual(CMS_SECTION_BLOCK_TYPES);
    expect(previewSectionBlockTypes).toEqual(
      CMS_SECTION_BLOCK_TYPES.filter((type) => type !== 'Repeater')
    );
    expect(CMS_SECTION_BLOCK_TYPE_SET.has('Repeater')).toBe(true);
  });

  it('resolves shared spacing helpers consistently', () => {
    expect(resolveGapValue('inherit', 'medium')).toBe('medium');
    expect(resolveGapValue('large', 'medium')).toBe('large');
    expect(getGapClass('large')).toBe('gap-12');
    expect(getGapStyle(24)).toEqual({ gap: '24px' });
    expect(getGapStyle(0)).toBeUndefined();
  });

  it('maps shared layout controls and block heights', () => {
    expect(resolveJustifyContent('end')).toBe('flex-end');
    expect(resolveAlignItems('stretch')).toBe('stretch');
    expect(getBlockMinHeight('Model3D')).toBe(200);
    expect(getBlockMinHeight('UnknownBlock')).toBe(40);
  });
});
