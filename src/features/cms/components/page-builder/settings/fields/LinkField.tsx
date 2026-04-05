'use client';

import { Link2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { useCmsSlugs } from '@/features/cms/hooks/useCmsQueries';
import type { SelectOption } from '@/shared/contracts/ui/pickers';
import { Button, Input } from '@/shared/ui/primitives.public';
import { SelectModal } from '@/shared/ui/templates/modals/SelectModal';

export function LinkField(props: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
  id?: string;
}): React.ReactNode {
  const { value, onChange, ariaLabel = 'Link', id } = props;

  const [open, setOpen] = useState(false);
  const { data: slugs = [] } = useCmsSlugs();

  const options = useMemo<SelectOption<string>[]>(
    () =>
      slugs.map((s: string) => ({
        id: s.id,
        label: `/${s.slug}`,
        value: `/${s.slug}`,
      })),
    [slugs]
  );

  return (
    <div className='flex gap-2'>
      <Input
        id={id}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder='URL or pick a slug...'
        className='h-8 text-xs'
        aria-label={ariaLabel}
       title='URL or pick a slug...'/>
      <Button
        size='icon'
        variant='outline'
        className='h-8 w-8 shrink-0'
        onClick={() => setOpen(true)}
        aria-label={`Select ${ariaLabel.toLowerCase()} from page slug`}
        title='Select page link'
      >
        <Link2 className='size-3.5' />
      </Button>
      <SelectModal
        open={open}
        onClose={() => setOpen(false)}
        title='Select Page Link'
        subtitle='Choose a page slug to link to.'
        options={options}
        onSelect={(selected) => {
          if (Array.isArray(selected)) return;
          onChange(selected.value);
        }}
        size='sm'
      />
    </div>
  );
}
