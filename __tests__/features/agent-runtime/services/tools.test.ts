import { vi, describe, it, expect, beforeEach } from 'vitest';

import { runAgentTool } from '@/features/ai/agent-runtime/tools/index';
import * as llmTools from '@/features/ai/agent-runtime/tools/llm';
import * as playwrightBrowser from '@/features/ai/agent-runtime/tools/playwright/browser';
import * as playwrightExtraction from '@/features/ai/agent-runtime/tools/playwright/extraction';
import * as searchTools from '@/features/ai/agent-runtime/tools/search';
import prisma from '@/shared/lib/db/prisma';

// Mock internal modules
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn(),
  },
  default: {
    promises: {
      mkdir: vi.fn(),
      copyFile: vi.fn(),
      unlink: vi.fn(),
    },
  },
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    chatbotAgentRun: { findUnique: vi.fn(), update: vi.fn() },
    agentBrowserLog: { create: vi.fn(), count: vi.fn() },
    agentBrowserSnapshot: { findFirst: vi.fn(), create: vi.fn() },
    agentAuditLog: { create: vi.fn() },
  },
}));

vi.mock('@/features/ai/agent-runtime/tools/playwright/browser', () => ({
  launchBrowser: vi.fn(),
  createBrowserContext: vi.fn(),
  captureSnapshot: vi.fn(),
  captureSessionContext: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/tools/playwright/actions', () => ({
  dismissConsent: vi.fn(),
  ensureLoginFormVisible: vi.fn(),
  checkForChallenge: vi.fn(),
  inferLoginCandidates: vi.fn(),
  findFirstVisible: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/tools/playwright/inventory', () => ({
  collectUiInventory: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/tools/playwright/extraction', () => ({
  extractProductNames: vi.fn(),
  extractProductNamesFromSelectors: vi.fn(),
  extractEmailsFromDom: vi.fn(),
  waitForProductContent: vi.fn(),
  autoScroll: vi.fn(),
  findProductListingUrls: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/tools/search', () => ({
  fetchSearchResults: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/tools/llm', () => ({
  validateExtractionWithLLM: vi.fn(),
  normalizeExtractionItemsWithLLM: vi.fn(),
  inferSelectorsFromLLM: vi.fn(),
  buildExtractionPlan: vi.fn(),
  buildFailureRecoveryPlan: vi.fn(),
  buildSearchQueryWithLLM: vi.fn(),
  pickSearchResultWithLLM: vi.fn(),
  decideSearchFirstWithLLM: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/tools/utils', async () => {
  const actual = await vi.importActual('@/features/ai/agent-runtime/tools/utils');
  return {
    ...actual,
    loadRobotsTxt: vi.fn().mockResolvedValue({ ok: false }),
  };
});

// Mock Playwright objects
const mockPage = {
  goto: vi.fn(),
  setContent: vi.fn(),
  evaluate: vi.fn().mockResolvedValue('sample text'),
  on: vi.fn(),
  url: vi.fn().mockReturnValue('http://example.com'),
  locator: vi.fn().mockReturnValue({ first: vi.fn() }),
  video: vi.fn(),
  bringToFront: vi.fn(),
  removeAllListeners: vi.fn(),
};

const mockContext = {
  newPage: vi.fn().mockResolvedValue(mockPage),
  pages: vi.fn().mockReturnValue([]),
  close: vi.fn(),
  browser: vi.fn(),
};

const mockBrowser = {
  close: vi.fn(),
};

describe('Agent Runtime - Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (playwrightBrowser.launchBrowser as any).mockResolvedValue(mockBrowser);
    (playwrightBrowser.createBrowserContext as any).mockResolvedValue(mockContext);
    (playwrightBrowser.captureSnapshot as any).mockResolvedValue({
      domText: 'html content',
      url: 'http://example.com',
    });
    (playwrightBrowser.captureSessionContext as any).mockResolvedValue({});
    (prisma.chatbotAgentRun.findUnique as any).mockResolvedValue({
      model: 'llama3',
      searchProvider: 'google',
    });
    // Default LLM mocks
    (llmTools.decideSearchFirstWithLLM as any).mockResolvedValue({ useSearchFirst: false });
    (llmTools.buildSearchQueryWithLLM as any).mockResolvedValue(null);
    (searchTools.fetchSearchResults as any).mockResolvedValue([]);
  });

  it('should run the playwright tool successfully (basic navigation)', async () => {
    const result = await runAgentTool({
      name: 'playwright',
      input: {
        runId: 'run-1',
        prompt: 'Go to example.com',
        browser: 'chromium',
      },
    });

    expect(playwrightBrowser.launchBrowser).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining('example.com'),
      expect.anything()
    );
    expect(result.ok).toBe(true);
    expect(result.output?.url).toBe('http://example.com');
  });

  it('should fail if runId is missing', async () => {
    const result = await runAgentTool({
      name: 'playwright',
      input: {
        prompt: 'Go',
      },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Missing runId');
  });

  it('should handle extraction request (products)', async () => {
    (playwrightExtraction.extractProductNames as any).mockResolvedValue(['Product A', 'Product B']);
    (playwrightExtraction.waitForProductContent as any).mockResolvedValue(undefined);
    (llmTools.validateExtractionWithLLM as any).mockResolvedValue({
      valid: true,
      acceptedItems: ['Product A', 'Product B'],
      rejectedItems: [],
      missingCount: 0,
      issues: [],
    });
    (llmTools.normalizeExtractionItemsWithLLM as any).mockResolvedValue(['Product A', 'Product B']);
    (llmTools.buildExtractionPlan as any).mockResolvedValue({
      target: 'products',
      fields: ['name'],
      primarySelectors: ['.product'],
      fallbackSelectors: [],
      notes: null,
    });

    const result = await runAgentTool({
      name: 'playwright',
      input: {
        runId: 'run-1',
        prompt: 'Extract 5 products from example.com',
        browser: 'chromium',
      },
    });

    expect(result.ok).toBe(true);
    expect(result.output?.extractionType).toBe('product_names');
    expect(result.output?.extractedTotal).toBe(2);
  });

  it('should attempt recovery if extraction fails', async () => {
    (playwrightExtraction.extractProductNames as any).mockResolvedValue([]);
    (playwrightExtraction.waitForProductContent as any).mockResolvedValue(undefined);
    (playwrightExtraction.findProductListingUrls as any).mockResolvedValue([]);
    (playwrightExtraction.extractProductNamesFromSelectors as any).mockResolvedValue([]);

    (llmTools.buildExtractionPlan as any).mockResolvedValue({
      target: 'products',
      fields: ['name'],
      primarySelectors: ['.product'],
      fallbackSelectors: [],
      notes: null,
    });
    (llmTools.inferSelectorsFromLLM as any).mockResolvedValue([]);

    (llmTools.validateExtractionWithLLM as any).mockResolvedValue({
      valid: true,
      acceptedItems: [],
      rejectedItems: [],
      missingCount: 1,
      issues: [],
    });
    (llmTools.normalizeExtractionItemsWithLLM as any).mockResolvedValue([]);

    (llmTools.buildFailureRecoveryPlan as any).mockResolvedValue({
      reason: 'failed',
      selectors: [],
      listingUrls: [],
    });

    const result = await runAgentTool({
      name: 'playwright',
      input: {
        runId: 'run-1',
        prompt: 'Extract products',
        browser: 'chromium',
      },
    });

    expect(llmTools.buildFailureRecoveryPlan).toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('No product names extracted');
  });
});
