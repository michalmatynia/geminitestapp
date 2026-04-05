import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  usePromptEngineActions,
  usePromptEngineConfig,
  usePromptEngineData,
  usePromptEngineFilters,
} from './PromptEngineContext';

function ActionsConsumer(): React.JSX.Element {
  usePromptEngineActions();
  return <div>actions</div>;
}

function ConfigConsumer(): React.JSX.Element {
  usePromptEngineConfig();
  return <div>config</div>;
}

function DataConsumer(): React.JSX.Element {
  usePromptEngineData();
  return <div>data</div>;
}

function FiltersConsumer(): React.JSX.Element {
  usePromptEngineFilters();
  return <div>filters</div>;
}

describe('PromptEngineContext', () => {
  it('throws clear errors outside provider', () => {
    expect(() => render(<ActionsConsumer />)).toThrow(
      'usePromptEngineActions must be used within a PromptEngineProvider'
    );
    expect(() => render(<ConfigConsumer />)).toThrow(
      'usePromptEngineConfig must be used within a PromptEngineProvider'
    );
    expect(() => render(<DataConsumer />)).toThrow(
      'usePromptEngineData must be used within a PromptEngineProvider'
    );
    expect(() => render(<FiltersConsumer />)).toThrow(
      'usePromptEngineFilters must be used within a PromptEngineProvider'
    );
  });
});
