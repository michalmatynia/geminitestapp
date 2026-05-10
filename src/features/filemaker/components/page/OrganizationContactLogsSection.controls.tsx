'use client';

import { RefreshCw, Search } from 'lucide-react';
import React from 'react';

import { Badge, Button, Input } from '@/shared/ui/primitives.public';

export function ContactLogControls(props: {
  isLoading: boolean;
  loadedCount: number;
  onQueryDraftChange: (value: string) => void;
  onRefresh: () => void;
  onSearch: () => void;
  queryDraft: string;
  snapshotCount: number;
}): React.JSX.Element {
  return (
    <>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline' className='text-[10px]'>
            Snapshot: {props.snapshotCount.toLocaleString()}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Loaded: {props.loadedCount.toLocaleString()}
          </Badge>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={props.isLoading}
          onClick={props.onRefresh}
        >
          <RefreshCw className='mr-1.5 size-3.5' />
          Refresh
        </Button>
      </div>
      <form
        className='flex flex-wrap gap-2'
        onSubmit={(event: React.FormEvent<HTMLFormElement>): void => {
          event.preventDefault();
          props.onSearch();
        }}
      >
        <Input
          value={props.queryDraft}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            props.onQueryDraftChange(event.target.value);
          }}
          placeholder='Search contact logs'
          aria-label='Search contact logs'
          className='min-w-[220px] flex-1'
        />
        <Button type='submit' variant='outline' size='sm' disabled={props.isLoading}>
          <Search className='mr-1.5 size-3.5' />
          Search
        </Button>
      </form>
    </>
  );
}
