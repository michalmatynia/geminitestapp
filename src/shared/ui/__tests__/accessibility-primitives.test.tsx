import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Breadcrumbs } from '@/shared/ui/Breadcrumbs';
import { Drawer } from '@/shared/ui/Drawer';
import { LoadingPanel } from '@/shared/ui/LoadingPanel';
import { LoadingState } from '@/shared/ui/LoadingState';
import { JsonViewer } from '@/shared/ui/JsonViewer';
import { SkipToContentLink } from '@/shared/ui/SkipToContentLink';
import { FileUploadTrigger } from '@/shared/ui/file-upload';
import { SelectSimple } from '@/shared/ui/select-simple';
import { StatusToggle } from '@/shared/ui/status-toggle';
import { DocumentSearchPage } from '@/shared/ui/templates/DocumentSearchPage';
import { Tooltip } from '@/shared/ui/tooltip';
import { GenericGridPicker } from '@/shared/ui/templates/pickers/GenericGridPicker';
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers/GenericPickerDropdown';
import { TreeHeader } from '@/shared/ui/tree';
import { TreeCaret } from '@/shared/ui/tree/TreeCaret';
import { AccessibilityProvider } from '@/shared/providers/AccessibilityProvider';

const SELECT_SIMPLE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

const GENERIC_PICKER_SECTIONS_OPTIONS = [
  { key: 'hero', label: 'Hero' },
  { key: 'grid', label: 'Grid' },
  { key: 'faq', label: 'FAQ' },
];

const GENERIC_PICKER_SECTIONS_GROUP = [
  {
    label: 'Sections',
    options: GENERIC_PICKER_SECTIONS_OPTIONS,
  },
];

const GENERIC_PICKER_SECTIONS_GROUP_BASIC = [
  {
    label: 'Sections',
    options: GENERIC_PICKER_SECTIONS_OPTIONS.slice(0, 2),
  },
];

describe('shared accessibility primitives', () => {
  it('renders a skip-to-content link that targets the main content anchor', () => {
    render(<SkipToContentLink />);

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#kangur-main-content'
    );
  });

  it('moves focus to the target content region when activated', () => {
    render(
      <>
        <SkipToContentLink />
        <main id='kangur-main-content' tabIndex={-1}>
          Content
        </main>
      </>
    );

    const link = screen.getByRole('link', { name: 'Skip to content' });
    fireEvent.click(link);

    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('moves focus to the target content region when activated from the keyboard', () => {
    const windowKeyDown = vi.fn();
    window.addEventListener('keydown', windowKeyDown);

    render(
      <>
        <SkipToContentLink />
        <main id='kangur-main-content' tabIndex={-1}>
          Content
        </main>
      </>
    );

    const link = screen.getByRole('link', { name: 'Skip to content' });
    link.focus();
    fireEvent.keyDown(link, { key: 'Enter' });

    expect(screen.getByRole('main')).toHaveFocus();
    expect(window.location.hash).toBe('#kangur-main-content');
    expect(windowKeyDown).not.toHaveBeenCalled();

    window.removeEventListener('keydown', windowKeyDown);
  });

  it('renders JsonViewer with a labeled scroll region instead of labeling the preformatted text', () => {
    render(<JsonViewer title='Last Request' data={{ ok: true }} />);

    const region = screen.getByRole('region', { name: 'Last Request JSON' });
    expect(region).toHaveAttribute('tabindex', '0');

    const jsonText = region.querySelector('pre');
    expect(jsonText).not.toBeNull();
    expect(jsonText).not.toHaveAttribute('aria-label');
  });

  it('renders scrollable Breadcrumbs as a keyboard-focusable nav and supports arrow key scrolling', () => {
    render(
      <Breadcrumbs
        scrollable
        items={[{ label: 'Library' }, { label: 'Notes' }, { label: 'Current note' }]}
      />
    );

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const scrollBy = vi.fn();
    Object.defineProperty(nav, 'scrollBy', {
      value: scrollBy,
      configurable: true,
    });

    expect(nav).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(nav, { key: 'ArrowRight' });
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 140, behavior: 'smooth' });

    fireEvent.keyDown(nav, { key: 'ArrowLeft' });
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -140, behavior: 'smooth' });
  });

  it('renders DocumentSearchPage content as a focusable region', () => {
    render(
      <DocumentSearchPage
        title='Notes'
        loading={false}
        hasResults
        emptyState={<div>No results</div>}
      >
        <div>Results</div>
      </DocumentSearchPage>
    );

    const region = screen.getByRole('region', { name: 'Notes content' });
    expect(region).toHaveAttribute('tabindex', '0');

    region.focus();
    expect(region).toHaveFocus();
  });

  it('does not mutate explicitly managed scroll regions', async () => {
    render(
      <AccessibilityProvider>
        <div data-testid='auto-scroll-region' style={{ maxHeight: 10, overflowY: 'auto' }}>
          <div style={{ height: 20 }} />
        </div>
        <div
          data-testid='ignored-scroll-region'
          data-scroll-focus-ignore='true'
          style={{ maxHeight: 10, overflowY: 'auto' }}
        >
          <div style={{ height: 20 }} />
        </div>
        <main data-testid='skip-target' tabIndex={-1} style={{ maxHeight: 10, overflowY: 'auto' }}>
          Managed main
        </main>
      </AccessibilityProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auto-scroll-region')).toHaveAttribute('tabindex', '0');
    });

    expect(screen.getByTestId('ignored-scroll-region')).not.toHaveAttribute('tabindex');
    expect(screen.getByTestId('skip-target')).toHaveAttribute('tabindex', '-1');
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
        groups={GENERIC_PICKER_SECTIONS_GROUP_BASIC}
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
        groups={GENERIC_PICKER_SECTIONS_GROUP}
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

  it('renders clickable Badge instances as native buttons', () => {
    render(<Badge onClick={vi.fn()}>Apply preset</Badge>);

    const trigger = screen.getByRole('button', { name: 'Apply preset' });
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).not.toHaveAttribute('tabindex');
  });

  it('splits clickable removable Badge instances into separate action buttons', () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(
      <Badge onClick={onClick} onRemove={onRemove} removeLabel='Remove preset'>
        Apply preset
      </Badge>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Apply preset' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove preset' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps the split Badge wrapper non-interactive and exposes exactly two buttons', () => {
    const { container } = render(
      <Badge onClick={vi.fn()} onRemove={vi.fn()} removeLabel='Remove preset'>
        Apply preset
      </Badge>
    );

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(container.firstElementChild).not.toHaveAttribute('role', 'button');
    expect(container.firstElementChild).not.toHaveAttribute('tabindex');
  });

  it('forwards keyboard handlers to the primary action of split Badge instances', () => {
    const onKeyDown = vi.fn();
    render(
      <Badge
        onClick={vi.fn()}
        onKeyDown={onKeyDown}
        onRemove={vi.fn()}
        removeLabel='Remove preset'
      >
        Apply preset
      </Badge>
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Apply preset' }), { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('describes FileUploadTrigger drag and paste affordances to assistive tech', () => {
    render(<FileUploadTrigger onFilesSelected={vi.fn()}>Upload files</FileUploadTrigger>);

    expect(screen.getByRole('button', { name: 'Upload files' })).toHaveAccessibleDescription(
      'Choose, drag and drop files, or paste files.'
    );
  });

  it('keeps child button semantics when FileUploadTrigger uses asChild preserveChildSemantics', () => {
    render(
      <FileUploadTrigger asChild preserveChildSemantics onFilesSelected={vi.fn()}>
        <button type='button'>Upload files</button>
      </FileUploadTrigger>
    );

    const trigger = screen.getByRole('button', { name: 'Upload files' });
    expect(trigger).toHaveAccessibleDescription('Choose, drag and drop files, or paste files.');
    expect(trigger).not.toHaveAttribute('tabindex');
    expect(trigger).not.toHaveAttribute('role');
  });

  it('uses the placeholder as a fallback accessible name for SelectSimple triggers', () => {
    render(
      <SelectSimple
        value={undefined}
        onValueChange={vi.fn()}
        options={SELECT_SIMPLE_STATUS_OPTIONS}
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

  it('uses tooltip content as aria-label for icon-only triggers', () => {
    render(
      <Tooltip content='Open settings'>
        <button type='button'>
          <svg aria-hidden='true' />
        </button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Open settings' });
    expect(trigger).toHaveAttribute('aria-label', 'Open settings');
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

  it('announces LoadingPanel as a polite status update', () => {
    render(<LoadingPanel>Loading dashboard...</LoadingPanel>);

    expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard...');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
  });
});
