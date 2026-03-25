import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import { createDocsTooltipEnhancer } from '@/shared/lib/documentation/create-docs-tooltip-enhancer';

const documentationTooltipEnhancerMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/documentation/DocumentationTooltipEnhancer', () => ({
  DocumentationTooltipEnhancer: documentationTooltipEnhancerMock,
}));

describe('createDocsTooltipEnhancer', () => {
  beforeEach(() => {
    documentationTooltipEnhancerMock.mockReset();
    documentationTooltipEnhancerMock.mockImplementation(
      ({
        enabled,
        fallbackDocId,
        moduleId,
        rootId,
      }: {
        enabled: boolean;
        fallbackDocId?: string;
        moduleId: string;
        rootId: string;
      }) => (
        <div
          data-testid='documentation-tooltip-enhancer'
          data-enabled={enabled ? 'true' : 'false'}
          data-fallback-doc-id={fallbackDocId ?? ''}
          data-module-id={moduleId}
          data-root-id={rootId}
        />
      )
    );
  });

  it('creates an enhancer that forwards configured fallback docs', () => {
    const Enhancer = createDocsTooltipEnhancer({
      moduleId: DOCUMENTATION_MODULE_IDS.products,
      fallbackDocId: 'product-doc-1',
    });

    render(<Enhancer rootId='products-root' enabled />);

    const node = screen.getByTestId('documentation-tooltip-enhancer');
    expect(node).toHaveAttribute('data-enabled', 'true');
    expect(node).toHaveAttribute('data-module-id', DOCUMENTATION_MODULE_IDS.products);
    expect(node).toHaveAttribute('data-root-id', 'products-root');
    expect(node).toHaveAttribute('data-fallback-doc-id', 'product-doc-1');
  });

  it('creates an enhancer without fallback props when none are configured', () => {
    const Enhancer = createDocsTooltipEnhancer({
      moduleId: DOCUMENTATION_MODULE_IDS.notesapp,
    });

    render(<Enhancer rootId='notes-root' enabled={false} />);

    const node = screen.getByTestId('documentation-tooltip-enhancer');
    expect(node).toHaveAttribute('data-enabled', 'false');
    expect(node).toHaveAttribute('data-module-id', DOCUMENTATION_MODULE_IDS.notesapp);
    expect(node).toHaveAttribute('data-root-id', 'notes-root');
    expect(node).toHaveAttribute('data-fallback-doc-id', '');
  });
});
