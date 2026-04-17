import { describe, it, expect, vi } from 'vitest';
import { TraderaSequencer } from '../sequencers/TraderaSequencer';
import { VintedSequencer } from '../sequencers/VintedSequencer';
import { PlaywrightSequencer } from '../sequencers/PlaywrightSequencer';
import { StepTracker } from '../step-tracker';
import { Page } from 'playwright';

describe('Sequencer Integration', () => {
  it('TraderaSequencer should run browser_open step', async () => {
    const page = { 
      goto: vi.fn(), 
      setViewportSize: vi.fn(),
      locator: vi.fn(() => ({ first: () => ({ isVisible: vi.fn(() => Promise.resolve(true)) }) })) 
    } as unknown as Page;
    
    const tracker = StepTracker.fromSteps([
      { id: 'browser_preparation', label: 'Prep', status: 'pending' },
      { id: 'browser_open', label: 'Open', status: 'pending' }
    ], () => {});

    const sequencer = new TraderaSequencer({ 
      page, 
      tracker, 
      actionKey: 'tradera_quicklist_list',
      emit: vi.fn() 
    });

    await sequencer.run();

    expect(page.setViewportSize).toHaveBeenCalled();
    expect(page.goto).toHaveBeenCalledWith('https://www.tradera.com', {
      waitUntil: 'domcontentloaded',
    });
    expect(tracker.getSteps().filter(s => s.status === 'success')).toHaveLength(2);
  });

  it('TraderaSequencer should apply browser_preparation step config overrides', async () => {
    const page = {
      goto: vi.fn(),
      setViewportSize: vi.fn(),
      locator: vi.fn(() => ({ first: () => ({ isVisible: vi.fn(() => Promise.resolve(true)) }) })),
    } as unknown as Page;

    const tracker = StepTracker.fromSteps([
      {
        id: 'browser_preparation',
        label: 'Prep',
        status: 'pending',
        config: {
          viewportWidth: 1440,
          viewportHeight: 900,
          settleDelayMs: 25,
        },
      },
    ]);

    const sequencer = new TraderaSequencer({
      page,
      tracker,
      actionKey: 'tradera_quicklist_list',
      emit: vi.fn(),
    });

    await sequencer.run();

    expect(page.setViewportSize).toHaveBeenCalledWith({ width: 1440, height: 900 });
  });

  it('VintedSequencer should run browser_open step', async () => {
    const page = { 
      goto: vi.fn(), 
      setViewportSize: vi.fn(),
      evaluate: vi.fn(() => Promise.resolve(true))
    } as unknown as Page;
    
    const tracker = StepTracker.fromSteps([
      { id: 'browser_preparation', label: 'Prep', status: 'pending' },
      { id: 'browser_open', label: 'Open', status: 'pending' }
    ], () => {});

    const sequencer = new VintedSequencer({ 
      page, 
      tracker, 
      actionKey: 'vinted_sync', 
      emit: vi.fn() 
    });

    await sequencer.run();

    expect(page.setViewportSize).toHaveBeenCalled();
    expect(page.goto).toHaveBeenCalledWith('https://www.vinted.pl');
    expect(tracker.getSteps().filter(s => s.status === 'success')).toHaveLength(2);
  });

  it('TraderaSequencer should preserve skipped auth steps when helper-driven manual auth is used', async () => {
    const page = {
      goto: vi.fn(),
      url: vi.fn(() => 'https://www.tradera.com/login'),
      setViewportSize: vi.fn(),
    } as unknown as Page;

    const tracker = StepTracker.fromSteps([
      { id: 'auth_check', label: 'Auth check', status: 'pending' },
      { id: 'auth_login', label: 'Auth login', status: 'pending' },
      { id: 'auth_manual', label: 'Auth manual', status: 'pending' },
    ]);

    const sequencer = new TraderaSequencer({
      page,
      tracker,
      actionKey: 'tradera_auth',
      emit: vi.fn(),
      helpers: {
        authCheckMode: 'observe',
        checkAuthStatus: async () => false,
        mode: 'manual',
        waitForManualLogin: async () => true,
      },
    });

    await sequencer.run();

    expect(tracker.getStatus('auth_check')).toBe('success');
    expect(tracker.getStatus('auth_login')).toBe('skipped');
    expect(tracker.getStatus('auth_manual')).toBe('success');
  });

  it('PlaywrightSequencer should not execute steps already marked as skipped', async () => {
    class TestSequencer extends PlaywrightSequencer {
      readonly executedStepIds: string[] = [];

      protected async executeStep(stepId: string): Promise<void> {
        this.executedStepIds.push(stepId);
      }
    }

    const tracker = StepTracker.fromSteps([
      { id: 'auth_login', label: 'Auth login', status: 'skipped', message: 'Not needed.' },
      { id: 'publish', label: 'Publish', status: 'pending' },
    ]);

    const sequencer = new TestSequencer({
      page: {} as Page,
      tracker,
      actionKey: 'tradera_auth',
      emit: vi.fn(),
    });

    await sequencer.run();

    expect(sequencer.executedStepIds).toEqual(['publish']);
    expect(tracker.getStatus('auth_login')).toBe('skipped');
    expect(tracker.getStatus('publish')).toBe('success');
  });
});
