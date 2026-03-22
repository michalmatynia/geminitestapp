/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TreeSectionPicker } from '../TreeSectionPicker';

type MockBlockPickerProps = {
  sectionType: string;
  onSelect: (value: string) => void;
};

type MockSectionPickerProps = {
  disabled?: boolean;
  zone: string;
  onSelect: (value: string) => void;
};

const { addSectionMock } = vi.hoisted(() => ({
  addSectionMock: vi.fn(),
}));

let latestBlockPickerProps: MockBlockPickerProps | null = null;
let latestSectionPickerProps: MockSectionPickerProps | null = null;

vi.mock('@/features/cms/hooks/useTreeActionsContext', () => ({
  useTreeActions: () => ({
    sectionActions: {
      add: addSectionMock,
    },
  }),
}));

vi.mock('@/features/cms/components/page-builder/BlockPicker', () => ({
  BlockPicker: (props: MockBlockPickerProps) => {
    latestBlockPickerProps = props;

    return (
      <button type='button' onClick={() => props.onSelect('gallery')} data-testid='block-picker'>
        add-block
      </button>
    );
  },
}));

vi.mock('@/features/cms/components/page-builder/SectionPicker', () => ({
  SectionPicker: (props: MockSectionPickerProps) => {
    latestSectionPickerProps = props;

    return (
      <button type='button' onClick={() => props.onSelect('hero')} data-testid='section-picker'>
        add-section
      </button>
    );
  },
}));

describe('TreeSectionPicker', () => {
  beforeEach(() => {
    latestBlockPickerProps = null;
    latestSectionPickerProps = null;
    addSectionMock.mockReset();
  });

  it('renders the block picker directly for block variants', () => {
    const onSelect = vi.fn();

    render(
      <TreeSectionPicker
        variant='blocks'
        sectionType='grid'
        onSelect={onSelect}
      />
    );

    expect(latestBlockPickerProps).toMatchObject({
      sectionType: 'grid',
    });

    fireEvent.click(screen.getByTestId('block-picker'));

    expect(onSelect).toHaveBeenCalledWith('gallery');
  });

  it('uses tree section actions when the zone picker has no explicit onSelect handler', () => {
    render(<TreeSectionPicker zone={'main'} />);

    expect(latestSectionPickerProps).toMatchObject({
      disabled: undefined,
      zone: 'main',
    });

    fireEvent.click(screen.getByTestId('section-picker'));

    expect(addSectionMock).toHaveBeenCalledWith('hero', 'main');
  });
});
