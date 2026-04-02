// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TextEditorEngineBrandButton } from './TextEditorEngineBrandButton';

describe('TextEditorEngineBrandButton', () => {
  it('links to the instance settings anchor', () => {
    render(<TextEditorEngineBrandButton instance='case_resolver' />);

    const link = screen.getByRole('link', {
      name: 'Open Case Resolver text editor settings',
    });

    expect(link).toHaveAttribute(
      'href',
      '/admin/settings/text-editors#text-editor-instance-case_resolver'
    );
  });
});
