// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui', () => ({
  Badge: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Checkbox: ({
    checked,
    id,
    onCheckedChange,
  }: {
    checked?: boolean;
    id?: string;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      id={id}
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  Label: ({
    children,
    htmlFor,
    id,
    className,
  }: React.LabelHTMLAttributes<HTMLLabelElement> & { children?: React.ReactNode }) => (
    <label htmlFor={htmlFor} id={id} className={className}>
      {children}
    </label>
  ),
  SelectSimple: ({
    id,
    onValueChange,
    options,
    value,
  }: {
    id?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ label: string; value: string }>;
    value: string;
  }) => (
    <select id={id} value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  UI_GRID_ROOMY_CLASSNAME: 'grid gap-4',
}));

vi.mock('@/shared/ui/InsetPanel', () => ({
  insetPanelVariants: () => 'inset-panel',
}));

import { PromptGenerationSection } from './PromptGenerationSection';

describe('PromptGenerationSection', () => {
  it('renders the section directly and wires prompt-generation interactions without a local runtime context', () => {
    const onInputChange = vi.fn();
    const onCopyInitialResult = vi.fn();
    const onModelChange = vi.fn();
    const onOutputEnabledChange = vi.fn();
    const onOutputPromptChange = vi.fn();
    const onCopyFinalResult = vi.fn();

    const props = {
      pathNumber: 2,
      pathTitle: 'Refinement Path',
      inputLabel: 'Input Prompt',
      inputValue: 'Draft prompt',
      onInputChange,
      initialResultLabel: 'Draft Result',
      initialResultValue: 'Draft output',
      onCopyInitialResult,
      modelLabel: 'Model',
      modelValue: 'gpt-5-mini',
      onModelChange,
      modelOptions: [
        { value: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Fast' },
        { value: 'gpt-5', label: 'GPT-5', description: 'Accurate' },
      ],
      outputEnabled: false,
      onOutputEnabledChange,
      outputPromptLabel: 'Output Prompt',
      outputPromptValue: '',
      onOutputPromptChange,
      outputPlaceholder: 'Refine the result',
      finalResultLabel: 'Final Result',
      finalResultValue: null,
      onCopyFinalResult,
      badgeVariant: 'info' as const,
      badgeTextColor: 'text-blue-200',
      outputEnabledCheckboxId: 'output-enabled',
    };

    const view = render(<PromptGenerationSection {...props} />);

    expect(screen.getByText('Refinement Path')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Draft output')).toBeInTheDocument();
    expect(screen.queryByLabelText('Output Prompt')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Input Prompt'), {
      target: { value: 'Updated prompt' },
    });
    fireEvent.change(screen.getByLabelText('Model'), {
      target: { value: 'gpt-5' },
    });
    fireEvent.click(screen.getByLabelText('Enable Output Prompt (Refinement using gpt-5-mini)'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Draft Result' }));

    expect(onInputChange).toHaveBeenCalledWith('Updated prompt');
    expect(onModelChange).toHaveBeenCalledWith('gpt-5');
    expect(onOutputEnabledChange).toHaveBeenCalledWith(true);
    expect(onCopyInitialResult).toHaveBeenCalledTimes(1);

    view.rerender(
      <PromptGenerationSection
        {...props}
        outputEnabled
        outputPromptValue='Existing refinement'
        finalResultValue='Final output'
      />
    );

    expect(screen.getByLabelText('Output Prompt')).toHaveValue('Existing refinement');
    expect(screen.getByText('Final output')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Output Prompt'), {
      target: { value: 'New refinement prompt' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy Final Result' }));

    expect(onOutputPromptChange).toHaveBeenCalledWith('New refinement prompt');
    expect(onCopyFinalResult).toHaveBeenCalledTimes(1);
  });
});
