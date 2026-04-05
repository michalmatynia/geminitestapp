import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  GenerationToolbarDefaultsSectionRuntimeProvider,
  useGenerationToolbarAutoScalerSectionRuntime,
  useGenerationToolbarCenterSectionRuntime,
  useGenerationToolbarCropSectionRuntime,
  useGenerationToolbarDefaultsSectionRuntime,
  useGenerationToolbarMaskSectionRuntime,
  useGenerationToolbarUpscaleSectionRuntime,
} from '../GenerationToolbarSectionContexts';

function DefaultsRuntimeConsumer(): React.JSX.Element {
  useGenerationToolbarDefaultsSectionRuntime();
  return <div>ok</div>;
}

function MaskRuntimeConsumer(): React.JSX.Element {
  useGenerationToolbarMaskSectionRuntime();
  return <div>ok</div>;
}

function CropRuntimeConsumer(): React.JSX.Element {
  useGenerationToolbarCropSectionRuntime();
  return <div>ok</div>;
}

function UpscaleRuntimeConsumer(): React.JSX.Element {
  useGenerationToolbarUpscaleSectionRuntime();
  return <div>ok</div>;
}

function CenterRuntimeConsumer(): React.JSX.Element {
  useGenerationToolbarCenterSectionRuntime();
  return <div>ok</div>;
}

function AutoScalerRuntimeConsumer(): React.JSX.Element {
  useGenerationToolbarAutoScalerSectionRuntime();
  return <div>ok</div>;
}

describe('GenerationToolbar section runtime contexts', () => {
  it('throws when defaults runtime context is missing', () => {
    expect(() => render(<DefaultsRuntimeConsumer />)).toThrow(
      'useGenerationToolbarDefaultsSectionRuntime must be used within its provider'
    );
  });

  it('throws when mask runtime context is missing', () => {
    expect(() => render(<MaskRuntimeConsumer />)).toThrow(
      'useGenerationToolbarMaskSectionRuntime must be used within its provider'
    );
  });

  it('throws when crop runtime context is missing', () => {
    expect(() => render(<CropRuntimeConsumer />)).toThrow(
      'useGenerationToolbarCropSectionRuntime must be used within its provider'
    );
  });

  it('throws when upscale runtime context is missing', () => {
    expect(() => render(<UpscaleRuntimeConsumer />)).toThrow(
      'useGenerationToolbarUpscaleSectionRuntime must be used within its provider'
    );
  });

  it('throws when center runtime context is missing', () => {
    expect(() => render(<CenterRuntimeConsumer />)).toThrow(
      'useGenerationToolbarCenterSectionRuntime must be used within its provider'
    );
  });

  it('throws when auto-scaler runtime context is missing', () => {
    expect(() => render(<AutoScalerRuntimeConsumer />)).toThrow(
      'useGenerationToolbarAutoScalerSectionRuntime must be used within its provider'
    );
  });

  it('provides defaults runtime through the shared provider path', () => {
    render(
      <GenerationToolbarDefaultsSectionRuntimeProvider
        value={{
          imageCount: '2',
          imageCountOptions: [{ label: 'Two', value: '2' }],
          model: 'gpt-image-1',
          onImageCountChange: () => {},
        }}
      >
        <DefaultsRuntimeConsumer />
      </GenerationToolbarDefaultsSectionRuntimeProvider>
    );

    expect(screen.getByText('ok')).toBeInTheDocument();
  });
});
