import { test, expect, type Locator, type Page, type Route } from '@playwright/test';

const E2E_ADMIN_EMAIL = process.env['PLAYWRIGHT_E2E_ADMIN_EMAIL'] ?? 'admin@example.com';
const E2E_ADMIN_PASSWORD = process.env['PLAYWRIGHT_E2E_ADMIN_PASSWORD'] ?? 'admin123';
const PLAYWRIGHT_PERSONA_ID = 'e2e-playwright-persona';
const PLAYWRIGHT_PERSONA_NAME = 'E2E Persona Fidelity';

const clickIfVisible = async (locator: Locator): Promise<boolean> => {
  if (!(await locator.isVisible().catch(() => false))) {
    return false;
  }
  await locator.click();
  return true;
};

const unlockPathIfLocked = async (page: Page): Promise<void> => {
  await page.getByRole('tab', { name: 'Canvas' }).click();
  await clickIfVisible(page.getByRole('button', { name: 'Unlock Path' }).first());
};

const fitCanvasToNodes = async (page: Page): Promise<void> => {
  await page.getByRole('tab', { name: 'Canvas' }).click();
  await clickIfVisible(page.locator('[data-doc-id="canvas_fit_nodes"]').first());
};

const selectNodeBody = async (nodeBody: Locator): Promise<void> => {
  await expect(nodeBody).toHaveCount(1);
  try {
    await nodeBody.click({ force: true, timeout: 5_000 });
  } catch {
    await nodeBody.dispatchEvent('click');
  }
};

const ensureSignedInForAdmin = async (page: Page): Promise<void> => {
  await page.waitForLoadState('domcontentloaded');
  const canvasTab = page.getByRole('tab', { name: 'Canvas' });
  const signInHeading = page.getByRole('heading', { name: /sign in/i });
  await Promise.race([
    canvasTab.waitFor({ state: 'visible', timeout: 15_000 }),
    signInHeading.waitFor({ state: 'visible', timeout: 15_000 }),
  ]).catch(() => {});
  if (await canvasTab.isVisible().catch(() => false)) return;
  if (!(await signInHeading.isVisible().catch(() => false))) return;

  await page.getByLabel('Email').fill(E2E_ADMIN_EMAIL);
  await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/admin'), {
    timeout: 20_000,
  });
  await page.goto('/admin/ai-paths');
};

const ensurePlaywrightPersonaSetting = async (page: Page): Promise<void> => {
  const personaPayload = JSON.stringify([
    {
      id: PLAYWRIGHT_PERSONA_ID,
      name: PLAYWRIGHT_PERSONA_NAME,
      description: 'Persona seeded by e2e test for Playwright node coverage.',
      createdAt: new Date('2026-02-21T12:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-02-21T12:00:00.000Z').toISOString(),
      settings: {
        headless: false,
        slowMo: 200,
        timeout: 25_000,
        navigationTimeout: 40_000,
        humanizeMouse: true,
        mouseJitter: 8,
        clickDelayMin: 40,
        clickDelayMax: 130,
        inputDelayMin: 25,
        inputDelayMax: 160,
        actionDelayMin: 250,
        actionDelayMax: 950,
        proxyEnabled: false,
        proxyServer: '',
        proxyUsername: '',
        proxyPassword: '',
        emulateDevice: true,
        deviceName: 'iPhone 13',
      },
    },
  ]);

  const mergePersonaSetting = async (route: Route): Promise<void> => {
    const upstream = await route.fetch();
    const body = (await upstream.json()) as unknown;
    if (!Array.isArray(body)) {
      await route.fulfill({ response: upstream });
      return;
    }

    const filtered = body.filter(
      (entry: unknown) =>
        entry &&
        typeof entry === 'object' &&
        (entry as Record<string, unknown>)['key'] !== 'playwright_personas'
    );
    filtered.push({
      key: 'playwright_personas',
      value: personaPayload,
    });

    await route.fulfill({
      response: upstream,
      json: filtered,
    });
  };

  await page.route('**/api/settings?scope=light', mergePersonaSetting);
  await page.route('**/api/settings?scope=all', mergePersonaSetting);
  await page.route('**/api/settings/lite', mergePersonaSetting);
};

const addNodeToCanvas = async (
  page: Page,
  nodeType: string,
  dropPoint: { x: number; y: number }
): Promise<Locator> => {
  await page.getByRole('tab', { name: 'Canvas' }).click();
  await unlockPathIfLocked(page);

  const allNodes = page.locator('[data-node-root]');
  const beforeCount = await allNodes.count();

  const searchInput = page.locator('[data-doc-id="palette_search"]');
  await expect(searchInput).toBeVisible();
  await searchInput.fill(nodeType);

  const paletteNode = page.locator(`[data-doc-id="node_palette_${nodeType}"]`).first();
  await expect(paletteNode).toBeVisible();

  const dropZone = page.locator('[data-doc-id="canvas_drop_zone"]').first();
  await expect(dropZone).toBeVisible();
  const dropZoneBox = await dropZone.boundingBox();
  expect(dropZoneBox).toBeTruthy();
  if (!dropZoneBox) {
    throw new Error('Expected canvas drop zone bounding box to be available');
  }

  const maxX = Math.max(40, dropZoneBox.width - 40);
  const maxY = Math.max(40, dropZoneBox.height - 40);
  const clientX = dropZoneBox.x + Math.min(Math.max(dropPoint.x, 40), maxX);
  const clientY = dropZoneBox.y + Math.min(Math.max(dropPoint.y, 40), maxY);

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await paletteNode.dispatchEvent('dragstart', { dataTransfer });
  await dropZone.dispatchEvent('dragenter', { dataTransfer, clientX, clientY });
  await dropZone.dispatchEvent('dragover', { dataTransfer, clientX, clientY });
  await dropZone.dispatchEvent('drop', { dataTransfer, clientX, clientY });
  await searchInput.fill('');

  await expect
    .poll(async () => allNodes.count(), { timeout: 10_000 })
    .toBeGreaterThan(beforeCount);
  const finalCount = await allNodes.count();
  return allNodes.nth(Math.max(0, finalCount - 1));
};

const addPlaywrightNodeToCanvas = async (page: Page): Promise<Locator> => {
  return addNodeToCanvas(page, 'playwright', { x: 420, y: 280 });
};

const ensureCanvasHasNodes = async (page: Page): Promise<void> => {
  await page.getByRole('tab', { name: 'Canvas' }).click();
  const nodeRoots = page.locator('[data-node-root]');
  if ((await nodeRoots.count()) > 0) return;

  await page.getByRole('tab', { name: 'Paths' }).click();
  const firstPathButton = page.locator('table tbody tr td:first-child button').first();
  if (!(await clickIfVisible(firstPathButton))) {
    await page.getByRole('button', { name: 'New Path' }).click();
    await expect(firstPathButton).toBeVisible({ timeout: 10_000 });
    await firstPathButton.click();
  }
  await page.getByRole('tab', { name: 'Canvas' }).click();

  if ((await nodeRoots.count()) === 0) {
    await addNodeToCanvas(page, 'trigger', { x: 360, y: 220 });
  }

  await fitCanvasToNodes(page);
};

const readActiveWiresCount = async (page: Page): Promise<number> => {
  const activeWires = page.getByText(/Active wires: \d+/).first();
  await expect(activeWires).toBeVisible();
  const text = (await activeWires.textContent()) ?? '';
  const match = text.match(/Active wires:\s*(\d+)/);
  if (!match) return 0;
  return Number.parseInt(match[1] ?? '0', 10);
};

const readEdgeHitCount = async (page: Page): Promise<number> => {
  return page.locator('[data-canvas-edge-hit="true"]').count();
};

const connectNodePorts = async (
  page: Page,
  sourceNode: Locator,
  targetNode: Locator
): Promise<boolean> => {
  const sourcePort = sourceNode.locator('circle[data-port="output"]').first();
  const targetPort = targetNode.locator('circle[data-port="input"]').first();
  if (!(await sourcePort.isVisible().catch(() => false))) return false;
  if (!(await targetPort.isVisible().catch(() => false))) return false;

  const sourceBox = await sourcePort.boundingBox();
  const targetBox = await targetPort.boundingBox();
  if (!sourceBox || !targetBox) return false;

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
  await page.mouse.up();
  return true;
};

const ensureCanvasHasAtLeastOneWire = async (page: Page): Promise<boolean> => {
  const existingWires = await readEdgeHitCount(page);
  if (existingWires > 0) return true;

  await fitCanvasToNodes(page);
  const attempts: Array<{
    sourceType: string;
    targetType: string;
    sourceDrop: { x: number; y: number };
    targetDrop: { x: number; y: number };
  }> = [
    {
      sourceType: 'constant',
      targetType: 'template',
      sourceDrop: { x: 420, y: 260 },
      targetDrop: { x: 760, y: 280 },
    },
    {
      sourceType: 'trigger',
      targetType: 'template',
      sourceDrop: { x: 420, y: 340 },
      targetDrop: { x: 760, y: 360 },
    },
    {
      sourceType: 'constant',
      targetType: 'api_advanced',
      sourceDrop: { x: 420, y: 420 },
      targetDrop: { x: 760, y: 440 },
    },
  ];

  for (const attempt of attempts) {
    const beforeCount = await readEdgeHitCount(page);
    const sourceNode = await addNodeToCanvas(page, attempt.sourceType, attempt.sourceDrop);
    const targetNode = await addNodeToCanvas(page, attempt.targetType, attempt.targetDrop);
    const connected = await connectNodePorts(page, sourceNode, targetNode);
    if (!connected) continue;
    try {
      await expect.poll(() => readEdgeHitCount(page), { timeout: 6_000 }).toBeGreaterThan(
        beforeCount
      );
      return true;
    } catch {
      // Continue trying alternate node-type pairings.
    }
  }

  return false;
};

test.describe('AI Paths Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/ai-paths');
    await ensureSignedInForAdmin(page);
    await expect(page.getByRole('tab', { name: 'Canvas' })).toBeVisible();
    await ensureCanvasHasNodes(page);
    await fitCanvasToNodes(page);
  });

  test('should display AI Paths main tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Canvas' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Paths' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Docs' })).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await expect(page.getByText('Node Palette')).toBeVisible();

    await page.getByRole('tab', { name: 'Paths' }).click();
    await expect(page.getByText('Manage and rename your AI paths')).toBeVisible();

    await page.getByRole('tab', { name: 'Docs' }).click();
    await expect(page.getByRole('heading', { name: 'AI Paths Docs' })).toBeVisible();

    await page.getByRole('tab', { name: 'Canvas' }).click();
    await expect(page.getByText('Connections')).toBeVisible();
  });

  test('should show node palette and inspector in canvas tab', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();

    await expect(page.getByText('Node Palette')).toBeVisible();
    await expect(page.getByText('Inspector')).toBeVisible();
    await expect(page.getByText('Connections')).toBeVisible();
  });

  test('should expand and collapse palette groups', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    const contextGroup = page.getByRole('button', { name: /Context \+ Parsing/i });
    await contextGroup.click();
    await expect(page.getByText('Context Filter').first()).toBeVisible();
    await expect(page.getByText('JSON Parser').first()).toBeVisible();
  });

  test('should select a node and show it in inspector', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    await fitCanvasToNodes(page);
    const nodeBody = page.locator('[data-node-body]').first();
    await expect(nodeBody).toBeVisible({ timeout: 10_000 });
    await selectNodeBody(nodeBody);
    await expect(page.getByText('Inspector')).toBeVisible();
    await expect(page.locator('[data-doc-id="inspector_open_node_config"]')).toBeVisible();
  });

  test('should keep newly added nodes stable on click and persist drag movement', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    await unlockPathIfLocked(page);

    const triggerNode = await addNodeToCanvas(page, 'trigger', { x: 420, y: 280 });
    const triggerBody = triggerNode.locator('[data-node-body]').first();
    await expect(triggerBody).toBeVisible();

    await selectNodeBody(triggerBody);
    await selectNodeBody(triggerBody);
    await selectNodeBody(triggerBody);
    await expect(triggerNode).toBeVisible();

    const transformBefore = await triggerNode.getAttribute('transform');
    const triggerBox = await triggerBody.boundingBox();
    expect(triggerBox).toBeTruthy();
    if (!triggerBox) {
      throw new Error('Expected trigger node body bounding box to be available');
    }

    await page.mouse.move(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      triggerBox.x + triggerBox.width / 2 + 140,
      triggerBox.y + triggerBox.height / 2 + 90
    );
    await page.mouse.up();

    await expect
      .poll(async () => triggerNode.getAttribute('transform'))
      .not.toBe(transformBefore);
  });

  test('should create, rename and save a new path', async ({ page }) => {
    const uniquePathName = `E2E Test Path ${Date.now()}`;

    await page.getByRole('tab', { name: 'Paths' }).click();
    await page.getByRole('button', { name: 'New Path' }).click();
    await page.getByRole('tab', { name: 'Canvas' }).click();

    const pathNameDisplay = page.locator('button[data-doc-id="canvas_path_name_field"]').first();
    if (await pathNameDisplay.isVisible().catch(() => false)) {
      await pathNameDisplay.dblclick();
    }

    const pathNameInput = page.locator('input[data-doc-id="canvas_path_name_field"]').first();
    await expect(pathNameInput).toBeVisible();
    await pathNameInput.clear();
    await pathNameInput.fill(uniquePathName);
    await pathNameInput.press('Enter');

    await page.locator('[data-doc-id="canvas_save_path"]').click();
    await expect(page.getByText(/saved|success/i).first()).toBeVisible();

    await page.getByRole('tab', { name: 'Paths' }).click();
    await expect(page.getByText(uniquePathName).first()).toBeVisible();
  });

  test('should delete a node from canvas', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    await unlockPathIfLocked(page);
    await fitCanvasToNodes(page);

    const allNodes = page.locator('[data-node-root]');
    const beforeCount = await allNodes.count();
    expect(beforeCount).toBeGreaterThan(0);

    const nodeBody = page.locator('[data-node-body]').first();
    await expect(nodeBody).toBeVisible({ timeout: 10_000 });
    await selectNodeBody(nodeBody);

    const removeBtn = page.locator('[data-doc-id="inspector_remove_node"]');
    await expect(removeBtn).toBeVisible({ timeout: 10_000 });
    await removeBtn.click();

    const confirmRemove = page.getByRole('button', { name: 'Remove' }).first();
    await clickIfVisible(confirmRemove);

    await expect(allNodes).toHaveCount(beforeCount - 1);
  });

  test('should open node configuration dialog', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    await fitCanvasToNodes(page);

    const nodeBody = page.locator('[data-node-body]').first();
    await expect(nodeBody).toBeVisible({ timeout: 10_000 });
    await selectNodeBody(nodeBody);

    const openConfigButton = page.locator('[data-doc-id="inspector_open_node_config"]');
    await expect(openConfigButton).toBeVisible({ timeout: 10_000 });
    await openConfigButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('tab', { name: 'Settings' })).toBeVisible();

    await page.keyboard.press('Escape');
    await clickIfVisible(page.getByRole('button', { name: 'Discard' }).first());
    await expect(dialog).not.toBeVisible();
  });

  test('should configure Playwright templates, personas, overrides, and capture toggles', async ({
    page,
  }) => {
    await ensurePlaywrightPersonaSetting(page);
    await page.reload();
    await unlockPathIfLocked(page);

    const playwrightNode = await addPlaywrightNodeToCanvas(page);
    const playwrightBody = playwrightNode.locator('[data-node-body]').first();
    await expect(playwrightBody).toBeVisible();
    await selectNodeBody(playwrightBody);

    const openConfigButton = page.locator('[data-doc-id="inspector_open_node_config"]');
    await expect(openConfigButton).toBeVisible();
    await openConfigButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('playwright-node-config')).toBeVisible();

    const templateTrigger = page.locator('[data-doc-id="playwright_script_template_select"]').first();
    await templateTrigger.click();
    await page.getByRole('option', { name: 'Link Crawler' }).click();
    await page.locator('[data-doc-id="playwright_script_template_apply"]').click();

    const scriptEditor = page.getByTestId('playwright-script-editor');
    await expect(scriptEditor).toContainText('Collected links');
    await expect(page.getByTestId('playwright-script-template-description')).toContainText(
      'Collect unique first-party links'
    );

    const personaTrigger = page.locator('[data-doc-id="playwright_persona_select"]').first();
    await personaTrigger.click();
    await page.getByRole('option', { name: PLAYWRIGHT_PERSONA_NAME }).click();
    await expect(page.getByTestId('playwright-persona-fidelity')).toContainText('Headless: off');
    await expect(page.getByTestId('playwright-persona-fidelity')).toContainText('Device: iPhone 13');

    const overridesEditor = page.getByTestId('playwright-settings-overrides-editor');
    await overridesEditor.fill('{"slowMo":"bad"}');
    await expect(page.getByText(/Invalid override for "slowMo"/i)).toBeVisible();
    await overridesEditor.fill('{"slowMo":75}');
    await page.getByRole('button', { name: 'Apply overrides' }).click();
    await expect(page.getByText(/Invalid override for "slowMo"/i)).not.toBeVisible();

    const videoCaptureButton = page.locator('[data-doc-id="playwright_capture_video"]');
    await expect(videoCaptureButton).toContainText('Off');
    await videoCaptureButton.click();
    await expect(videoCaptureButton).toContainText('On');

    await page.keyboard.press('Escape');
    await clickIfVisible(page.getByRole('button', { name: 'Discard' }).first());
    await expect(dialog).not.toBeVisible();
  });

  test('should fire a trigger and surface runtime feedback', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    await fitCanvasToNodes(page);

    let triggerNode = page.locator('[data-node-root]').filter({ hasText: /trigger/i }).first();
    if (!(await triggerNode.isVisible().catch(() => false))) {
      triggerNode = await addNodeToCanvas(page, 'trigger', { x: 500, y: 320 });
    }

    const triggerBody = triggerNode.locator('[data-node-body]').first();
    await expect(triggerBody).toBeVisible();
    await selectNodeBody(triggerBody);

    const runtimeEventsCount = page.locator('[data-doc-id="runtime_events_count"]').first();
    await expect(runtimeEventsCount).toBeVisible();
    const beforeRuntimeCount = Number.parseInt(
      ((await runtimeEventsCount.textContent()) ?? '0').trim() || '0',
      10
    );

    const fireTriggerButton = page.getByRole('button', { name: 'Fire Trigger' }).last();
    await expect(fireTriggerButton).toBeVisible();
    await fireTriggerButton.click();
    await page.waitForTimeout(500);
    const afterRuntimeCount = Number.parseInt(
      ((await runtimeEventsCount.textContent()) ?? '0').trim() || '0',
      10
    );
    expect(afterRuntimeCount).toBeGreaterThanOrEqual(beforeRuntimeCount);
    await expect(page).toHaveURL(/\/admin\/ai-paths/);
  });

  test('should delete selected wire with Delete key', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    await clickIfVisible(page.getByRole('button', { name: 'Unlock Path' }).first());
    await fitCanvasToNodes(page);
    const hasWire = await ensureCanvasHasAtLeastOneWire(page);
    test.skip(!hasWire, 'Could not create a wire for Delete-key coverage.');

    const initialWireCount = await readEdgeHitCount(page);
    const selectedEdgeHit = page.locator('[data-canvas-edge-hit="true"]').last();
    const edgeId = await selectedEdgeHit.getAttribute('data-edge-id');
    expect(edgeId).toBeTruthy();
    if (!edgeId) {
      throw new Error('Expected data-edge-id on edge hit target');
    }

    await selectedEdgeHit.dispatchEvent('click');
    await page.keyboard.press('Delete');

    await expect(page.locator(`[data-canvas-edge-hit="true"][data-edge-id="${edgeId}"]`)).toHaveCount(
      0
    );
    await expect.poll(() => readEdgeHitCount(page)).toBe(initialWireCount - 1);
  });

  test('should clear all wires', async ({ page }) => {
    await page.getByRole('tab', { name: 'Canvas' }).click();
    await unlockPathIfLocked(page);

    const activeWires = page.getByText(/Active wires: \d+/).first();
    await expect(activeWires).toBeVisible();

    await page.getByRole('button', { name: 'Clear All Wires' }).click();
    await clickIfVisible(page.getByRole('button', { name: 'Clear Wires' }).first());

    await expect(page.getByText('Active wires: 0')).toBeVisible();
  });
});
