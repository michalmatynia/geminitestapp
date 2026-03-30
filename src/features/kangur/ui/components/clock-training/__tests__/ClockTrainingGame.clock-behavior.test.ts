import {
  angleToMinute,
  buildClockCorrectFeedback,
  buildClockTaskPrompt,
  buildClockTimeoutFeedback,
  buildClockWrongFeedback,
  applyHourAngleToCycleMinutes,
  applyMinuteValueToCycleMinutes,
  applyMinuteStepToCycleMinutes,
  cycleMinutesToDisplayHour,
  cycleMinutesToDisplayMinutes,
  cycleMinutesToHourAngle,
  getClockTrainingSummaryMessage,
  getClockDistanceInMinutes,
  scheduleRetryTask,
  taskToKey,
} from '../../ClockTrainingGame';
import { CLOCK_TRAINING_TASKS } from '../../clock-training-data';

describe('ClockTrainingGame clock behavior', () => {
  it('moves hour hand proportionally when minutes advance', () => {
    const initial = 3 * 60;
    const next = applyMinuteStepToCycleMinutes(initial, 30);

    expect(cycleMinutesToDisplayHour(next)).toBe(3);
    expect(cycleMinutesToDisplayMinutes(next)).toBe(30);
    expect(cycleMinutesToHourAngle(next)).toBe(105);
  });

  it('rolls hour forward when minute hand crosses 12 clockwise', () => {
    const initial = 7 * 60 + 55;
    const next = applyMinuteStepToCycleMinutes(initial, 0);

    expect(cycleMinutesToDisplayHour(next)).toBe(8);
    expect(cycleMinutesToDisplayMinutes(next)).toBe(0);
  });

  it('rolls hour backward when minute hand crosses 12 counterclockwise', () => {
    const initial = 8 * 60;
    const next = applyMinuteStepToCycleMinutes(initial, 55);

    expect(cycleMinutesToDisplayHour(next)).toBe(7);
    expect(cycleMinutesToDisplayMinutes(next)).toBe(55);
  });

  it('keeps minutes when the hour hand is dragged', () => {
    const initial = 3 * 60 + 30;
    const next = applyHourAngleToCycleMinutes(initial, 150);

    expect(cycleMinutesToDisplayHour(next)).toBe(5);
    expect(cycleMinutesToDisplayMinutes(next)).toBe(30);
  });

  it('supports 1-minute snap precision', () => {
    const initial = 3 * 60;
    const next = applyMinuteValueToCycleMinutes(initial, 7, 1);

    expect(cycleMinutesToDisplayHour(next)).toBe(3);
    expect(cycleMinutesToDisplayMinutes(next)).toBe(7);
  });

  it('converts angle to minute with configurable precision', () => {
    expect(angleToMinute(42, 1)).toBe(7);
    expect(angleToMinute(42, 5)).toBe(5);
  });

  it('computes shortest distance on a 12-hour cycle', () => {
    expect(getClockDistanceInMinutes(12, 0, 11, 55)).toBe(5);
    expect(getClockDistanceInMinutes(8, 0, 7, 30)).toBe(30);
  });

  it('builds near-miss feedback details', () => {
    const feedback = buildClockWrongFeedback(7, 56, 8, 0);
    expect(feedback.kind).toBe('wrong');
    expect(feedback.tone).toBe('near');
    expect(feedback.title).toBe('Bardzo blisko!');
    expect(feedback.details).toContain('Różnica: 4 min');
  });

  it('builds hour-section feedback around full-hour mistakes', () => {
    const feedback = buildClockWrongFeedback(3, 0, 4, 0, 'hours');
    expect(feedback.kind).toBe('wrong');
    expect(feedback.tone).toBe('near');
    expect(feedback.title).toBe('Prawie! To sąsiednia godzina.');
    expect(feedback.details).toContain('Pomyłka o 1 godz.');
    expect(feedback.details).toContain('krótkiej wskazówki');
  });

  it('builds minute-section feedback around minute-hand adjustments', () => {
    const feedback = buildClockWrongFeedback(12, 25, 12, 30, 'minutes');
    expect(feedback.kind).toBe('wrong');
    expect(feedback.title).toBe('Prawie! Minuty są blisko.');
    expect(feedback.details).toContain('Przesuń ją jeszcze o jedną kreskę.');
  });

  it('schedules a retry task once by default', () => {
    const tasks = [{ hours: 7, minutes: 30 }];
    const plan = scheduleRetryTask(tasks, {}, tasks[0]!);
    expect(plan.added).toBe(true);
    expect(plan.tasks).toHaveLength(2);
    expect(plan.retryCounts[taskToKey(tasks[0]!)]).toBe(1);

    const secondPlan = scheduleRetryTask(plan.tasks, plan.retryCounts, tasks[0]!);
    expect(secondPlan.added).toBe(false);
    expect(secondPlan.tasks).toHaveLength(2);
  });

  it('does not schedule retries when task cap is reached', () => {
    const tasks = Array.from({ length: 8 }, () => ({ hours: 3, minutes: 0 }));
    const plan = scheduleRetryTask(tasks, {}, tasks[0]!);
    expect(plan.added).toBe(false);
    expect(plan.tasks).toHaveLength(8);
  });

  it('builds readable task prompts for special minute patterns', () => {
    expect(buildClockTaskPrompt({ hours: 3, minutes: 0 })).toContain('Pełna godzina');
    expect(buildClockTaskPrompt({ hours: 5, minutes: 15 })).toContain('Kwadrans po 5');
    expect(buildClockTaskPrompt({ hours: 11, minutes: 30 })).toContain('Wpół do 12');
    expect(buildClockTaskPrompt({ hours: 12, minutes: 45 })).toContain('Kwadrans do 1');
  });

  it('builds section-specific task prompts for focused practice', () => {
    expect(buildClockTaskPrompt({ hours: 3, minutes: 0 }, 'hours')).toContain(
      'Ustaw krótką wskazówkę'
    );
    expect(buildClockTaskPrompt({ hours: 12, minutes: 30 }, 'minutes')).toContain(
      'Krótka wskazówka zostaje na 12'
    );
  });

  it('builds section-specific correct, timeout, and summary copy', () => {
    expect(buildClockCorrectFeedback('combined', { hours: 7, minutes: 30 }).title).toBe(
      'Brawo! Pełny czas ustawiony!'
    );
    expect(buildClockCorrectFeedback('minutes', { hours: 12, minutes: 25 }).details).toContain(
      'poprawne minuty'
    );
    expect(buildClockTimeoutFeedback('hours', { hours: 4, minutes: 0 }).details).toContain(
      'pełnej godziny'
    );
    expect(getClockTrainingSummaryMessage('minutes', 5, 5)).toContain(
      'Długa wskazówka'
    );
    expect(getClockTrainingSummaryMessage('combined', 2, 5)).toContain(
      'wspólne ustawianie godzin i minut'
    );
  });

  it('keeps hours training tasks on full hours only', () => {
    expect(CLOCK_TRAINING_TASKS.hours.every((task) => task.minutes === 0)).toBe(true);
  });

  it('keeps minutes training tasks anchored to one hour for minute focus', () => {
    expect(CLOCK_TRAINING_TASKS.minutes.every((task) => task.hours === 12)).toBe(true);
    expect(CLOCK_TRAINING_TASKS.minutes.every((task) => task.minutes > 0)).toBe(true);
  });
});
