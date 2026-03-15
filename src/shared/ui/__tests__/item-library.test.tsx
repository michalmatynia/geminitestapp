/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LibraryItem } from '../item-library';
import { ItemLibrary } from '../item-library';

type PersonaDraftItem = LibraryItem & {
  moodId: string;
};

let latestOnChange: ((updates: Partial<PersonaDraftItem>) => void) | null = null;
let initialOnChange: ((updates: Partial<PersonaDraftItem>) => void) | null = null;

vi.mock('../button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('../confirm-dialog', () => ({
  ConfirmDialog: ({
    children,
    open,
    onOpenChange,
  }: {
    open: boolean;
    children?: React.ReactNode;
    onOpenChange: (open: boolean) => void;
    onConfirm?: () => void;
    title?: string;
    description?: string;
    confirmText?: string;
    variant?: string;
  }) => (
    <div data-testid='confirm-dialog'>
      {open ? children : null}
      <button type='button' onClick={() => onOpenChange(false)}>
        close-confirm
      </button>
    </div>
  ),
}));

vi.mock('../empty-state', () => ({
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action?: React.ReactNode;
  }) => (
    <div>
      <p>{title}</p>
      <p>{description}</p>
      {action}
    </div>
  ),
  CompactEmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description: string;
    action?: React.ReactNode;
  }) => (
    <div>
      <p>{title}</p>
      <p>{description}</p>
      {action}
    </div>
  ),
}));

vi.mock('../FormModal', () => ({
  FormModal: ({
    open,
    onSave,
    onClose,
    isSaveDisabled,
    children,
    saveText = 'Save',
  }: {
    open: boolean;
    onSave: () => void;
    onClose: () => void;
    isSaveDisabled?: boolean;
    children: React.ReactNode;
    saveText?: string;
  }) =>
    open ? (
      <div>
        <button type='button' disabled={isSaveDisabled} onClick={() => onSave()}>
          {saveText}
        </button>
        <button type='button' onClick={() => onClose()}>
          close
        </button>
        {children}
      </div>
    ) : null,
}));

vi.mock('../Input', () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} {...props} />
  ),
}));

vi.mock('../Label', () => ({
  Label: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
}));

vi.mock('../ResourceCard', () => ({
  ResourceCard: ({
    title,
    description,
    actions,
    footer,
  }: {
    title: string;
    description: string;
    actions?: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div>{actions}</div>
      <div>{footer}</div>
    </div>
  ),
}));

vi.mock('../SectionHeader', () => ({
  SectionHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description: string;
    actions?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      <div>{actions}</div>
    </header>
  ),
}));

vi.mock('../Textarea', () => ({
  Textarea: ({
    value,
    onChange,
    ...props
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea value={value} onChange={onChange} {...props} />
  ),
}));

describe('ItemLibrary', () => {
  beforeEach(() => {
    latestOnChange = null;
    initialOnChange = null;
  });

  it('keeps the latest draft updates when a stale onChange callback updates fields', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn();

    const item: PersonaDraftItem = {
      id: 'persona-1',
      name: 'Existing Persona',
      moodId: 'mood-0',
      description: 'old description',
    };

    const renderExtraFields = (_item: PersonaDraftItem) => (
      <>
        <button
          type='button'
          onClick={() => {
            latestOnChange?.({ description: 'latest description' });
          }}
        >
          apply latest description
        </button>
        <button
          type='button'
          onClick={() => {
            initialOnChange?.({ moodId: 'kept-mood' });
          }}
        >
          apply stale mood
        </button>
      </>
    );

    render(
      <ItemLibrary<PersonaDraftItem>
        title='Personas'
        description='Persona library'
        items={[item]}
        isLoading={false}
        onSave={onSave}
        onDelete={onDelete}
        renderExtraFields={(itemDraft, onChange) => {
          if (!initialOnChange) {
            initialOnChange = onChange;
          }
          latestOnChange = onChange;
          return renderExtraFields(itemDraft);
        }}
        buildDefaultItem={() => ({
          id: 'draft-persona',
          name: '',
          moodId: 'draft-mood',
          description: '',
        })}
        entityName='Persona'
      />
    );

    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);

    const nameInput = screen.getByPlaceholderText('Enter persona name');
    fireEvent.change(nameInput, { target: { value: 'Updated Persona' } });

    fireEvent.click(screen.getByRole('button', { name: 'apply latest description' }));
    fireEvent.click(screen.getByRole('button', { name: 'apply stale mood' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'persona-1',
        name: 'Updated Persona',
        description: 'latest description',
        moodId: 'kept-mood',
      })
    );
  });

  it('sends updates for both name and description through functional draft updates', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn();

    const renderExtraFields = () => (
      <button
        type='button'
        onClick={() => {
          latestOnChange?.({ moodId: 'secondary-mood' });
        }}
      >
        apply mood
      </button>
    );

    render(
      <ItemLibrary<PersonaDraftItem>
        title='Personas'
        description='Persona library'
        items={[]}
        isLoading={false}
        onSave={onSave}
        onDelete={onDelete}
        renderExtraFields={(_item, onChange) => {
          latestOnChange = onChange;
          return renderExtraFields();
        }}
        buildDefaultItem={() => ({
          id: 'draft-persona',
          name: '',
          moodId: 'draft-mood',
          description: '',
        })}
        entityName='Persona'
      />
    );

    const createButtons = screen.getAllByRole('button', { name: /new persona/i });
    fireEvent.click(createButtons[createButtons.length - 1]);

    const nameInput = screen.getByPlaceholderText('Enter persona name');
    fireEvent.change(nameInput, { target: { value: 'New Persona' } });

    const descriptionTextarea = screen.getByPlaceholderText('Optional description');
    fireEvent.change(descriptionTextarea, { target: { value: 'draft description' } });

    fireEvent.click(screen.getByRole('button', { name: 'apply mood' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Persona' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Persona',
        description: 'draft description',
        moodId: 'secondary-mood',
      })
    );
  });
});
