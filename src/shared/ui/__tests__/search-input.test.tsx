/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchInput } from '@/shared/ui/search-input';

describe('SearchInput', () => {
  it('uses the placeholder as the accessible searchbox name and renders a clear action', () => {
    const onClear = vi.fn();
    const onChange = vi.fn();

    render(
      <SearchInput
        value='docs'
        onChange={onChange}
        onClear={onClear}
        placeholder='Search docs'
      />
    );

    expect(screen.getByRole('searchbox', { name: 'Search docs' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('uses aria-labelledby on the search container when provided', () => {
    const onChange = vi.fn();

    render(
      <>
        <h2 id='search-label'>Filter items</h2>
        <SearchInput
          value=''
          onChange={onChange}
          aria-labelledby='search-label'
          placeholder='Search items'
        />
      </>
    );

    expect(screen.getByRole('search', { name: 'Filter items' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });
});
