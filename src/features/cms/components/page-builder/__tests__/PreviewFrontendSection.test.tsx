/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PreviewFrontendSection } from '../PreviewFrontendSection';

type MockSectionRendererProps = {
  type: string;
  sectionId: string;
  settings: Record<string, unknown>;
  blocks: Array<{ id: string }>;
};

let latestSectionRendererProps: MockSectionRendererProps | null = null;

vi.mock('@/features/cms/components/frontend/CmsPageRenderer', () => ({
  SectionRenderer: (props: MockSectionRendererProps) => {
    latestSectionRendererProps = props;

    return <div data-testid='mock-section-renderer'>{props.type}</div>;
  },
}));

describe('PreviewFrontendSection', () => {
  beforeEach(() => {
    latestSectionRendererProps = null;
  });

  it('passes section props directly into the storefront section renderer', () => {
    const settings = { headline: 'Hello world' };
    const blocks = [{ id: 'block-1' }, { id: 'block-2' }] as Array<{ id: string }>;

    render(
      <PreviewFrontendSection
        type='Accordion'
        sectionId='section-1'
        settings={settings}
        blocks={blocks as never}
      />
    );

    expect(screen.getByTestId('mock-section-renderer')).toHaveTextContent('Accordion');
    expect(latestSectionRendererProps).toMatchObject({
      type: 'Accordion',
      sectionId: 'section-1',
      settings,
      blocks,
    });
  });
});
