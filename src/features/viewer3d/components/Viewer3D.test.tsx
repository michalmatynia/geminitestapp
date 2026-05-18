// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const canvasEventSources = vi.hoisted(() => [] as Array<HTMLElement | undefined>);
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock('@react-three/fiber', async () => {
  const React = await import('react');

  return {
    Canvas: ({
      children,
      eventSource,
    }: {
      children: ReactNode;
      eventSource?: HTMLElement;
    }) => {
      canvasEventSources.push(eventSource);

      return React.createElement(
        'div',
        {
          'data-has-event-source': eventSource instanceof HTMLElement ? 'true' : 'false',
          'data-testid': 'r3f-canvas',
        },
        children
      );
    },
    useFrame: vi.fn(),
    useThree: () => ({
      gl: {
        domElement: {
          toDataURL: vi.fn(() => 'data:image/png;base64,test'),
        },
      },
    }),
  };
});

vi.mock('@react-three/drei', async () => {
  const React = await import('react');
  const passthrough = ({ children }: { children: ReactNode }) =>
    React.createElement('div', null, children);

  return {
    Bounds: passthrough,
    Center: passthrough,
    ContactShadows: () => React.createElement('div', { 'data-testid': 'contact-shadows' }),
    Environment: () => React.createElement('div', { 'data-testid': 'environment' }),
    Html: passthrough,
    OrbitControls: () => React.createElement('div', { 'data-testid': 'orbit-controls' }),
    PresentationControls: passthrough,
    useProgress: () => ({ progress: 0 }),
  };
});

vi.mock('@react-three/postprocessing', async () => {
  const React = await import('react');
  const passthrough = ({ children }: { children?: ReactNode }) =>
    React.createElement('div', null, children);

  return {
    Bloom: () => React.createElement('div'),
    EffectComposer: passthrough,
    SMAA: () => React.createElement('div'),
    ToneMapping: () => React.createElement('div'),
    Vignette: () => React.createElement('div'),
  };
});

vi.mock('postprocessing', () => ({
  BlendFunction: { NORMAL: 'normal' },
  ToneMappingMode: { ACES_FILMIC: 'aces-filmic' },
}));

vi.mock('./Model3D', async () => {
  const React = await import('react');

  return {
    Model3D: ({ url }: { url: string }) => {
      if (url.includes('throws')) {
        throw new Error('Model loader failed');
      }

      return React.createElement('div', { 'data-testid': 'model-3d' });
    },
  };
});

vi.mock('./shaders/DitheringEffect', async () => {
  const React = await import('react');

  return {
    DitheringPass: () => React.createElement('div'),
  };
});

vi.mock('./shaders/OrderedDitheringEffect', async () => {
  const React = await import('react');

  return {
    OrderedDitheringPass: () => React.createElement('div'),
  };
});

vi.mock('./shaders/PixelationEffect', async () => {
  const React = await import('react');

  return {
    PixelationPass: () => React.createElement('div'),
  };
});

import { Viewer3D } from './Viewer3D';

describe('Viewer3D', () => {
  beforeEach(() => {
    canvasEventSources.length = 0;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 200, statusText: 'OK' }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mounts the R3F canvas only after a concrete DOM event source is available', async () => {
    render(<Viewer3D modelUrl='/models/example.glb' className='h-64' />);

    expect(await screen.findByTestId('r3f-canvas')).toHaveAttribute(
      'data-has-event-source',
      'true'
    );
    expect(canvasEventSources).toHaveLength(1);
    expect(canvasEventSources[0]).toBeInstanceOf(HTMLElement);
    expect(fetchMock).toHaveBeenCalledWith(
      '/models/example.glb',
      expect.objectContaining({ method: 'HEAD' })
    );
  });

  it('does not mount the R3F canvas when the model URL is unavailable', async () => {
    const onError = vi.fn();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404, statusText: 'Not Found' }));

    render(<Viewer3D modelUrl='/models/missing.glb' className='h-64' onError={onError} />);

    expect(await screen.findByText('Failed to load 3D model')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Could not load /models/missing.glb: fetch responded with 404: Not Found'
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId('r3f-canvas')).not.toBeInTheDocument();
    expect(canvasEventSources).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Could not load /models/missing.glb: fetch responded with 404: Not Found',
      })
    );
  });

  it('contains model loader failures after a successful availability check', async () => {
    const onError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      render(<Viewer3D modelUrl='/models/throws.glb' className='h-64' onError={onError} />);

      expect(await screen.findByText('Failed to load 3D model')).toBeInTheDocument();
      expect(screen.getByText('Model loader failed')).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Model loader failed' })
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
