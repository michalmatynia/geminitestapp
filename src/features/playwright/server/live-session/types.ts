import type { Browser, BrowserContext, CDPSession, Page } from 'playwright';
import type WebSocket from 'ws';
import type {
  LiveScripterPickedElement,
  LiveScripterServerMessage,
  LiveScripterViewport,
} from '@/shared/contracts/playwright-live-scripter';
import type { SafeTimerId } from '@/shared/lib/timers';

export type LiveScripterSocket = WebSocket;

export type LiveScripterSession = {
  id: string;
  ownerUserId: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cdp: CDPSession;
  viewport: LiveScripterViewport;
  personaId: string | null;
  selectorProfile: string | null;
  createdAt: number;
  lastActivityAt: number;
  timeoutId: SafeTimerId | null;
  sockets: Set<LiveScripterSocket>;
  lastFrame: Extract<LiveScripterServerMessage, { type: 'frame' }> | null;
  lastNavigation: Extract<LiveScripterServerMessage, { type: 'navigated' }> | null;
  lastPicked: Extract<LiveScripterServerMessage, { type: 'picked' }> | null;
  lastProbe: Extract<LiveScripterServerMessage, { type: 'probe_result' }> | null;
  disposed: boolean;
  pendingAction: Promise<void>;
};

export type LiveScripterProbeCandidate = LiveScripterPickedElement & {
  repeatedSiblingCount: number;
  childLinkCount: number;
  childImageCount: number;
};

export type LiveScripterBridge = {
  attachClient: (sessionId: string, socket: LiveScripterSocket) => Promise<boolean>;
};

export type LiveScripterState = {
  sessions: Map<string, LiveScripterSession>;
  bridge: LiveScripterBridge;
};
