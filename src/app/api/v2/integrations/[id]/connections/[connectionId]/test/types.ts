import { type TestLogEntry } from '@/shared/contracts/integrations';
import {
  type IntegrationConnectionRecord,
  type IntegrationRepository,
} from '@/shared/contracts/integrations/repositories';

export type PushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => void;
export type Fail = (step: string, detail: string, status?: number) => Promise<never>;

export type ConnectionUpdateRepository = Pick<IntegrationRepository, 'updateConnection' | 'getIntegrationById' | 'getConnectionByIdAndIntegration'>;

export type ConnectionTestContext = {
  connection: IntegrationConnectionRecord;
  repo: ConnectionUpdateRepository;
  manualMode: boolean;
  manualSessionRefreshMode?: boolean;
  quicklistPreflightMode?: boolean;
  mode?: 'manual' | 'manual_session_refresh' | 'quicklist_preflight' | 'auto';
  manualLoginTimeoutMs: number;
  steps: TestLogEntry[];
  pushStep: PushStep;
  fail: Fail;
  productId?: string | null;
};
