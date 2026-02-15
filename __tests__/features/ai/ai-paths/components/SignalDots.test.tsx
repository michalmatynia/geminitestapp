import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { SignalDots } from '@/features/ai/ai-paths/components/SignalDots';

describe('SignalDots', () => {
  const defaultProps = {
    path: 'M 0 0 L 100 100',
    intensity: 'medium' as const,
  };

  it('should render a circle with correct attributes', () => {
    const { container } = render(
      <svg>
        <SignalDots {...defaultProps} />
      </svg>
    );

    const circle = container.querySelector('circle');
    expect(circle).toBeInTheDocument();
    expect(circle).toHaveAttribute('fill', 'rgb(56, 189, 248)');
    expect(circle).toHaveAttribute('r', '3'); // medium intensity radius
    expect(circle).toHaveAttribute('opacity', '0.8'); // medium intensity opacity
  });

  it('should apply different attributes based on intensity', () => {
    const { container: lowContainer } = render(
      <svg>
        <SignalDots {...defaultProps} intensity='low' />
      </svg>
    );
    const lowCircle = lowContainer.querySelector('circle');
    expect(lowCircle).toHaveAttribute('r', '2.5');
    expect(lowCircle).toHaveAttribute('opacity', '0.5');

    const { container: highContainer } = render(
      <svg>
        <SignalDots {...defaultProps} intensity='high' />
      </svg>
    );
    const highCircle = highContainer.querySelector('circle');
    expect(highCircle).toHaveAttribute('r', '3.5');
    expect(highCircle).toHaveAttribute('opacity', '1');
  });

  it('should render animateMotion with correct path and duration', () => {
    const { container } = render(
      <svg>
        <SignalDots {...defaultProps} />
      </svg>
    );

    const animateMotion = container.querySelector('animateMotion');
    expect(animateMotion).toBeInTheDocument();
    expect(animateMotion).toHaveAttribute('path', defaultProps.path);
    expect(animateMotion).toHaveAttribute('dur', '2s'); // medium intensity duration
    expect(animateMotion).toHaveAttribute('repeatCount', 'indefinite');
  });

  it('should allow custom color', () => {
    const customColor = 'rgb(255, 0, 0)';
    const { container } = render(
      <svg>
        <SignalDots {...defaultProps} color={customColor} />
      </svg>
    );

    const circle = container.querySelector('circle');
    expect(circle).toHaveAttribute('fill', customColor);
  });
});
