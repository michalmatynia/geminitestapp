import { z } from 'zod';

/**
 * CMS Theme Settings DTOs
 */

export const colorSchemeColorsSchema = z.object({
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  accent: z.string(),
  border: z.string(),
});

export type ColorSchemeColorsDto = z.infer<typeof colorSchemeColorsSchema>;
export type ColorSchemeColors = ColorSchemeColorsDto;

export const colorSchemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  colors: colorSchemeColorsSchema,
});

export type ColorSchemeDto = z.infer<typeof colorSchemeSchema>;
export type ColorScheme = ColorSchemeDto;

export const clockThemeSettingsSchema = z.object({
  accentAmberText: z.string(),
  accentIndigoSoftFill: z.string(),
  accentIndigoSolidFill: z.string(),
  accentIndigoText: z.string(),
  atmosphereEnd: z.string(),
  atmosphereStart: z.string(),
  center: z.string(),
  challengeHigh: z.string(),
  challengeLow: z.string(),
  challengeMid: z.string(),
  challengeTrack: z.string(),
  contrastText: z.string(),
  faceFill: z.string(),
  faceGradientEnd: z.string(),
  faceGradientMid: z.string(),
  faceGradientStart: z.string(),
  faceStroke: z.string(),
  feedbackCorrectBackground: z.string(),
  feedbackCorrectBorder: z.string(),
  feedbackCorrectSoftBackground: z.string(),
  feedbackCorrectText: z.string(),
  feedbackWrongBackground: z.string(),
  feedbackWrongBorder: z.string(),
  feedbackWrongSoftBackground: z.string(),
  feedbackWrongText: z.string(),
  frame: z.string(),
  highlightHourHand: z.string(),
  highlightMinuteHand: z.string(),
  interactiveHourHand: z.string(),
  interactiveMinuteHand: z.string(),
  label: z.string(),
  lessonHourHand: z.string(),
  lessonMinuteHand: z.string(),
  majorTick: z.string(),
  minorTick: z.string(),
  numeral: z.string(),
  progressChallengeActive: z.string(),
  progressChallengeDone: z.string(),
  progressPracticeActive: z.string(),
  progressPracticeDone: z.string(),
  promptText: z.string(),
  secondHand: z.string(),
  stepFill: z.string(),
  stepLabel: z.string(),
});

export type ClockThemeSettingsDto = z.infer<typeof clockThemeSettingsSchema>;
export type ClockThemeSettings = ClockThemeSettingsDto;
