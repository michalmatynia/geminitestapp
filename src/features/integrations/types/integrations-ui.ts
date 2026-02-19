import type {
  TestStatusDto,
  TestLogEntryDto,
  TestConnectionResponseDto,
  SessionCookieDto,
} from '@/shared/contracts/integrations';
import { TEST_STATUSES as CENTRALIZED_TEST_STATUSES } from '@/shared/contracts/integrations';

export type { Integration, IntegrationConnection } from './integrations';

export const TEST_STATUSES = CENTRALIZED_TEST_STATUSES;
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
