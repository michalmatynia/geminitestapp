import 'server-only';

import { NextResponse } from 'next/server';

import type { TestConnectionResponse, TestLogEntry } from '@/shared/contracts/integrations/session-testing';

export const createPlaywrightConnectionTestSuccessResponse = (input: {
  steps: TestLogEntry[];
  message?: string;
  sessionReady?: boolean;
}): Response => {
  const response: TestConnectionResponse = {
    ok: true,
    steps: input.steps,
    ...(input.message ? { message: input.message } : {}),
    ...(typeof input.sessionReady === 'boolean'
      ? { sessionReady: input.sessionReady }
      : {}),
  };

  return NextResponse.json(response);
};

export const createPlaywrightConnectionTestFailureResponse = (input: {
  steps: TestLogEntry[];
  message: string;
  status?: number;
}): Response => {
  const response: TestConnectionResponse = {
    ok: false,
    message: input.message,
    steps: input.steps,
  };

  return NextResponse.json(response, {
    status:
      input.status ?? (input.message.includes('AUTH_REQUIRED') ? 401 : 400),
  });
};
