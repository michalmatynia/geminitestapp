import { describe, expect, it } from 'vitest';

import {
  formDataToObject,
  parseProductForm,
} from '@/shared/lib/products/services/product-service-form-utils';

describe('product-service-form-utils', () => {
  it('preserves repeated form keys as arrays', () => {
    const formData = new FormData();
    formData.append('catalogIds', 'cat-a');
    formData.append('catalogIds', 'cat-b');
    formData.append('imageFileIds', 'img-a');
    formData.append('imageFileIds', 'img-b');

    const parsed = formDataToObject(formData);

    expect(parsed['catalogIds']).toEqual(['cat-a', 'cat-b']);
    expect(parsed['imageFileIds']).toEqual(['img-a', 'img-b']);
  });

  it('preserves mixed existing/upload image slot order', () => {
    const formData = new FormData();
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'new-image.jpg', {
      type: 'image/jpeg',
    });

    formData.append('imageFileIds', 'img-existing-1');
    formData.append('images', file);
    formData.append('imageFileIds', 'img-existing-2');

    const parsed = parseProductForm(formData);

    expect(parsed.imageFileIds).toEqual(['img-existing-1', 'img-existing-2']);
    expect(parsed.images).toEqual([file]);
    expect(parsed.imageSequence).toHaveLength(3);
    expect(parsed.imageSequence[0]).toEqual({
      kind: 'existing',
      imageFileId: 'img-existing-1',
    });
    expect(parsed.imageSequence[1]).toEqual({
      kind: 'upload',
      file,
    });
    expect(parsed.imageSequence[2]).toEqual({
      kind: 'existing',
      imageFileId: 'img-existing-2',
    });
  });

  it('accepts Blob image entries from FormData and normalizes them into upload files', () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });
    const fakeFormData = {
      entries: function* () {
        yield ['images', blob as unknown as FormDataEntryValue];
      },
      getAll: (_key: string) => [],
      get: (_key: string) => null,
    } as unknown as FormData;

    const parsed = parseProductForm(fakeFormData);

    expect(parsed.images).toHaveLength(1);
    expect(parsed.images[0]).toBeInstanceOf(File);
    expect(parsed.images[0]?.name).toBe('upload-1');
    expect(parsed.imageSequence).toHaveLength(1);
    expect(parsed.imageSequence[0]).toMatchObject({ kind: 'upload' });
  });
});
