import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  CmsPageProvider,
  useCmsPageContext,
  useOptionalCmsPageContext,
} from './CmsPageContext';

function StrictConsumer(): React.JSX.Element {
  const context = useCmsPageContext();
  return <div>{String(context.layout.fullWidth)}</div>;
}

function OptionalConsumer(): React.JSX.Element {
  const context = useOptionalCmsPageContext();
  return <div>{context ? 'present' : 'none'}</div>;
}

describe('CmsPageContext', () => {
  it('throws outside provider for the strict hook', () => {
    expect(() => render(<StrictConsumer />)).toThrow(
      'useCmsPageContext must be used within a CmsPageProvider'
    );
  });

  it('returns null outside provider for the optional hook', () => {
    render(<OptionalConsumer />);
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('returns the provided page context inside provider', () => {
    render(
      <CmsPageProvider colorSchemes={{}} layout={{ fullWidth: true }}>
        <StrictConsumer />
      </CmsPageProvider>
    );

    expect(screen.getByText('true')).toBeInTheDocument();
  });
});
