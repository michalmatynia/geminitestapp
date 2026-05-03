import { describe, expect, it } from 'vitest';

import {
  createPlaywrightConnectionTestFailureResponse,
  createPlaywrightConnectionTestSuccessResponse,
} from './connection-test-response';

describe('createPlaywrightConnectionTestSuccessResponse', () => {
  it('returns a success response with optional message and session readiness', async () => {
    const response = createPlaywrightConnectionTestSuccessResponse({
      steps: [
        {
          step: 'Quicklist preflight',
          status: 'ok',
          timestamp: '2026-04-10T12:00:00.000Z',
          detail: 'Stored session is ready.',
        },
      ],
      message: 'Tradera session is active.',
      sessionReady: true,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: 'Tradera session is active.',
      sessionReady: true,
      steps: [
        {
          step: 'Quicklist preflight',
          status: 'ok',
          timestamp: '2026-04-10T12:00:00.000Z',
          detail: 'Stored session is ready.',
        },
      ],
    });
  });
});

describe('createPlaywrightConnectionTestFailureResponse', () => {
  it('maps AUTH_REQUIRED failures to 401 by default', async () => {
    const response = createPlaywrightConnectionTestFailureResponse({
      steps: [],
      message: 'AUTH_REQUIRED: Session expired.',
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'AUTH_REQUIRED: Session expired.',
      steps: [],
    });
  });

  it('uses an explicit status override when provided', async () => {
    const response = createPlaywrightConnectionTestFailureResponse({
      steps: [],
      message: 'Custom failure.',
      status: 409,
    });

    expect(response.status).toBe(409);
  });
});
