import { describe, it, expect, vi } from 'vitest';
import { TraderaSequencer } from '../TraderaSequencer';
import { VintedSequencer } from '../VintedSequencer';
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
    expect(page.goto).toHaveBeenCalledWith('https://www.tradera.com');
    expect(tracker.getSteps().filter(s => s.status === 'success')).toHaveLength(2);
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
});
