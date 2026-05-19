import { Plus } from 'lucide-react';
import type { ChangeEvent, JSX } from 'react';

import { Button } from '@/shared/ui/button';
import { SearchInput } from '@/shared/ui/search-input';
import { SelectSimple } from '@/shared/ui/select-simple';

interface TitleTermsToolbarProps {
  query: string;
  setQuery: (query: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  openCreate: () => void;
}

export function TitleTermsToolbar({
  query,
  setQuery,
  typeFilter,
  setTypeFilter,
  openCreate,
}: TitleTermsToolbarProps): JSX.Element {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setQuery(event.target.value);
  };

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <div className='w-full max-w-sm'>
        <SearchInput
          value={query}
          onChange={handleSearchChange}
          onClear={() => setQuery('')}
          placeholder='Search terms...'
          size='sm'
        />
      </div>
      <SelectSimple
        ariaLabel='Filter by type'
        size='sm'
        value={typeFilter}
        onValueChange={setTypeFilter}
        options={[
          { label: 'All types', value: 'all' },
          { label: 'Size', value: 'size' },
          { label: 'Material', value: 'material' },
          { label: 'Theme', value: 'theme' },
        ]}
      />
      <Button size='sm' variant='outline' onClick={openCreate}>
        <Plus className='mr-1 size-4' /> Add Title Term
      </Button>
    </div>
  );
}
