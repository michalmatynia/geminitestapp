import { describe, expect, it } from 'vitest';

import { ACTION_SEQUENCES } from '../action-sequences';
import { STEP_REGISTRY } from '../step-registry';
import { STEP_GROUPS } from '../step-groups';
import {
  buildActionSteps,
  getActionStepIds,
} from '../action-constructor';
import {
  generateBrowserExecutionStepsInit,
  TRADERA_QUICKLIST_LABEL_OVERRIDES,
  TRADERA_QUICKLIST_PUBLISH_LABELS,
  generateTraderaQuicklistBrowserStepsInit,
} from '../generate-browser-steps';
import {
  TRADERA_SELECTOR_REGISTRY_RUNTIME,
  TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES,
  generateTraderaSelectorRegistryRuntime,
} from '../selectors/tradera';

// ── Registry completeness ─────────────────────────────────────────────────────

describe('STEP_REGISTRY', () => {
  it('every step group member references a registered step ID', () => {
    for (const [groupName, ids] of Object.entries(STEP_GROUPS)) {
      for (const id of ids) {
        expect(
          STEP_REGISTRY,
          `STEP_GROUPS.${groupName} references unknown step ID "${id}"`
        ).toHaveProperty(id);
      }
    }
  });

  it('every ACTION_SEQUENCES entry references only registered step IDs', () => {
    for (const [seqName, ids] of Object.entries(ACTION_SEQUENCES)) {
      for (const id of ids) {
        expect(
          STEP_REGISTRY,
          `ACTION_SEQUENCES.${seqName} references unknown step ID "${id}"`
        ).toHaveProperty(id);
      }
    }
  });

  it('every registered step has a non-empty id and label', () => {
    for (const [key, step] of Object.entries(STEP_REGISTRY)) {
      expect(step.id, `STEP_REGISTRY["${key}"].id`).toBeTruthy();
      expect(step.label, `STEP_REGISTRY["${key}"].label`).toBeTruthy();
      expect(step.id).toBe(key);
    }
  });
});

// ── Action sequences ──────────────────────────────────────────────────────────

describe('ACTION_SEQUENCES', () => {
  it('tradera_quicklist_list and tradera_quicklist_relist have identical step IDs', () => {
    expect(ACTION_SEQUENCES.tradera_quicklist_list).toEqual(
      ACTION_SEQUENCES.tradera_quicklist_relist
    );
  });

  it('tradera_standard_list uses the centralized standard browser publish flow', () => {
    expect(getActionStepIds('tradera_standard_list')).toEqual([
      'browser_preparation',
      'browser_open',
      'cookie_accept',
      'auth_check',
      'auth_login',
      'auth_manual',
      'sell_page_open',
      'load_product',
      'resolve_price',
      'title_fill',
      'description_fill',
      'price_set',
      'publish',
      'publish_verify',
      'browser_close',
    ]);
  });

  it('tradera_quicklist_sync uses sync_check instead of the duplicate-check block', () => {
    const listIds = getActionStepIds('tradera_quicklist_list');
    const syncIds = getActionStepIds('tradera_quicklist_sync');

    expect(syncIds).toContain('sync_check');
    expect(listIds).not.toContain('sync_check');

    for (const id of ['duplicate_check', 'deep_duplicate_check', 'sell_page_open', 'image_cleanup']) {
      expect(listIds).toContain(id);
      expect(syncIds).not.toContain(id);
    }
  });

  it('all Tradera quicklist sequences share the same suffix after the branching block', () => {
    const sharedSuffix = [
      'image_upload',
      'title_fill',
      'description_fill',
      'listing_format_select',
      'price_set',
      'category_select',
      'attribute_select',
      'shipping_set',
      'publish',
      'publish_verify',
      'browser_close',
    ];
    for (const key of [
      'tradera_quicklist_list',
      'tradera_quicklist_relist',
      'tradera_quicklist_sync',
    ] as const) {
      const ids = getActionStepIds(key);
      const tail = ids.slice(ids.length - sharedSuffix.length);
      expect(tail).toEqual(sharedSuffix);
    }
  });

  it('listing_format_select comes before price_set in all Tradera quicklist sequences', () => {
    for (const key of [
      'tradera_quicklist_list',
      'tradera_quicklist_relist',
      'tradera_quicklist_sync',
    ] as const) {
      const ids = getActionStepIds(key);
      expect(ids.indexOf('listing_format_select')).toBeLessThan(ids.indexOf('price_set'));
    }
  });

  it('vinted sequences share the same shared listing fields', () => {
    for (const key of ['vinted_list', 'vinted_relist', 'vinted_sync'] as const) {
      const ids = getActionStepIds(key);
      for (const field of ['image_upload', 'title_fill', 'description_fill', 'price_set']) {
        expect(ids, `${key} missing ${field}`).toContain(field);
      }
    }
  });

  it('vinted_sync has sync_check; vinted_list and vinted_relist do not', () => {
    expect(getActionStepIds('vinted_sync')).toContain('sync_check');
    expect(getActionStepIds('vinted_list')).not.toContain('sync_check');
    expect(getActionStepIds('vinted_relist')).not.toContain('sync_check');
  });

  it('tradera_check_status includes browser_preparation before opening the overview flow', () => {
    expect(getActionStepIds('tradera_check_status').slice(0, 4)).toEqual([
      'browser_preparation',
      'browser_open',
      'cookie_accept',
      'auth_check',
    ]);
  });

  it('tradera_fetch_categories uses the centralized category crawl lifecycle steps', () => {
    expect(getActionStepIds('tradera_fetch_categories')).toEqual([
      'browser_preparation',
      'browser_open',
      'cookie_accept',
      'categories_seed_extract',
      'categories_crawl',
      'categories_finalize',
      'browser_close',
    ]);
  });
});

// ── buildActionSteps ──────────────────────────────────────────────────────────

describe('buildActionSteps', () => {
  it('returns steps with status pending and null message', () => {
    const steps = buildActionSteps('tradera_quicklist_list');
    for (const step of steps) {
      expect(step.status).toBe('pending');
      expect(step.message).toBeNull();
    }
  });

  it('returns steps whose IDs match the sequence exactly', () => {
    for (const key of Object.keys(ACTION_SEQUENCES) as Array<keyof typeof ACTION_SEQUENCES>) {
      const steps = buildActionSteps(key);
      expect(steps.map((s) => s.id)).toEqual([...ACTION_SEQUENCES[key]]);
    }
  });

  it('each step has a non-empty label from the registry', () => {
    const steps = buildActionSteps('vinted_list');
    for (const step of steps) {
      expect(step.label).toBeTruthy();
      expect(STEP_REGISTRY[step.id as keyof typeof STEP_REGISTRY].label).toBe(step.label);
    }
  });
});

// ── Tradera label consistency ─────────────────────────────────────────────────

describe('TRADERA_QUICKLIST_LABEL_OVERRIDES', () => {
  it('every override key is a registered step ID', () => {
    for (const id of Object.keys(TRADERA_QUICKLIST_LABEL_OVERRIDES)) {
      expect(STEP_REGISTRY, `override key "${id}" not in STEP_REGISTRY`).toHaveProperty(id);
    }
  });

  it('every overridden label differs from the registry base label', () => {
    for (const [id, label] of Object.entries(TRADERA_QUICKLIST_LABEL_OVERRIDES)) {
      const baseLabel = STEP_REGISTRY[id as keyof typeof STEP_REGISTRY]?.label;
      expect(label, `"${id}" override is identical to registry label — remove it`).not.toBe(baseLabel);
    }
  });

  it('publish labels cover all three action variants', () => {
    for (const action of ['list', 'relist', 'sync'] as const) {
      expect(TRADERA_QUICKLIST_PUBLISH_LABELS[action].publish).toBeTruthy();
      expect(TRADERA_QUICKLIST_PUBLISH_LABELS[action].publish_verify).toBeTruthy();
    }
  });
});

// ── Browser script generator ─────────────────────────────────────────────────

describe('generateTraderaQuicklistBrowserStepsInit', () => {
  const generated = generateTraderaQuicklistBrowserStepsInit();

  it('produces a non-empty string', () => {
    expect(generated).toBeTruthy();
    expect(typeof generated).toBe('string');
  });

  it('declares per-action quicklist manifests and clones the selected one at runtime', () => {
    expect(generated).toContain('const QUICKLIST_ACTION_EXECUTION_STEPS = {');
    expect(generated).toContain('list: [');
    expect(generated).toContain('relist: [');
    expect(generated).toContain('sync: [');
    expect(generated).toContain('QUICKLIST_ACTION_EXECUTION_STEPS[listingAction]');
    expect(generated).toContain('.map((step) => ({ ...step }));');
  });

  it('contains every step ID from the list sequence', () => {
    for (const id of ACTION_SEQUENCES.tradera_quicklist_list) {
      expect(generated, `missing step id "${id}"`).toContain(`'${id}'`);
    }
  });

  it('contains every step ID from the relist sequence', () => {
    for (const id of ACTION_SEQUENCES.tradera_quicklist_relist) {
      expect(generated, `missing step id "${id}"`).toContain(`'${id}'`);
    }
  });

  it('contains every step ID from the sync sequence', () => {
    for (const id of ACTION_SEQUENCES.tradera_quicklist_sync) {
      expect(generated, `missing step id "${id}"`).toContain(`'${id}'`);
    }
  });

  it('selects the quicklist manifest from listingAction', () => {
    expect(generated).toContain('QUICKLIST_ACTION_EXECUTION_STEPS[listingAction]');
  });

  it('includes Tradera-specific label overrides in the output', () => {
    for (const label of Object.values(TRADERA_QUICKLIST_LABEL_OVERRIDES)) {
      expect(generated, `missing label "${label}"`).toContain(`'${label}'`);
    }
  });

  it('includes all publish label variants', () => {
    expect(generated).toContain(`'${TRADERA_QUICKLIST_PUBLISH_LABELS.sync.publish}'`);
    expect(generated).toContain(`'${TRADERA_QUICKLIST_PUBLISH_LABELS.relist.publish}'`);
    expect(generated).toContain(`'${TRADERA_QUICKLIST_PUBLISH_LABELS.list.publish}'`);
    expect(generated).toContain(`'${TRADERA_QUICKLIST_PUBLISH_LABELS.sync.publish_verify}'`);
    expect(generated).toContain(`'${TRADERA_QUICKLIST_PUBLISH_LABELS.list.publish_verify}'`);
  });

  it('is stable — calling it twice produces the same output', () => {
    expect(generateTraderaQuicklistBrowserStepsInit()).toBe(generated);
  });
});

describe('generateBrowserExecutionStepsInit', () => {
  it('serializes an execution-step manifest into a runtime const declaration', () => {
    const generated = generateBrowserExecutionStepsInit([
      { id: 'browser_open', label: 'Open browser' },
      { id: 'resolve_status', label: 'Resolve listing status' },
    ]);

    expect(generated).toContain('const executionSteps =');
    expect(generated).toContain('"id": "browser_open"');
    expect(generated).toContain('"label": "Resolve listing status"');
    expect(generated).toContain('"status": "pending"');
  });
});

describe('TRADERA_SELECTOR_REGISTRY_RUNTIME', () => {
  it('contains the centralized selector constants used by the Tradera quicklist runtime', () => {
    expect(TRADERA_SELECTOR_REGISTRY_RUNTIME).toContain('const TITLE_SELECTORS =');
    expect(TRADERA_SELECTOR_REGISTRY_RUNTIME).toContain('const PRICE_SELECTORS =');
    expect(TRADERA_SELECTOR_REGISTRY_RUNTIME).toContain('const ACTIVE_SEARCH_SELECTORS =');
    expect(TRADERA_SELECTOR_REGISTRY_RUNTIME).toContain(
      "const FALLBACK_CATEGORY_PATH = 'Other > Other';"
    );
  });

  it('has a stable generated output and aligned seed metadata', () => {
    expect(generateTraderaSelectorRegistryRuntime()).toBe(TRADERA_SELECTOR_REGISTRY_RUNTIME);
    expect(TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES.length).toBeGreaterThan(0);
    expect(TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'TITLE_SELECTORS',
          source: 'code',
        }),
        expect.objectContaining({
          key: 'FALLBACK_CATEGORY_PATH',
          source: 'code',
        }),
      ])
    );
  });
});
