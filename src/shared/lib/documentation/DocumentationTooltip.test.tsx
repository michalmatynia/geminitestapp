import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import { DocumentationTooltip } from '@/shared/lib/documentation/DocumentationTooltip';

const tooltipMock = vi.hoisted(() => vi.fn());
const getDocumentationTooltipMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/ui/primitives.public', () => ({
  Tooltip: (props: any) => tooltipMock(props),
}));
vi.mock('@/shared/lib/documentation/tooltips', () => ({
  getDocumentationTooltip: getDocumentationTooltipMock,
}));

describe('DocumentationTooltip', () => {
  beforeEach(() => {
    tooltipMock.mockReset();
    tooltipMock.mockImplementation(
      ({
        children,
        className,
        content,
        maxWidth,
        side,
      }: {
        children: React.ReactNode;
        className: string;
        content: string;
        maxWidth: string;
        side: string;
      }) => (
        <div
          data-testid='tooltip'
          data-class-name={className}
          data-content={content}
          data-max-width={maxWidth}
          data-side={side}
        >
          {children}
        </div>
      )
    );
    getDocumentationTooltipMock.mockReset();
  });

  it('returns children unchanged when disabled', () => {
    render(
      <DocumentationTooltip
        docId='products.sorting'
        enabled={false}
        moduleId={DOCUMENTATION_MODULE_IDS.products}
      >
        <span>Child content</span>
      </DocumentationTooltip>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
    expect(getDocumentationTooltipMock).not.toHaveBeenCalled();
  });

  it('returns children unchanged when tooltip content is missing', () => {
    getDocumentationTooltipMock.mockReturnValue(null);

    render(
      <DocumentationTooltip
        docId='products.sorting'
        enabled
        moduleId={DOCUMENTATION_MODULE_IDS.products}
      >
        <span>Child content</span>
      </DocumentationTooltip>
    );

    expect(getDocumentationTooltipMock).toHaveBeenCalledWith(
      DOCUMENTATION_MODULE_IDS.products,
      'products.sorting'
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
  });

  it('renders the shared Tooltip when documentation content is available', () => {
    getDocumentationTooltipMock.mockReturnValue('Sort products by price.');

    render(
      <DocumentationTooltip
        docId='products.sorting'
        enabled
        moduleId={DOCUMENTATION_MODULE_IDS.products}
        maxWidth='520px'
        side='right'
        wrapperClassName='doc-inline'
      >
        <span>Child content</span>
      </DocumentationTooltip>
    );

    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toHaveAttribute('data-content', 'Sort products by price.');
    expect(tooltip).toHaveAttribute('data-max-width', '520px');
    expect(tooltip).toHaveAttribute('data-side', 'right');
    expect(tooltip).toHaveAttribute('data-class-name', 'doc-inline');
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});
