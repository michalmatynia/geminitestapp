import type { ChangeEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { SearchInput } from '@/shared/ui/search-input';
import { Plus } from 'lucide-react';

type ProducersToolbarProps = {
  query: string;
  setQuery: (query: string) => void;
  openCreate: () => void;
};

export function ProducersToolbar({
  query,
  setQuery,
  openCreate,
}: ProducersToolbarProps): React.JSX.Element {
  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setQuery(event.target.value);
  };

  return (
    <div className='flex items-center justify-between gap-4 py-4'>
      <div className='max-w-sm w-full'>
        <SearchInput
          value={query}
          onChange={handleQueryChange}
          onClear={() => setQuery('')}
          placeholder='Search by name...'
          size='sm'
        />
      </div>
      <Button type='button' size='sm' variant='outline' onClick={openCreate}>
        <Plus className='size-4 mr-1' /> Add Producer
      </Button>
    </div>
  );
}
