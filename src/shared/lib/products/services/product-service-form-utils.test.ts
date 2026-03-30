/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';

import {
  formDataToObject,
  getProductImageFilepath,
  parseProductForm,
} from './product-service-form-utils';

describe('product-service-form-utils', () => {
  it('converts FormData entries into plain objects with array semantics', () => {
    const formData = new FormData();
    formData.append('title', 'First');
    formData.append('title', 'Second');
    formData.append('tagIds[]', 'tag-1');
    formData.append('tagIds[]', 'tag-2');

    expect(formDataToObject(formData)).toEqual({
      title: ['First', 'Second'],
      tagIds: ['tag-1', 'tag-2'],
    });
  });

  it('parses uploads, existing image ids, and normalized relation ids from product form data', () => {
    const formData = new FormData();
    formData.append('images', new File(['binary'], 'photo.png', { type: 'image/png' }));
    formData.append('images', new File([], 'empty.png', { type: 'image/png' }));
    formData.append('imageFileIds', ' existing-image ');
    formData.append('imageFileIds', '   ');
    formData.append('catalogIds', ' catalog-a ');
    formData.append('catalogIds', '');
    formData.append('tagIds', ' tag-a ');
    formData.append('producerIds', ' producer-a ');
    formData.append('noteIds', ' note-a ');
    formData.append('categoryId', ' category-a ');
    formData.append('studioProjectId', ' studio-1 ');

    const parsed = parseProductForm(formData);

    expect(parsed.rawData).toEqual(
      expect.objectContaining({
        images: expect.any(Array),
        imageFileIds: [' existing-image ', '   '],
      })
    );
    expect(parsed.images).toHaveLength(1);
    expect(parsed.images[0]?.name).toBe('photo.png');
    expect(parsed.imageFileIds).toEqual(['existing-image']);
    expect(parsed.imageSequence).toEqual([
      { kind: 'upload', file: expect.any(File) },
      { kind: 'existing', imageFileId: 'existing-image' },
    ]);
    expect(parsed.catalogIds).toEqual(['catalog-a']);
    expect(parsed.categoryId).toBe('category-a');
    expect(parsed.tagIds).toEqual(['tag-a']);
    expect(parsed.producerIds).toEqual(['producer-a']);
    expect(parsed.noteIds).toEqual(['note-a']);
    expect(parsed.studioProjectId).toBe('studio-1');
  });

  it('returns normalized image filepaths only when the nested imageFile payload is usable', () => {
    expect(
      getProductImageFilepath({
        imageFile: {
          filepath: ' /uploads/example.png ',
        },
      } as never)
    ).toBe('/uploads/example.png');
    expect(getProductImageFilepath({ imageFile: { filepath: '   ' } } as never)).toBeNull();
    expect(getProductImageFilepath({ imageFile: null } as never)).toBeNull();
    expect(getProductImageFilepath({ imageFile: [] } as never)).toBeNull();
  });
});
