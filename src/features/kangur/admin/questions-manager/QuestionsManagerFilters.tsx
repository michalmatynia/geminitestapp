import { KangurQuestionsFilterTriage } from '../components/KangurQuestionsFilterTriage';

export function QuestionsManagerFilters({ copy, searchQuery, setSearchQuery, sortMode, setSortMode, listFilter, setListFilter }: any) {
  return (
    <KangurQuestionsFilterTriage
      copy={copy.filters}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      sortMode={sortMode}
      onSortChange={setSortMode}
      listFilter={listFilter}
      onFilterChange={setListFilter}
      filterOptions={copy.filterOptions}
      sortOptions={copy.sortOptions}
    />
  );
}
