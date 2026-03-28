import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  useBrainRoutingActionsContext,
  useBrainRoutingStateContext,
} from '../components/BrainRoutingContext';

function BrainRoutingStateConsumer(): React.JSX.Element {
  useBrainRoutingStateContext();
  return <div>ok</div>;
}

function BrainRoutingActionsConsumer(): React.JSX.Element {
  useBrainRoutingActionsContext();
  return <div>ok</div>;
}

describe('BrainRoutingContext', () => {
  it('throws when BrainRouting state context is missing', () => {
    expect(() => render(<BrainRoutingStateConsumer />)).toThrow(
      'useBrainRoutingStateContext must be used within BrainRoutingProvider'
    );
  });

  it('throws when BrainRouting actions context is missing', () => {
    expect(() => render(<BrainRoutingActionsConsumer />)).toThrow(
      'useBrainRoutingActionsContext must be used within BrainRoutingProvider'
    );
  });
});
