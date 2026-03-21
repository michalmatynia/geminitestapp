/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@/__tests__/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { parseKangurCmsProject } from '@/features/kangur/cms-builder/project';

import {
  KangurCmsBuilderRuntimeProvider,
  useKangurCmsBuilderRuntime,
} from './KangurCmsBuilderRuntimeContext';

const project = parseKangurCmsProject(null, { fallbackToDefault: true });

function RuntimeConsumer() {
  const { activeScreenKey, draftProject, isSaving, onSave, onSwitchScreen } =
    useKangurCmsBuilderRuntime();

  return (
    <div>
      <div data-testid='active-screen'>{activeScreenKey}</div>
      <div data-testid='screen-name'>{draftProject.screens[activeScreenKey].name}</div>
      <div data-testid='saving-state'>{isSaving ? 'saving' : 'idle'}</div>
      <button type='button' onClick={() => onSwitchScreen('Lessons', [])}>
        Switch
      </button>
      <button
        type='button'
        onClick={() => {
          void onSave([]);
        }}
      >
        Save
      </button>
    </div>
  );
}

describe('KangurCmsBuilderRuntimeContext', () => {
  it('provides builder runtime values and actions', () => {
    if (!project) {
      throw new Error('Expected default Kangur CMS project');
    }

    const onSwitchScreen = vi.fn();
    const onSave = vi.fn(async () => {});

    render(
      <KangurCmsBuilderRuntimeProvider
        draftProject={project}
        savedProject={project}
        activeScreenKey='Game'
        onSwitchScreen={onSwitchScreen}
        onSave={onSave}
        isSaving={true}
      >
        <RuntimeConsumer />
      </KangurCmsBuilderRuntimeProvider>
    );

    expect(screen.getByTestId('active-screen')).toHaveTextContent('Game');
    expect(screen.getByTestId('screen-name')).toHaveTextContent(project.screens.Game.name);
    expect(screen.getByTestId('saving-state')).toHaveTextContent('saving');

    fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSwitchScreen).toHaveBeenCalledWith('Lessons', []);
    expect(onSave).toHaveBeenCalledWith([]);
  });

  it('throws when used without a provider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<RuntimeConsumer />)).toThrow(
      'useKangurCmsBuilderRuntime must be used within a KangurCmsBuilderRuntimeProvider'
    );

    consoleErrorSpy.mockRestore();
  });
});
