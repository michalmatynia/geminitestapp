import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CatalogEditorField } from '../components/CatalogEditorField';

vi.mock('@/shared/ui', () => ({
  Label: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <label className={className}>{children}</label>,
  Textarea: ({
    value,
    onChange,
    placeholder,
    className,
  }: {
    value: string;
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    className?: string;
  }) => (
    <textarea
      aria-label={placeholder}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  ),
}));

describe('CatalogEditorField', () => {
  it('serializes list values and normalizes textarea edits back to unique trimmed entries', () => {
    const onChange = vi.fn();

    render(
      <CatalogEditorField
        label='Preferred Models'
        description='One model id per line.'
        value={['gpt-4o-mini', 'gpt-4.1']}
        onChange={onChange}
        placeholder='Add model ids'
      />,
    );

    const textarea = screen.getByLabelText('Add model ids');
    expect(screen.getByText('Preferred Models')).toBeInTheDocument();
    expect(screen.getByText('One model id per line.')).toBeInTheDocument();
    expect(textarea).toHaveValue('gpt-4o-mini\ngpt-4.1');

    fireEvent.change(textarea, {
      target: {
        value: ' gpt-4o-mini \n\n gpt-4.1 \ngpt-4o-mini\nclaude-3.7-sonnet ',
      },
    });

    expect(onChange).toHaveBeenCalledWith([
      'gpt-4o-mini',
      'gpt-4.1',
      'claude-3.7-sonnet',
    ]);
  });
});
