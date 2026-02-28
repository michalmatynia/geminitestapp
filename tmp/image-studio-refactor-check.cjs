const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function ensureFixtureImage() {
  const dir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'fixture-1x1.png');
  if (!fs.existsSync(file)) {
    const b64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn6QnYAAAAASUVORK5CYII=';
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
  }
  return file;
}

(async () => {
  const imagePath = ensureFixtureImage();
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const page = await browser.newPage();
  const base = 'http://localhost:3000';
  const out = {
    login: false,
    uploadFromComputerVisible: false,
    slotFileCreated: false,
    slotSelectedVisibleInPreview: false,
    deselectToEmptySlotWorks: false,
    folderA: false,
    folderB: false,
    slotMovedToFolderB: false,
    extractButtonVisible: false,
    extractModalOpens: false,
    errors: [],
  };

  page.on('pageerror', (err) => out.errors.push(`pageerror:${err.message}`));

  try {
    await page.goto(base + '/auth/signin', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page
      .locator('input[name="email"], input[type="email"]')
      .first()
      .fill('e2e.admin@example.com');
    await page
      .locator('input[name="password"], input[type="password"]')
      .first()
      .fill('E2eAdmin!123');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}),
      page.locator('button[type="submit"], button:has-text("Sign in")').first().click(),
    ]);
    out.login = true;

    await page.goto(base + '/admin/image-studio', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(1400);

    out.extractButtonVisible =
      (await page
        .getByRole('button', { name: /extract functions and selectors from prompt|extract/i })
        .count()) > 0;

    // Open import modal and upload from computer
    await page
      .getByRole('button', { name: /upload image/i })
      .first()
      .click();
    await page.waitForTimeout(300);
    const uploadBtn = page.getByRole('button', { name: /upload from computer/i }).first();
    out.uploadFromComputerVisible = (await uploadBtn.count()) > 0;
    if (out.uploadFromComputerVisible) {
      const chooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
      await uploadBtn.click();
      const chooser = await chooserPromise;
      await chooser.setFiles(imagePath);
      await page.waitForTimeout(1600);
    }

    // select newest slot file
    const slotNode = page.locator('button[draggable="true"]').filter({ hasText: /slot/i }).first();
    if (await slotNode.count()) {
      out.slotFileCreated = true;
      await slotNode.click();
      await page.waitForTimeout(500);
      out.slotSelectedVisibleInPreview =
        (await page.getByRole('button', { name: /empty slot/i }).count()) > 0;
    }

    // click tree background to deselect
    await page
      .locator('.h-full.overflow-auto.rounded')
      .first()
      .click({ position: { x: 8, y: 8 } })
      .catch(() => {});
    await page.waitForTimeout(500);
    out.deselectToEmptySlotWorks =
      (await page.getByRole('button', { name: /empty slot/i }).count()) === 0;

    // folder creation and move
    const createFolder = async (name) => {
      await page
        .getByRole('button', { name: /^folder$/i })
        .first()
        .click();
      await page.waitForTimeout(200);
      const dialog = page.locator('[role="dialog"]').last();
      await dialog.locator('input').first().fill(name);
      await dialog
        .getByRole('button', { name: /create folder/i })
        .first()
        .click();
      await page.waitForTimeout(650);
      return (await page.locator(`button[draggable=\"true\"]:has-text(\"${name}\")`).count()) > 0;
    };

    const folderA = `assets-a-${Date.now()}`;
    const folderB = `assets-b-${Date.now()}`;
    out.folderA = await createFolder(folderA);
    out.folderB = await createFolder(folderB);

    const slotForMove = page
      .locator('button[draggable="true"]')
      .filter({ hasText: /slot/i })
      .first();
    const folderBNode = page
      .locator('button[draggable="true"]')
      .filter({ hasText: folderB })
      .first();
    if ((await slotForMove.count()) && (await folderBNode.count())) {
      await slotForMove.dragTo(folderBNode);
      await page.waitForTimeout(900);
      const hasError = await page.locator('text=/failed|invalid payload|error/i').count();
      out.slotMovedToFolderB = hasError === 0;
    }

    // extract modal opens
    const extractBtn = page
      .getByRole('button', { name: /extract functions and selectors from prompt|extract/i })
      .first();
    if (await extractBtn.count()) {
      await extractBtn.click();
      await page.waitForTimeout(350);
      out.extractModalOpens =
        (await page.locator('text=/extract prompt params|programmatic extract/i').count()) > 0;
    }
  } catch (error) {
    out.errors.push(`fatal:${error.message}`);
  }

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
