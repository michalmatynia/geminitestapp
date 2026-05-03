import { describe, expect, it } from 'vitest';

import { selectorRegistryRoleSchema } from '@/shared/contracts/integrations/selector-registry';

import {
  SELECTOR_REGISTRY_ROLE_CLASSIFICATIONS,
  classifySelectorRegistryRole,
  formatSelectorRegistryRoleLabel,
  inferSelectorRegistryRoleFromProbe,
  inferSelectorRegistryRole,
  isSelectorRegistryEntryCompatibleWithStepField,
} from './selector-registry-roles';

describe('selector-registry-roles', () => {
  it('classifies every selector registry role into an operational role class', () => {
    expect(Object.keys(SELECTOR_REGISTRY_ROLE_CLASSIFICATIONS).sort()).toEqual(
      [...selectorRegistryRoleSchema.options].sort()
    );

    expect(classifySelectorRegistryRole('input')).toMatchObject({
      roleClass: 'write_target',
      capabilities: { fillable: true },
    });
    expect(classifySelectorRegistryRole('submit')).toMatchObject({
      roleClass: 'action_target',
      capabilities: { clickable: true },
    });
    expect(classifySelectorRegistryRole('feedback')).toMatchObject({
      roleClass: 'state_signal',
      capabilities: { waitable: true },
    });
    expect(classifySelectorRegistryRole('pattern')).toMatchObject({
      roleClass: 'hint_metadata',
      capabilities: { hintOnly: true },
    });
  });

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
