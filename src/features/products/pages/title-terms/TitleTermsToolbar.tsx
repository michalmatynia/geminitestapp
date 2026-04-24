import { Button } from '@/shared/ui/button';
import { SearchInput } from '@/shared/ui/search-input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Plus } from 'lucide-react';

export function TitleTermsToolbar({
  query, setQuery, catalogFilter, setCatalogFilter, typeFilter, setTypeFilter, catalogOptions, openCreate
}: any) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <div className='w-full max-w-sm'>
        <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery('')} placeholder='Search terms...' size='sm' />
      </div>
      <SelectSimple ariaLabel='Filter by catalog' size='sm' value={catalogFilter} onValueChange={setCatalogFilter} options={[{ label: 'All catalogs', value: 'all' }, ...catalogOptions]} />
      <SelectSimple ariaLabel='Filter by type' size='sm' value={typeFilter} onValueChange={setTypeFilter} options={[{ label: 'All types', value: 'all' }, { label: 'Size', value: 'size' }, { label: 'Material', value: 'material' }, { label: 'Theme', value: 'theme' }]} />
      <Button size='sm' variant='outline' onClick={openCreate}><Plus className='mr-1 size-4' /> Add Title Term</Button>
    </div>
  );
}
