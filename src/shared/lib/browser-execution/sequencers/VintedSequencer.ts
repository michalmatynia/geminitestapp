import { PlaywrightSequencer, PlaywrightSequencerContext } from './PlaywrightSequencer';
import { StepId } from '../step-registry';
import { Page } from 'playwright';

import { 
  VINTED_TITLE_SELECTORS, 
  VINTED_DESCRIPTION_SELECTORS, 
  VINTED_PRICE_SELECTORS,
  VINTED_CATEGORY_SELECTORS,
  VINTED_CATEGORY_OPTION_SELECTORS,
  VINTED_SUBMIT_SELECTORS,
  VINTED_IMAGE_UPLOAD_SELECTORS,
  VINTED_BRAND_SELECTORS,
  VINTED_CONDITION_SELECTORS
} from '@/features/integrations/services/vinted-listing/config';

export class VintedSequencer extends PlaywrightSequencer {
  constructor(context: PlaywrightSequencerContext) {
    super(context);
  }

  protected async executeStep(stepId: StepId): Promise<void> {
    const { page } = this.context;

    switch (stepId) {
      case 'browser_preparation':
        await page.setViewportSize({ width: 375, height: 812 });
        break;
      case 'browser_open':
        await page.goto('https://www.vinted.pl');
        break;
      case 'auth_check': {
        const isAuth = await this.checkLoggedIn(page);
        if (!isAuth) {
          throw new Error('AUTH_REQUIRED: Vinted session is not active.');
        }
        break;
      }
      case 'list_title': {
        const helpers = this.context.helpers as { title?: string };
        await this.withRetry(() => page.locator(VINTED_TITLE_SELECTORS.join(', ')).first().fill(helpers?.title ?? ''), { context: 'list_title' });
        break;
      }
      case 'list_description': {
        const helpers = this.context.helpers as { description?: string };
        await this.withRetry(() => page.locator(VINTED_DESCRIPTION_SELECTORS.join(', ')).first().fill(helpers?.description ?? ''), { context: 'list_description' });
        break;
      }
      case 'list_price': {
        const helpers = this.context.helpers as { price?: string };
        await this.withRetry(() => page.locator(VINTED_PRICE_SELECTORS.join(', ')).first().fill(helpers?.price ?? '0'), { context: 'list_price' });
        break;
      }
      case 'list_image': {
        const helpers = this.context.helpers as { imagePath?: string };
        if (helpers?.imagePath) {
          await page.locator(VINTED_IMAGE_UPLOAD_SELECTORS.join(', ')).first().setInputFiles(helpers.imagePath);
        }
        break;
      }
      case 'list_brand': {
        const helpers = this.context.helpers as { brand?: string };
        if (helpers?.brand) {
          const input = page.locator(VINTED_BRAND_SELECTORS.join(', ')).first();
          await this.withRetry(() => input.fill(helpers.brand!), { context: 'list_brand' });
        }
        break;
      }
      case 'list_condition': {
        const helpers = this.context.helpers as { condition?: string };
        if (helpers?.condition) {
          const trigger = page.locator(VINTED_CONDITION_SELECTORS.join(', ')).first();
          await trigger.click();
          await this.wait(500);
          const option = page.locator('[role="option"]').filter({ hasText: helpers.condition }).first();
          await option.click();
        }
        break;
      }
      case 'category_selection': {
        const helpers = this.context.helpers as { categoryPath?: string };
        if (helpers?.categoryPath) {
          await this.selectVintedCategoryPath(helpers.categoryPath);
        }
        break;
      }
      case 'publish': {
        await this.withRetry(async () => {
          const submitButton = page.locator(VINTED_SUBMIT_SELECTORS.join(', ')).first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
          } else {
            throw new Error('FAIL_PUBLISH: Publish button not found.');
          }
        }, { context: 'publish' });
        break;
      }
      default:
        console.warn(`Step ${stepId} not implemented for VintedSequencer.`);
    }
  }

  private async selectVintedCategoryPath(path: string) {
    const { page } = this.context;
    const segments = path.split('>').map((s) => s.trim());
    
    // Open category menu
    const trigger = page.locator(VINTED_CATEGORY_SELECTORS.join(', ')).first();
    await trigger.click();
    await page.waitForTimeout(500);

    for (const segment of segments) {
      const option = page.locator(VINTED_CATEGORY_OPTION_SELECTORS.join(', ')).filter({ hasText: segment }).first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
      } else {
        throw new Error(`FAIL_CATEGORY_SET: Category segment "${segment}" not found.`);
      }
    }
  }

  private async checkLoggedIn(page: Page): Promise<boolean> {
    const selectors = [
      'button[aria-label*="Profil"], button[aria-label*="Profile"]',
      'a[href*="/settings"]',
      'button:has-text("Wyloguj")',
      'button:has-text("Log out")',
    ];
    for (const selector of selectors) {
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count > 0) {
        return true;
      }
    }
    return false;
  }
}
