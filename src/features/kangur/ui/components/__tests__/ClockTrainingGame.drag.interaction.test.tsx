import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import ClockTrainingGame from '../ClockTrainingGame';

const CLOCK_SIZE = 220;
const CLOCK_CENTER = CLOCK_SIZE / 2;
const DRAG_RADIUS = 95;

const getClockPoint = (angleDeg: number): { x: number; y: number } => {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CLOCK_CENTER + DRAG_RADIUS * Math.cos(radians),
    y: CLOCK_CENTER + DRAG_RADIUS * Math.sin(radians),
  };
};

const getClockDisplay = (): HTMLElement => {
  const display = screen.queryByTestId('clock-time-display');
  if (!(display instanceof HTMLElement)) {
    throw new Error('Clock display not found.');
  }
  return display;
};

const getHourHand = (container: HTMLElement): Element => {
  const hand = container.querySelector('[data-testid="clock-hour-hand"]');
  if (!hand || hand.tagName.toLowerCase() !== 'line') {
    throw new Error('Hour hand not found.');
  }
  return hand;
};

const getMinuteHand = (container: HTMLElement): Element => {
  const hand = container.querySelector('[data-testid="clock-minute-hand"]');
  if (!hand || hand.tagName.toLowerCase() !== 'line') {
    throw new Error('Minute hand not found.');
  }
  return hand;
};

const dragHandToAngle = (hand: Element, angleDeg: number): void => {
  const point = getClockPoint(angleDeg);
  act(() => {
    fireEvent.mouseDown(hand, {
      clientX: CLOCK_CENTER,
      clientY: CLOCK_CENTER,
    });
    fireEvent.mouseMove(window, {
      clientX: point.x,
      clientY: point.y,
    });
    fireEvent.mouseUp(window);
  });
};

const parseDisplayedTime = (value: string): { hours: number; minutes: number } => {
  const [rawHours, rawMinutes] = value.trim().split(':');
  const hours = Number.parseInt(rawHours ?? '0', 10);
  const minutes = Number.parseInt(rawMinutes ?? '0', 10);
  return { hours, minutes };
};

const hourToAngle = (hours: number): number => (hours % 12) * 30;
const minuteToAngle = (minutes: number): number => minutes * 6;

describe('ClockTrainingGame drag interactions', () => {
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  beforeAll(() => {
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: CLOCK_SIZE,
      height: CLOCK_SIZE,
      top: 0,
      left: 0,
      bottom: CLOCK_SIZE,
      right: CLOCK_SIZE,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
  });

  afterAll(() => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('moves the hour hand when minute hand is dragged', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);

    dragHandToAngle(hourHand, 90);

    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('3:00');
    });

    const hourYBefore = Number.parseFloat(getHourHand(container).getAttribute('y2') ?? '0');
    dragHandToAngle(minuteHand, 180);

    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('3:30');
    });

    const hourYAfter = Number.parseFloat(getHourHand(container).getAttribute('y2') ?? '0');
    expect(hourYAfter).toBeGreaterThan(hourYBefore + 5);
  });

  it('rolls hour forward when minute hand crosses 12 clockwise', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);

    dragHandToAngle(hourHand, 240);
    dragHandToAngle(minuteHand, 330);

    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('7:55');
    });

    dragHandToAngle(minuteHand, 0);

    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('8:00');
    });
  });

  it('keeps minutes while dragging the hour hand', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);

    dragHandToAngle(hourHand, 90);
    dragHandToAngle(minuteHand, 180);

    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('3:30');
    });

    dragHandToAngle(hourHand, 150);

    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('5:30');
    });
  });

  it('uses 1-minute precision when exact mode is selected', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);
    const coarseSnapButton = screen.getByTestId('clock-snap-mode-5');
    const exactSnapButton = screen.getByTestId('clock-snap-mode-1');
    const activeProgress = screen.getByTestId('clock-training-progress-0');
    const pendingProgress = screen.getByTestId('clock-training-progress-1');

    expect(coarseSnapButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(exactSnapButton).toHaveClass('kangur-cta-pill', 'soft-cta');
    expect(activeProgress).toHaveClass('rounded-full', 'bg-indigo-500');
    expect(pendingProgress).toHaveClass('soft-cta');

    fireEvent.click(exactSnapButton);

    expect(coarseSnapButton).toHaveClass('kangur-cta-pill', 'soft-cta');
    expect(exactSnapButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    dragHandToAngle(hourHand, 90);
    dragHandToAngle(minuteHand, 42);

    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('3:07');
    });
  });

  it('shows contextual detailed feedback after wrong submission', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);
    const taskLabel = screen.getByText('Ustaw zegar na godzinę:');
    const taskValueText = taskLabel.nextElementSibling?.textContent ?? '12:00';
    const target = parseDisplayedTime(taskValueText);
    const nearMinutes = (target.minutes + 55) % 60;
    const nearHours =
      target.minutes >= 5 ? target.hours : target.hours === 1 ? 12 : target.hours - 1;

    dragHandToAngle(hourHand, hourToAngle(nearHours));
    dragHandToAngle(minuteHand, minuteToAngle(nearMinutes));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-feedback')).toHaveTextContent('Twoja odpowiedź:');
    });
    expect(screen.getByTestId('clock-feedback')).toHaveTextContent('Poprawna:');
    expect(screen.getByTestId('clock-feedback')).toHaveTextContent('Różnica:');
  });

  it('shows adaptive retry notice after wrong submission', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);
    const taskLabel = screen.getByText('Ustaw zegar na godzinę:');
    const taskValueText = taskLabel.nextElementSibling?.textContent ?? '12:00';
    const target = parseDisplayedTime(taskValueText);
    const nearMinutes = (target.minutes + 55) % 60;
    const nearHours =
      target.minutes >= 5 ? target.hours : target.hours === 1 ? 12 : target.hours - 1;

    dragHandToAngle(hourHand, hourToAngle(nearHours));
    dragHandToAngle(minuteHand, minuteToAngle(nearMinutes));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-feedback')).toHaveTextContent(
        'Dodaliśmy krótką powtórkę tego zadania.'
      );
    });
  });

  it('shows challenge timer and streak HUD after switching mode', async () => {
    render(<ClockTrainingGame onFinish={vi.fn()} />);
    expect(screen.queryByTestId('clock-challenge-ring')).toBeNull();

    fireEvent.click(screen.getByTestId('clock-mode-challenge'));

    await waitFor(() => {
      expect(screen.getByTestId('clock-challenge-timer')).toHaveTextContent(/s/);
    });
    expect(screen.getByTestId('clock-challenge-streak')).toHaveTextContent('Seria: 0');
    expect(screen.getByTestId('clock-challenge-ring')).toBeInTheDocument();
    expect(screen.getByTestId('clock-challenge-ring-track')).toBeInTheDocument();
  });

  it('does not add adaptive retry copy in challenge mode', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    fireEvent.click(screen.getByTestId('clock-mode-challenge'));

    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);
    const taskLabel = screen.getByText('Ustaw zegar na godzinę:');
    const taskValueText = taskLabel.nextElementSibling?.textContent ?? '12:00';
    const target = parseDisplayedTime(taskValueText);
    const nearMinutes = (target.minutes + 55) % 60;
    const nearHours =
      target.minutes >= 5 ? target.hours : target.hours === 1 ? 12 : target.hours - 1;

    dragHandToAngle(hourHand, hourToAngle(nearHours));
    dragHandToAngle(minuteHand, minuteToAngle(nearMinutes));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-feedback')).toHaveTextContent('Poprawna:');
    });
    expect(screen.getByTestId('clock-feedback')).not.toHaveTextContent(
      'Dodaliśmy krótką powtórkę tego zadania.'
    );
  });
});
