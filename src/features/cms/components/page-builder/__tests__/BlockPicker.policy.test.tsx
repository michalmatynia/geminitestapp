/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BlockPicker } from '../BlockPicker';
import { PageBuilderPolicyProvider } from '../PageBuilderPolicyContext';

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => '[]',
  }),
}));

vi.mock('@/shared/ui/templates/pickers', () => ({
  GenericPickerDropdown: ({
    groups,
  }: {
    groups: Array<{ label: string; options: Array<{ key: string; label: string }> }>;
  }) => (
    <div>
      {groups.map((group) => (
        <div key={group.label}>
          {group.options.map((option) => (
            <span key={option.key}>{option.key}</span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

describe('BlockPicker policy filtering', () => {
  it('removes hidden 3D blocks from section block pickers', () => {
    render(
      <PageBuilderPolicyProvider value={{ hiddenBlockTypes: ['Model3D', 'Model3DElement'] }}>
        <BlockPicker sectionType='Block' onSelect={vi.fn()} />
      </PageBuilderPolicyProvider>
    );

    expect(screen.queryByText('Model3D')).not.toBeInTheDocument();
    expect(screen.queryByText('Model3DElement')).not.toBeInTheDocument();
    expect(screen.getByText('Heading')).toBeInTheDocument();
  });
});
