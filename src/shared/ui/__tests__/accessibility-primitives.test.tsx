import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/shared/ui/button';
import { Drawer } from '@/shared/ui/Drawer';
import { LoadingState } from '@/shared/ui/LoadingState';
import { SkipToContentLink } from '@/shared/ui/SkipToContentLink';
import { FileUploadTrigger } from '@/shared/ui/file-upload';
import { SelectSimple } from '@/shared/ui/select-simple';
import { StatusToggle } from '@/shared/ui/status-toggle';
import { Tooltip } from '@/shared/ui/tooltip';
import { GenericGridPicker } from '@/shared/ui/templates/pickers/GenericGridPicker';
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers/GenericPickerDropdown';
import { TreeHeader } from '@/shared/ui/tree';
import { TreeCaret } from '@/shared/ui/tree/TreeCaret';

describe('shared accessibility primitives', () => {
  it('renders a skip-to-content link that targets the main content anchor', () => {
    render(<SkipToContentLink />);

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#app-content'
    );
  });

  it('moves focus to the target content region when activated', () => {
    render(
      <>
        <SkipToContentLink />
        <main id='app-content' tabIndex={-1}>
          Content
        </main>
      </>
    );

    const link = screen.getByRole('link', { name: 'Skip to content' });
    fireEvent.click(link);

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('renders TreeCaret as a native button with expanded state', () => {
    const onToggle = vi.fn();
    render(<TreeCaret hasChildren isOpen onToggle={onToggle} />);

    const button = screen.getByRole('button', { name: 'Collapse section' });
    expect(button).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does not render an empty heading when TreeHeader is used without a title', () => {
    render(
      <TreeHeader>
        <div>Tree controls</div>
      </TreeHeader>
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Tree controls')).toBeInTheDocument();
  });

  it('renders GenericPickerDropdown with listbox semantics', () => {
    render(
      <GenericPickerDropdown
        ariaLabel='Add block'
        selectedKey='hero'
        groups={[
          {
            label: 'Sections',
            options: [
              { key: 'hero', label: 'Hero' },
              { key: 'grid', label: 'Grid' },
            ],
          },
        ]}
        onSelect={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button', { name: 'Add block' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox', { name: 'Add block' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hero' })).toHaveAttribute('aria-selected', 'true');
  });

  it('supports keyboard navigation across GenericPickerDropdown options', async () => {
    render(
      <GenericPickerDropdown
        ariaLabel='Add block'
        groups={[
          {
            label: 'Sections',
            options: [
              { key: 'hero', label: 'Hero' },
              { key: 'grid', label: 'Grid' },
              { key: 'faq', label: 'FAQ' },
            ],
          },
        ]}
        onSelect={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button', { name: 'Add block' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    const heroOption = screen.getByRole('option', { name: 'Hero' });
    await waitFor(() => expect(heroOption).toHaveFocus());

    fireEvent.keyDown(heroOption, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Grid' })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('option', { name: 'Grid' }), { key: 'End' });
    expect(screen.getByRole('option', { name: 'FAQ' })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('option', { name: 'FAQ' }), { key: 'Home' });
    expect(heroOption).toHaveFocus();

    fireEvent.keyDown(heroOption, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('listbox', { name: 'Add block' })).not.toBeInTheDocument();
  });

  it('renders GenericGridPicker options as selectable buttons', () => {
    render(
      <GenericGridPicker
        items={[
          { id: 'fade', label: 'Fade In' },
          { id: 'slide', label: 'Slide Up' },
        ]}
        selectedId='fade'
        onSelect={vi.fn()}
        renderItem={(item) => <div>{item.label}</div>}
      />
    );

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Fade In' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('option', { name: 'Slide Up' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('renders FileUploadTrigger as a native button by default', () => {
    render(<FileUploadTrigger onFilesSelected={vi.fn()}>Upload files</FileUploadTrigger>);

    expect(screen.getByRole('button', { name: 'Upload files' })).toBeInTheDocument();
  });

  it('describes FileUploadTrigger drag and paste affordances to assistive tech', () => {
    render(<FileUploadTrigger onFilesSelected={vi.fn()}>Upload files</FileUploadTrigger>);

    expect(screen.getByRole('button', { name: 'Upload files' })).toHaveAccessibleDescription(
      'Choose, drag and drop files, or paste files.'
    );
  });

  it('uses the placeholder as a fallback accessible name for SelectSimple triggers', () => {
    render(
      <SelectSimple
        value={undefined}
        onValueChange={vi.fn()}
        options={[
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
        ]}
        placeholder='Publication status'
      />
    );

    expect(screen.getByRole('combobox', { name: 'Publication status' })).toBeInTheDocument();
  });

  it('renders Drawer as a labeled dialog', () => {
    render(
      <Drawer open onClose={vi.fn()} title='AI warnings' description='Persistent notifications'>
        <div>Drawer content</div>
      </Drawer>
    );

    const dialog = screen.getByRole('dialog', { name: 'AI warnings' });
    expect(dialog).toHaveAccessibleDescription('Persistent notifications');
    expect(screen.getByRole('button', { name: 'Close drawer' })).toBeInTheDocument();
  });

  it('exposes tooltip content to keyboard users via aria-describedby', () => {
    render(
      <Tooltip content='Copies the current value'>
        <button type='button'>Copy value</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Copy value' });
    fireEvent.focus(trigger);

    const tooltip = screen.getByRole('tooltip');
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);
    expect(tooltip).toHaveTextContent('Copies the current value');

    fireEvent.blur(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('marks loading buttons as busy without exposing spinner icons', () => {
    render(
      <Button loading loadingText='Saving changes'>
        Save
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Saving changes' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders StatusToggle as a pressed button instead of a clickable badge', () => {
    const onToggle = vi.fn();
    render(<StatusToggle enabled onToggle={onToggle} enabledLabel='Enabled' disabledLabel='Disabled' />);

    const toggle = screen.getByRole('button', { name: 'Enabled' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('announces LoadingState as a polite status update', () => {
    render(<LoadingState message='Loading products...' />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading products...');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
