import { z } from 'zod';

export const KANGUR_LEARNER_PASSWORD_MIN_LENGTH = 6;
export const KANGUR_LEARNER_PASSWORD_MAX_LENGTH = 160;
export const KANGUR_LEARNER_PASSWORD_PATTERN = /^[A-Za-z0-9]+$/;

export const kangurLearnerPasswordSchema = z
  .string()
  .trim()
  .min(KANGUR_LEARNER_PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${KANGUR_LEARNER_PASSWORD_MIN_LENGTH} characters.`,
  })
  .max(KANGUR_LEARNER_PASSWORD_MAX_LENGTH)
  .regex(KANGUR_LEARNER_PASSWORD_PATTERN, {
    message: 'Password must contain only letters and numbers.',
  });
