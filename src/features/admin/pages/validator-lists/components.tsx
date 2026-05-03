'use client';

import { ArrowLeft, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Badge, Button, Input } from '@/shared/ui/primitives.public';
import { AdminSectionBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { FormSection, SelectSimple } from '@/shared/ui/forms-and-actions.public';

import {
  VALIDATOR_LISTS_VIEW_LABELS,
  scopeOptions,
  type ValidatorListsView,
} from './types';
import { getViewContentId, getViewTriggerId } from './utils';

export function ValidatorListsHeader({
  activeView,
  isDirty,
  isPending,
  listsCount,
  totalLocked,
  onSave,
}: {
  activeView: ValidatorListsView;
  isDirty: boolean;
  isPending: boolean;
  listsCount: number;
  totalLocked: number;
  onSave: () => void;
}): React.JSX.Element {
  return (
    <AdminTitleBreadcrumbHeader
      title={<h1 className='text-3xl font-bold tracking-tight text-white'>Validation Pattern Lists</h1>}
      breadcrumb={<AdminSectionBreadcrumbs
        section={{ label: 'Global Validator', href: '/admin/validator' }}
        current={activeView === 'tooltips' ? 'Settings' : 'Validation Pattern Lists'}
        data-testid='validator-lists-breadcrumbs'
      />}
      actions={
        <>
          <Button type='button' variant='outline' size='xs' asChild>
            <Link href='/admin/validator'>
              <ArrowLeft className='mr-2 size-4' />
              Back To Validator
            </Link>
          </Button>
          <Button type='button' size='xs' onClick={onSave} disabled={!isDirty || isPending}>
            <Save className='mr-2 size-4' />
            Save Lists
          </Button>
          <Badge variant='outline' className='border-white/10 text-gray-300'>{listsCount} lists</Badge>
          <Badge variant='outline' className='border-white/10 text-gray-300'>{totalLocked} locked</Badge>
        </>
      }
    />
  );
}

export function ValidatorListsViewTabs({
  activeView,
  onSelectView,
}: {
  activeView: ValidatorListsView;
  onSelectView: (view: ValidatorListsView) => void;
}): React.JSX.Element {
  return (
    <div
      role='tablist'
      aria-label='Validator list manager views'
      className='grid h-auto w-full grid-cols-2 gap-2 border border-border/60 bg-card/30 p-2 md:max-w-md'
    >
      {(['lists', 'tooltips'] as const).map((view) => {
        const isActive = activeView === view;
        return (
          <button
            key={view}
            type='button'
            role='tab'
            id={getViewTriggerId(view)}
            aria-controls={getViewContentId(view)}
            aria-selected={isActive}
            onClick={() => onSelectView(view)}
            className={`inline-flex h-11 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors ${
              isActive
                ? 'border border-white/20 bg-white/10 text-white'
                : 'border border-transparent text-gray-300 hover:bg-white/5'
            }`}
          >
            {VALIDATOR_LISTS_VIEW_LABELS[view]}
          </button>
        );
      })}
    </div>
  );
}

export function AddValidatorListForm({
  newListName,
  setNewListName,
  newListScope,
  setNewListScope,
  newListDescription,
  setNewListDescription,
  onAdd,
}: {
  newListName: string;
  setNewListName: (val: string) => void;
  newListScope: string;
  setNewListScope: (val: string) => void;
  newListDescription: string;
  setNewListDescription: (val: string) => void;
  onAdd: () => void;
}): React.JSX.Element {
  return (
    <FormSection
      title='Add New List'
      description='Create a new list and choose which validator scope it points to.'
      className='space-y-3 p-4'
    >
      <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)_auto]'>
        <Input
          value={newListName}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewListName(event.target.value)}
          placeholder='List name'
          aria-label='List name'
          className='h-9'
          title='List name'
        />
        <SelectSimple
          size='sm'
          value={newListScope}
          onValueChange={(value: string) => {
            const matched = scopeOptions.find((option) => option.value === value);
            setNewListScope(matched?.value ?? 'products');
          }}
          options={scopeOptions}
          triggerClassName='h-9'
          ariaLabel='Select option'
          title='Select option'
        />
        <Input
          value={newListDescription}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewListDescription(event.target.value)}
          placeholder='Optional description'
          aria-label='List description'
          className='h-9'
          title='Optional description'
        />
        <Button type='button' onClick={onAdd} className='h-9 whitespace-nowrap'>
          <Plus className='mr-1.5 size-3.5' />
          Add List
        </Button>
      </div>
    </FormSection>
  );
}
