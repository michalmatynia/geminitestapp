import { describe, expect, it } from 'vitest';

import {
  formatSelectorRegistryRoleLabel,
  inferSelectorRegistryRoleFromProbe,
  inferSelectorRegistryRole,
  isSelectorRegistryEntryCompatibleWithStepField,
} from './selector-registry-roles';

describe('selector-registry-roles', () => {
  it('infers semantic roles from selector keys', () => {
    expect(
      inferSelectorRegistryRole({
        namespace: 'amazon',
        key: 'amazon.googleLens.fileInputs',
        kind: 'selector',
      })
    ).toBe('upload_input');

    expect(
      inferSelectorRegistryRole({
        namespace: 'amazon',
        key: 'amazon.product.price',
        kind: 'selector',
      })
    ).toBe('content_price');
  });

  it('matches roles against step expectations', () => {
    expect(
      isSelectorRegistryEntryCompatibleWithStepField(
        { role: 'upload_input' },
        'upload_file'
      )
    ).toBe(true);

    expect(
      isSelectorRegistryEntryCompatibleWithStepField(
        { role: 'submit' },
        'fill'
      )
    ).toBe(false);
  });

  it('formats human-readable role labels', () => {
    expect(formatSelectorRegistryRoleLabel('ready_signal')).toBe('Ready signal');
  });

  it('classifies probe candidates into selector roles and mapper hints', () => {
    expect(
      inferSelectorRegistryRoleFromProbe({
        tag: 'span',
        role: null,
        textPreview: '$129.99',
        attrs: { class: 'product-price' },
        classes: ['product-price'],
      })
    ).toMatchObject({
      role: 'content_price',
      draftTargetHints: ['price'],
    });

    expect(
      inferSelectorRegistryRoleFromProbe({
        tag: 'img',
        role: 'img',
        textPreview: null,
        attrs: { src: 'https://example.com/product.jpg', alt: 'Preview image' },
        classes: ['gallery-image'],
      })
    ).toMatchObject({
      role: 'content_image',
      draftTargetHints: ['imageLinks'],
    });
  });
});
