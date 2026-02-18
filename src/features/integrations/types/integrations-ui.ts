import type {
  IntegrationDto,
  IntegrationConnectionDto,
  TestStatusDto,
  TestLogEntryDto,
  TestConnectionResponseDto,
  SessionCookieDto,
} from '@/shared/contracts/integrations';

export type Integration = IntegrationDto;

export type IntegrationConnection = IntegrationConnectionDto;

export const TEST_STATUSES = ['pending', 'ok', 'failed'] as const;
export type TestStatus = TestStatusDto;

export type TestLogEntry = TestLogEntryDto;

export type TestConnectionResponse = TestConnectionResponseDto;

export type SessionCookie = SessionCookieDto;

export const integrationDefinitions = [
  { name: 'Tradera', slug: 'tradera' },
  { name: 'Tradera API', slug: 'tradera-api' },
  { name: 'Allegro', slug: 'allegro' },
  { name: 'Baselinker', slug: 'baselinker' },
] as const;
