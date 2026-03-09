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

const dragHandToAngleWithTouch = (hand: Element, angleDeg: number): void => {
  const point = getClockPoint(angleDeg);
  act(() => {
    fireEvent.touchStart(hand, {
      touches: [{ clientX: CLOCK_CENTER, clientY: CLOCK_CENTER }],
    });
    fireEvent.touchMove(window, {
      cancelable: true,
      touches: [{ clientX: point.x, clientY: point.y }],
    });
    fireEvent.touchEnd(window);
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

  it('supports touch dragging on the clock hands without relying on page pan gestures', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    const clockSvg = container.querySelector('svg');
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);

    expect(clockSvg).not.toBeNull();
    expect(clockSvg).not.toHaveClass('touch-none');
    expect((hourHand as SVGElement).style.touchAction).toBe('none');
    expect((minuteHand as SVGElement).style.touchAction).toBe('none');

    dragHandToAngle(hourHand, 90);
    dragHandToAngleWithTouch(minuteHand, 180);

    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('3:30');
    });
  });

  it('uses 1-minute precision when exact mode is selected', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);
    const coarseSnapButton = screen.getByTestId('clock-snap-mode-5');
    const exactSnapButton = screen.getByTestId('clock-snap-mode-1');
    const taskLabel = screen.getByText('Ustaw zegar na godzinę');
    const clockDisplay = screen.getByTestId('clock-time-display');
    const snapModeSwitch = screen.getByTestId('clock-snap-mode-switch');
    const modeSwitch = screen.getByTestId('clock-mode-switch');

    expect(coarseSnapButton).toHaveClass('rounded-[18px]', 'text-indigo-700', 'ring-1');
    expect(exactSnapButton).toHaveClass('rounded-[18px]', 'text-slate-500');
    expect(clockDisplay).toHaveClass('border-indigo-200', 'bg-indigo-100');
    expect(snapModeSwitch).toHaveClass('rounded-[28px]', 'backdrop-blur-xl');
    expect(modeSwitch).toHaveClass('rounded-[28px]', 'backdrop-blur-xl');
    expect(screen.getByTestId('clock-hour-legend-dot')).toHaveClass('bg-rose-500');
    expect(screen.getByTestId('clock-minute-legend-dot')).toHaveClass('bg-emerald-500');
    expect(taskLabel).toHaveClass('border-amber-200', 'bg-amber-100');
    expect(screen.getByTestId('clock-task-prompt').parentElement).toHaveClass(
      'soft-card',
      'border-amber-300'
    );

    fireEvent.click(exactSnapButton);

    expect(coarseSnapButton).toHaveClass('text-slate-500');
    expect(exactSnapButton).toHaveClass('text-indigo-700', 'ring-1');
    dragHandToAngle(hourHand, 90);
    dragHandToAngle(minuteHand, 42);

    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('3:07');
    });
  });

  it('locks the minute hand in the hours section and shows section guidance', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} section='hours' />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);

    expect(screen.getByTestId('clock-training-section-badge')).toHaveTextContent('Sekcja: Godziny');
    expect(screen.getByTestId('clock-training-guidance-title')).toHaveTextContent(
      'Trening godzin'
    );
    expect(screen.getByText('Ustaw pełną godzinę')).toBeInTheDocument();
    expect(screen.queryByTestId('clock-snap-mode-switch')).toBeNull();
    expect(screen.getByTestId('clock-interaction-hint')).toHaveTextContent(
      'Długa wskazówka jest zablokowana na 12.'
    );

    dragHandToAngle(minuteHand, 180);
    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('12:00');
    });

    dragHandToAngle(hourHand, 90);
    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('3:00');
    });
  });

  it('locks the hour hand in the minutes section and keeps minute controls visible', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} section='minutes' />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);

    expect(screen.getByTestId('clock-training-section-badge')).toHaveTextContent('Sekcja: Minuty');
    expect(screen.getByTestId('clock-training-guidance-title')).toHaveTextContent(
      'Trening minut'
    );
    expect(screen.getByText('Ustaw minuty na tarczy')).toBeInTheDocument();
    expect(screen.getByTestId('clock-task-prompt')).toHaveTextContent(
      'Krótka wskazówka zostaje na 12'
    );
    expect(screen.getByTestId('clock-snap-mode-switch')).toBeInTheDocument();
    expect(screen.getByTestId('clock-interaction-hint')).toHaveTextContent(
      'Krótka wskazówka jest zablokowana na 12.'
    );

    dragHandToAngle(hourHand, 90);
    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('12:00');
    });

    dragHandToAngle(minuteHand, 180);
    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('12:30');
    });
  });

  it('shows minute-specific coaching after a near miss in the minutes section', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} section='minutes' />);
    const minuteHand = getMinuteHand(container);
    const taskLabel = screen.getByText('Ustaw minuty na tarczy');
    const taskValueText = taskLabel.nextElementSibling?.textContent ?? '12:05';
    const target = parseDisplayedTime(taskValueText);
    const nearMinutes = (target.minutes + 5) % 60;

    dragHandToAngle(minuteHand, minuteToAngle(nearMinutes));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    await waitFor(() => {
      expect(screen.getByTestId('clock-feedback')).toHaveTextContent(
        'Prawie! Minuty są blisko.'
      );
    });
    expect(screen.getByTestId('clock-feedback')).toHaveTextContent(
      'Przesuń ją jeszcze o jedną kreskę.'
    );
  });

  it('shows contextual detailed feedback after wrong submission', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);
    const taskLabel = screen.getByText('Ustaw zegar na godzinę');
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
    expect(screen.getByTestId('clock-feedback')).toHaveClass('soft-card', 'border-rose-300');
    expect(screen.getByTestId('clock-feedback')).toHaveTextContent('Poprawna:');
    expect(screen.getByTestId('clock-feedback')).toHaveTextContent('Różnica:');
  });

  it('shows adaptive retry notice after wrong submission', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);
    const taskLabel = screen.getByText('Ustaw zegar na godzinę');
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
    expect(screen.getByTestId('clock-retry-count')).toHaveClass('border-indigo-200', 'bg-indigo-100');
  });

  it('shows challenge timer and streak HUD after switching mode', async () => {
    render(<ClockTrainingGame onFinish={vi.fn()} />);
    expect(screen.queryByTestId('clock-challenge-ring')).toBeNull();

    fireEvent.click(screen.getByTestId('clock-mode-challenge'));

    await waitFor(() => {
      expect(screen.getByTestId('clock-challenge-timer')).toHaveTextContent(/s/);
    });
    expect(screen.getByTestId('clock-challenge-timer')).toHaveClass(
      'border-amber-200',
      'bg-amber-100'
    );
    expect(screen.getByTestId('clock-challenge-streak')).toHaveClass(
      'border-amber-200',
      'bg-amber-100'
    );
    expect(screen.getByTestId('clock-challenge-streak')).toHaveTextContent('Seria: 0');
    expect(screen.getByTestId('clock-challenge-ring')).toBeInTheDocument();
    expect(screen.getByTestId('clock-challenge-ring-track')).toBeInTheDocument();
  });

  it('does not add adaptive retry copy in challenge mode', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} />);
    fireEvent.click(screen.getByTestId('clock-mode-challenge'));

    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);
    const taskLabel = screen.getByText('Ustaw zegar na godzinę');
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
