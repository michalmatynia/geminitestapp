import { act, fireEvent, render, screen, waitFor } from '../../../../../../__tests__/test-utils';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { KANGUR_CLOCK_THEME_COLORS } from '../clock-theme';

const { persistKangurSessionScoreMock, mobileInteractionLockMock, mobileInteractionUnlockMock } =
  vi.hoisted(() => ({
  persistKangurSessionScoreMock: vi.fn(),
  mobileInteractionLockMock: vi.fn(),
  mobileInteractionUnlockMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/services/session-score', () => ({
  persistKangurSessionScore: (...args: unknown[]) => persistKangurSessionScoreMock(...args),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileInteractionScrollLock', () => ({
  useKangurMobileInteractionScrollLock: () => ({
    lock: mobileInteractionLockMock,
    unlock: mobileInteractionUnlockMock,
  }),
}));

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

const expectClockStyleAttributeToContain = (element: HTMLElement, declaration: string): void => {
  expect(element.getAttribute('style') ?? '').toContain(declaration);
};

const expectClockSubmitButtonFeedbackStyle = ({
  button,
  kind,
}: {
  button: HTMLElement;
  kind: 'correct' | 'wrong';
}): void => {
  const backgroundColor =
    kind === 'correct'
      ? KANGUR_CLOCK_THEME_COLORS.feedbackCorrectBackground
      : KANGUR_CLOCK_THEME_COLORS.feedbackWrongBackground;
  const borderColor =
    kind === 'correct'
      ? KANGUR_CLOCK_THEME_COLORS.feedbackCorrectBorder
      : KANGUR_CLOCK_THEME_COLORS.feedbackWrongBorder;

  expectClockStyleAttributeToContain(button, `background-color: ${backgroundColor};`);
  expectClockStyleAttributeToContain(button, `border-color: ${borderColor};`);
  expectClockStyleAttributeToContain(
    button,
    `color: ${KANGUR_CLOCK_THEME_COLORS.contrastText};`
  );
};

const getHourHand = (container: HTMLElement): Element => {
  const hand = container.querySelector('[data-testid="clock-hour-hand"]');
  if (hand?.tagName.toLowerCase() !== 'line') {
    throw new Error('Hour hand not found.');
  }
  return hand;
};

const getMinuteHand = (container: HTMLElement): Element => {
  const hand = container.querySelector('[data-testid="clock-minute-hand"]');
  if (hand?.tagName.toLowerCase() !== 'line') {
    throw new Error('Minute hand not found.');
  }
  return hand;
};

const dragHandToAngle = (hand: Element, angleDeg: number): void => {
  const point = getClockPoint(angleDeg);
  act(() => {
    fireEvent.pointerDown(hand, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: CLOCK_CENTER,
      clientY: CLOCK_CENTER,
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: point.x,
      clientY: point.y,
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      pointerType: 'mouse',
    });
  });
};

const dragHandToAngleWithTouch = (hand: Element, angleDeg: number): void => {
  const point = getClockPoint(angleDeg);
  act(() => {
    fireEvent.pointerDown(hand, {
      pointerId: 7,
      pointerType: 'touch',
      clientX: CLOCK_CENTER,
      clientY: CLOCK_CENTER,
    });
    fireEvent.pointerMove(window, {
      pointerId: 7,
      pointerType: 'touch',
      cancelable: true,
      clientX: point.x,
      clientY: point.y,
    });
    fireEvent.pointerUp(window, {
      pointerId: 7,
      pointerType: 'touch',
    });
  });
};

const parseDisplayedTime = (value: string): { hours: number; minutes: number } => {
  const [rawHours, rawMinutes] = value.trim().split(':');
  const hours = Number.parseInt(rawHours ?? '0', 10);
  const minutes = Number.parseInt(rawMinutes ?? '0', 10);
  return { hours, minutes };
};

const getByExactTextContent = (expected: string[]): HTMLElement =>
  screen.getByText((content) => expected.includes(content));

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

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mobileInteractionLockMock.mockClear();
    mobileInteractionUnlockMock.mockClear();
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
    expect((clockSvg as SVGSVGElement).style.touchAction).toBe('none');
    expect((hourHand as SVGElement).style.touchAction).toBe('none');
    expect((minuteHand as SVGElement).style.touchAction).toBe('none');

    dragHandToAngle(hourHand, 90);
    dragHandToAngleWithTouch(minuteHand, 180);

    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('3:30');
    });

    expect(mobileInteractionLockMock).toHaveBeenCalled();
    expect(mobileInteractionUnlockMock).toHaveBeenCalled();
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

    expect(coarseSnapButton).toHaveClass(
      'kangur-segmented-control-item',
      'kangur-segmented-control-item-active',
      'rounded-[18px]'
    );
    expect(exactSnapButton).toHaveClass('kangur-segmented-control-item', 'rounded-[18px]');
    expect(exactSnapButton).not.toHaveClass('kangur-segmented-control-item-active');
    expect(clockDisplay).toHaveClass('rounded-full', 'border');
    expect(snapModeSwitch).toHaveClass('kangur-segmented-control', 'rounded-[28px]', 'border');
    expect(modeSwitch).toHaveClass('kangur-segmented-control', 'rounded-[28px]', 'border');
    expect(screen.getByTestId('clock-hour-legend-dot')).toHaveAttribute(
      'style',
      expect.stringContaining(`background-color: ${KANGUR_CLOCK_THEME_COLORS.interactiveHourHand}`)
    );
    expect(screen.getByTestId('clock-minute-legend-dot')).toHaveAttribute(
      'style',
      expect.stringContaining(
        `background-color: ${KANGUR_CLOCK_THEME_COLORS.interactiveMinuteHand}`
      )
    );
    expect(taskLabel).toHaveClass('rounded-full', 'border');
    expect(screen.getByTestId('clock-task-prompt').parentElement).toHaveClass(
      'soft-card'
    );
    expect(screen.getByTestId('clock-task-prompt')).toHaveAttribute(
      'style',
      expect.stringContaining(`color: ${KANGUR_CLOCK_THEME_COLORS.promptText}`)
    );

    fireEvent.click(exactSnapButton);

    expect(coarseSnapButton).not.toHaveClass('kangur-segmented-control-item-active');
    expect(exactSnapButton).toHaveClass('kangur-segmented-control-item-active');
    dragHandToAngle(hourHand, 90);
    dragHandToAngle(minuteHand, 42);

    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('3:07');
    });
  });

  it('locks the minute hand in the hours section and hides section guidance', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} section='hours' />);
    const hourHand = getHourHand(container);
    const minuteHand = getMinuteHand(container);

    expect(screen.queryByTestId('clock-training-section-badge')).toBeNull();
    expect(screen.queryByTestId('clock-training-guidance')).toBeNull();
    expect(screen.queryByTestId('clock-training-guidance-title')).toBeNull();
    expect(screen.getByText('Ustaw pełną godzinę')).toBeInTheDocument();
    expect(screen.queryByTestId('clock-snap-mode-switch')).toBeNull();
    expect(screen.queryByTestId('clock-interaction-hint')).toBeNull();
    const face = container.querySelector('circle[r="95"]');
    expect(face).not.toBeNull();
    expect(face?.getAttribute('fill')).toContain('var(--kangur-soft-card-background');

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

    expect(screen.queryByTestId('clock-training-section-badge')).toBeNull();
    expect(screen.queryByTestId('clock-training-guidance')).toBeNull();
    expect(screen.queryByTestId('clock-training-guidance-title')).toBeNull();
    expect(screen.getByText('Ustaw minuty na tarczy')).toBeInTheDocument();
    expect(screen.getByTestId('clock-task-prompt')).toHaveTextContent(
      'Krótka wskazówka zostaje na 12'
    );
    expect(screen.getByTestId('clock-snap-mode-switch')).toBeInTheDocument();
    expect(screen.queryByTestId('clock-interaction-hint')).toBeNull();

    dragHandToAngle(hourHand, 90);
    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('12:00');
    });

    dragHandToAngle(minuteHand, 180);
    await waitFor(() => {
      expect(getClockDisplay()).toHaveTextContent('12:30');
    });
  });

  it('turns Sprawdź red after a near miss in the minutes section', async () => {
    const { container } = render(<ClockTrainingGame onFinish={vi.fn()} section='minutes' />);
    const minuteHand = getMinuteHand(container);
    const taskLabel = screen.getByText('Ustaw minuty na tarczy');
    const taskValueText = taskLabel.nextElementSibling?.textContent ?? '12:05';
    const target = parseDisplayedTime(taskValueText);
    const nearMinutes = (target.minutes + 5) % 60;

    dragHandToAngle(minuteHand, minuteToAngle(nearMinutes));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    await waitFor(() => {
      expectClockSubmitButtonFeedbackStyle({
        button: screen.getByTestId('clock-submit-button'),
        kind: 'wrong',
      });
    });
  });

  it('turns Sprawdź red after a wrong submission', async () => {
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
      expectClockSubmitButtonFeedbackStyle({
        button: screen.getByTestId('clock-submit-button'),
        kind: 'wrong',
      });
    });
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
      expect(screen.getByTestId('clock-retry-count')).toBeInTheDocument();
    });
    expect(screen.getByTestId('clock-retry-count')).toHaveClass('rounded-full', 'border');
  });

  it('persists a completed clock training session into learner history', async () => {
    vi.useFakeTimers();

    render(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[{ hours: 12, minutes: 0 }]}
        section='hours'
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByTestId('clock-training-summary-shell')).toBeInTheDocument();

    expect(persistKangurSessionScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'clock',
        score: 1,
        totalQuestions: 1,
        correctAnswers: 1,
      })
    );
  });

  it('shows challenge timer and series progress HUD after switching mode', async () => {
    render(<ClockTrainingGame onFinish={vi.fn()} />);
    expect(screen.queryByTestId('clock-challenge-ring')).toBeNull();

    fireEvent.click(screen.getByTestId('clock-mode-challenge'));

    await waitFor(() => {
      expect(screen.getByTestId('clock-challenge-timer')).toHaveTextContent(/s/);
    });
    expect(screen.getByTestId('clock-challenge-timer')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('clock-challenge-streak')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('clock-challenge-streak')).toHaveTextContent('Seria 1/5');
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
      expectClockSubmitButtonFeedbackStyle({
        button: screen.getByTestId('clock-submit-button'),
        kind: 'wrong',
      });
    });
    expect(screen.queryByTestId('clock-retry-count')).toBeNull();
  });

  it('calls onPracticeSuccess after a correct solve in practice mode', async () => {
    const onPracticeSuccess = vi.fn();
    const { container } = render(
      <ClockTrainingGame onFinish={vi.fn()} onPracticeSuccess={onPracticeSuccess} section='hours' />
    );
    const hourHand = getHourHand(container);
    const taskLabel = screen.getByText('Ustaw pełną godzinę');
    const taskValueText = taskLabel.nextElementSibling?.textContent ?? '12:00';
    const target = parseDisplayedTime(taskValueText);

    dragHandToAngle(hourHand, hourToAngle(target.hours));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    await waitFor(() => {
      expectClockSubmitButtonFeedbackStyle({
        button: screen.getByTestId('clock-submit-button'),
        kind: 'correct',
      });
    });

    expect(onPracticeSuccess).toHaveBeenCalledTimes(1);
  });

  it('turns Sprawdź green and advances to the next hours task in the series', async () => {
    vi.useFakeTimers();

    const { container } = render(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[
          { hours: 3, minutes: 0 },
          { hours: 7, minutes: 0 },
        ]}
        section='hours'
      />
    );
    const hourHand = getHourHand(container);

    expect(screen.getByTestId('clock-task-progress-label')).toHaveTextContent('Zadanie 1 z 2');
    expect(screen.getByTestId('clock-task-progress-label')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByTestId('clock-task-progress-pill-0')).toHaveStyle({
      backgroundColor: KANGUR_CLOCK_THEME_COLORS.progressPracticeActive,
    });
    expect(screen.getByTestId('clock-task-progress-pill-1')).toHaveClass(
      'kangur-step-pill-pending'
    );

    dragHandToAngle(hourHand, hourToAngle(3));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    expectClockSubmitButtonFeedbackStyle({
      button: screen.getByRole('button', { name: 'Dobrze! ✅' }),
      kind: 'correct',
    });
    expect(screen.getByTestId('clock-submit-feedback')).toHaveTextContent(
      'Brawo! To dobra godzina!'
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    const taskLabel = screen.getByText('Ustaw pełną godzinę');
    expect(taskLabel.nextElementSibling).toHaveTextContent('7:00');
    expect(screen.queryByTestId('clock-submit-feedback')).toBeNull();
    expect(screen.getByTestId('clock-task-progress-label')).toHaveTextContent('Zadanie 2 z 2');
    expect(screen.getByTestId('clock-task-progress-pill-0')).toHaveStyle({
      backgroundColor: KANGUR_CLOCK_THEME_COLORS.progressPracticeDone,
    });
    expect(screen.getByTestId('clock-task-progress-pill-1')).toHaveStyle({
      backgroundColor: KANGUR_CLOCK_THEME_COLORS.progressPracticeActive,
    });
  });

  it('turns Sprawdź red and still advances to the next hours task in the series', async () => {
    vi.useFakeTimers();

    const { container } = render(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[
          { hours: 3, minutes: 0 },
          { hours: 7, minutes: 0 },
        ]}
        section='hours'
      />
    );
    const hourHand = getHourHand(container);

    dragHandToAngle(hourHand, hourToAngle(4));

    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    expectClockSubmitButtonFeedbackStyle({
      button: screen.getByRole('button', { name: 'Błąd! ❌' }),
      kind: 'wrong',
    });
    expect(screen.getByTestId('clock-submit-feedback')).toHaveTextContent(
      'Prawie! To sąsiednia godzina.'
    );

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    const nextTaskLabel = screen.getByText('Ustaw pełną godzinę');
    expect(nextTaskLabel.nextElementSibling).toHaveTextContent('7:00');
    expect(screen.queryByTestId('clock-submit-feedback')).toBeNull();
    expect(screen.getByTestId('clock-task-progress-label')).toHaveTextContent('Zadanie 2 z 3');
    expect(screen.getByTestId('clock-task-progress-pill-0')).toHaveStyle({
      backgroundColor: KANGUR_CLOCK_THEME_COLORS.progressPracticeDone,
    });
    expect(screen.getByTestId('clock-task-progress-pill-1')).toHaveStyle({
      backgroundColor: KANGUR_CLOCK_THEME_COLORS.progressPracticeActive,
    });
    expect(screen.getByTestId('clock-task-progress-pill-2')).toHaveClass(
      'kangur-step-pill-pending'
    );
  });

  it('locks the clock hands during the feedback window after checking', async () => {
    vi.useFakeTimers();

    const { container } = render(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[
          { hours: 3, minutes: 0 },
          { hours: 7, minutes: 0 },
        ]}
        section='hours'
      />
    );
    const hourHand = getHourHand(container);

    dragHandToAngle(hourHand, hourToAngle(3));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    expect(screen.getByTestId('clock-interaction-hint')).toHaveTextContent(
      'Dobra odpowiedź. Za chwilę następne zadanie.'
    );
    expect(getClockDisplay()).toHaveTextContent('3:00');

    dragHandToAngle(hourHand, hourToAngle(8));
    expect(getClockDisplay()).toHaveTextContent('3:00');

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    const taskLabel = screen.getByText('Ustaw pełną godzinę');
    expect(taskLabel.nextElementSibling).toHaveTextContent('7:00');
  });

  it('announces the next stage when the final lesson practice task completes', async () => {
    vi.useFakeTimers();

    const onPracticeCompleted = vi.fn();
    const { container } = render(
      <ClockTrainingGame
        onFinish={vi.fn()}
        onPracticeCompleted={onPracticeCompleted}
        practiceTasks={[{ hours: 11, minutes: 0 }]}
        section='hours'
      />
    );
    const hourHand = getHourHand(container);

    dragHandToAngle(hourHand, hourToAngle(11));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    expect(screen.getByTestId('clock-interaction-hint')).toHaveTextContent(
      'Dobra odpowiedź. Za chwilę kolejny etap.'
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(onPracticeCompleted).toHaveBeenCalledWith({
      correctCount: 1,
      totalCount: 1,
    });
  });

  it('announces the next stage after a wrong final lesson practice task too', async () => {
    vi.useFakeTimers();

    const onPracticeCompleted = vi.fn();
    const { container } = render(
      <ClockTrainingGame
        enableAdaptiveRetry={false}
        onFinish={vi.fn()}
        onPracticeCompleted={onPracticeCompleted}
        practiceTasks={[{ hours: 11, minutes: 0 }]}
        section='hours'
      />
    );
    const hourHand = getHourHand(container);

    dragHandToAngle(hourHand, hourToAngle(10));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    expect(screen.getByTestId('clock-interaction-hint')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(onPracticeCompleted).toHaveBeenCalledWith({
      correctCount: 0,
      totalCount: 1,
    });
  });

  it('uses provided practiceTasks for deterministic staged rounds', () => {
    render(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[{ hours: 11, minutes: 0 }]}
        section='hours'
      />
    );

    const taskLabel = screen.getByText('Ustaw pełną godzinę');
    expect(taskLabel.nextElementSibling).toHaveTextContent('11:00');
  });

  it('shows a standalone practice summary CTA after a practice win', async () => {
    vi.useFakeTimers();

    const onCompletionPrimaryAction = vi.fn();
    const { container } = render(
      <ClockTrainingGame
        completionPrimaryActionLabel='Następne zadanie'
        onCompletionPrimaryAction={onCompletionPrimaryAction}
        onFinish={vi.fn()}
        practiceTasks={[{ hours: 11, minutes: 0 }]}
        section='hours'
      />
    );
    const hourHand = getHourHand(container);

    dragHandToAngle(hourHand, hourToAngle(11));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByTestId('clock-training-summary-shell')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Następne zadanie' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Następne zadanie' }));
    expect(onCompletionPrimaryAction).toHaveBeenCalledTimes(1);
  });

  it('shows a standalone practice summary after a wrong final answer too', async () => {
    vi.useFakeTimers();

    const onFinish = vi.fn();
    const { container } = render(
      <ClockTrainingGame
        enableAdaptiveRetry={false}
        onFinish={onFinish}
        practiceTasks={[{ hours: 11, minutes: 0 }]}
        section='hours'
      />
    );
    const hourHand = getHourHand(container);

    dragHandToAngle(hourHand, hourToAngle(10));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.getByTestId('clock-training-summary-shell')).toBeInTheDocument();
    expect(getByExactTextContent(['shared.scoreLabel: 0/1', 'Wynik: 0/1'])).toBeInTheDocument();
    expect(
      getByExactTextContent([
        'clockTraining.summary.hours.retry',
        'Poćwicz jeszcze pełne godziny i obserwuj krótką wskazówkę.',
      ])
    ).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByRole('button', { name: 'Zakończ ćwiczenie ✅' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zakończ ćwiczenie ✅' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('does not call onPracticeSuccess in challenge mode', async () => {
    const onPracticeSuccess = vi.fn();
    const { container } = render(
      <ClockTrainingGame onFinish={vi.fn()} onPracticeSuccess={onPracticeSuccess} section='hours' />
    );
    const hourHand = getHourHand(container);

    fireEvent.click(screen.getByTestId('clock-mode-challenge'));

    await waitFor(() => {
      expect(screen.getByTestId('clock-challenge-timer')).toBeInTheDocument();
    });

    const taskLabel = screen.getByText('Ustaw pełną godzinę');
    const taskValueText = taskLabel.nextElementSibling?.textContent ?? '12:00';
    const target = parseDisplayedTime(taskValueText);

    dragHandToAngle(hourHand, hourToAngle(target.hours));
    fireEvent.click(screen.getByRole('button', { name: 'Sprawdź! ✅' }));

    await waitFor(() => {
      expectClockSubmitButtonFeedbackStyle({
        button: screen.getByTestId('clock-submit-button'),
        kind: 'correct',
      });
    });

    expect(onPracticeSuccess).not.toHaveBeenCalled();
  });

  it('hides the live blue time display when showTimeDisplay is false', () => {
    render(<ClockTrainingGame onFinish={vi.fn()} section='hours' showTimeDisplay={false} />);

    expect(screen.queryByTestId('clock-time-display')).toBeNull();
  });

  it('can hide each clock hand independently for scaffold previews', () => {
    const { container, rerender } = render(
      <ClockTrainingGame
        onFinish={vi.fn()}
        section='mixed'
        showHourHand={false}
        showMinuteHand
      />
    );

    expect(container.querySelector('[data-testid="clock-hour-hand"]')).toBeNull();
    expect(container.querySelector('[data-testid="clock-minute-hand"]')).not.toBeNull();
    expect(screen.queryByTestId('clock-snap-mode-switch')).toBeInTheDocument();

    rerender(
      <ClockTrainingGame
        onFinish={vi.fn()}
        section='mixed'
        showHourHand
        showMinuteHand={false}
      />
    );

    expect(container.querySelector('[data-testid="clock-hour-hand"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="clock-minute-hand"]')).toBeNull();
    expect(screen.queryByTestId('clock-snap-mode-switch')).toBeNull();
  });
});
