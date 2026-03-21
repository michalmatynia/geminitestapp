import { render, screen } from '@/__tests__/test-utils';
import { describe, expect, it, vi } from 'vitest';

import {
  SettingsFieldsRenderer,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';

type SampleValues = {
  title: string;
  count: number;
  notes: string;
  accent: string;
  primaryBackground: string;
  opacity: number;
};

const fields: SettingsField<SampleValues>[] = [
  { key: 'title', label: 'Title', type: 'text', helperText: 'Short headline.' },
  { key: 'count', label: 'Count', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
  { key: 'accent', label: 'Accent', type: 'color' },
  {
    key: 'primaryBackground',
    label: 'Primary Background',
    type: 'background',
    helperText: 'Supports gradients.',
  },
  { key: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 100 },
];

const values: SampleValues = {
  title: 'Example',
  count: 3,
  notes: 'Some notes',
  accent: '#ff0000',
  primaryBackground: 'linear-gradient(135deg, #ff8a3d 0%, #ff5f6d 100%)',
  opacity: 42,
};

const expectLabelLinkedControl = (labelText: string) => {
  const input = screen.getByLabelText(labelText);
  const label = screen.getByText(labelText);

  expect(label).toHaveAttribute('for', input.getAttribute('id'));

  return input;
};

describe('SettingsFieldsRenderer accessibility', () => {
  it('links labels to their controls for standard fields', () => {
    render(
      <SettingsFieldsRenderer
        fields={fields}
        values={values}
        onChange={vi.fn()}
        errors={{ title: 'Required' }}
      />
    );

    const titleInput = expectLabelLinkedControl('Title');
    const titleId = titleInput.getAttribute('id');
    expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    expect(titleInput).toHaveAttribute('aria-errormessage', `${titleId}-error`);
    expect(titleInput).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining(`${titleId}-description`)
    );
    expect(titleInput).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining(`${titleId}-error`)
    );

    expectLabelLinkedControl('Count');
    expectLabelLinkedControl('Notes');
    expectLabelLinkedControl('Accent');
    const backgroundInput = expectLabelLinkedControl('Primary Background');
    const backgroundId = backgroundInput.getAttribute('id');
    expect(backgroundInput).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining(`${backgroundId}-description`)
    );
    expectLabelLinkedControl('Opacity');
  });
});
