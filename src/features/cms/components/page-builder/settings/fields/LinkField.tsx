'use client';

import React, { useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { SelectModal, type SelectOption } from '@/shared/ui/templates/modals/SelectModal';
import { useCmsSlugs } from '../../../../hooks/useCmsQueries';

export function LinkField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): React.ReactNode {
  const [open, setOpen] = useState(false);
  const { data: slugs = [] } = useCmsSlugs();

  const options = useMemo<SelectOption<string>[]>(
    () =>
      slugs.map((s) => ({
        id: s.id,
        label: `/${s.slug}`,
        value: `/${s.slug}`,
      })),
    [slugs]
  );

  return (
    <div className='flex gap-2'>
      <Input
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder='URL or pick a slug...'
        className='h-8 text-xs'
      />
      <Button
        size='icon'
        variant='outline'
        className='h-8 w-8 shrink-0'
        onClick={() => setOpen(true)}
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
