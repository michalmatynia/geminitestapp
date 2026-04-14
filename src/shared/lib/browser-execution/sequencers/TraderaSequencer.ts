import { PlaywrightSequencer, PlaywrightSequencerContext } from './PlaywrightSequencer';
import { StepId } from '../step-registry';
import { 
  TITLE_SELECTORS, 
  DESCRIPTION_SELECTORS, 
  PRICE_SELECTORS, 
  QUANTITY_SELECTORS,
  CATEGORY_FIELD_LABELS,
  PUBLISH_SELECTORS,
  EAN_SELECTORS,
  BRAND_SELECTORS,
  WEIGHT_SELECTORS,
  IMAGE_INPUT_SELECTORS,
  DRAFT_IMAGE_REMOVE_SELECTORS
} from '../selectors/tradera';
import { TRADERA_COOKIE_ACCEPT_SELECTORS } from '@/features/integrations/services/tradera-listing/config';
import { Page } from 'playwright';

export class TraderaSequencer extends PlaywrightSequencer {
  constructor(context: PlaywrightSequencerContext) {
    super(context);
  }

  private async fillInput(selectors: string[], value: string): Promise<void> {
    const { page } = this.context;
    for (const selector of selectors) {
      const locator = page.locator(selector);
      if (await locator.isVisible({ timeout: 500 })) {
        await locator.fill(value);
        return;
      }
    }
    throw new Error(`Could not find input for selectors: ${selectors.join(', ')}`);
  }

  protected async executeStep(stepId: StepId): Promise<void> {
    const { page } = this.context;

    switch (stepId) {
      case 'browser_preparation':
        await page.setViewportSize({ width: 1280, height: 800 });
        break;
      case 'browser_open':
        await page.goto('https://www.tradera.com');
        break;
      case 'cookie_accept':
        await this.acceptCookies(TRADERA_COOKIE_ACCEPT_SELECTORS as string[]);
        break;
      case 'auth_check': {
        const isAuth = await this.checkAuthStatus(page);
        if (!isAuth) throw new Error('AUTH_REQUIRED: Tradera session not found.');
        break;
      }
      case 'sell_page_open':
        await page.goto('https://www.tradera.com/en/sell');
        break;
      case 'list_title': {
        const helpers = this.context.helpers as { title?: string };
        const title = helpers?.title ?? 'Default Title';
        await this.withRetry(() => this.fillInput(TITLE_SELECTORS, title), { context: 'list_title' });
        break;
      }
      case 'list_description': {
        const helpers = this.context.helpers as { description?: string };
        const desc = helpers?.description ?? 'Default Description';
        await this.withRetry(() => this.fillInput(DESCRIPTION_SELECTORS, desc), { context: 'list_description' });
        break;
      }
      case 'list_price': {
        const helpers = this.context.helpers as { price?: string };
        const price = helpers?.price || '0';
        await this.withRetry(() => this.fillInput(PRICE_SELECTORS, price), { context: 'list_price' });
        break;
      }
      case 'list_quantity': {
        const helpers = this.context.helpers as { quantity?: string };
        const quantity = helpers?.quantity || '1';
        await this.withRetry(() => this.fillInput(QUANTITY_SELECTORS, quantity), { context: 'list_quantity' });
        break;
      }
      case 'list_image': {
        const helpers = this.context.helpers as { imagePath?: string };
        if (helpers?.imagePath) {
          const input = page.locator(IMAGE_INPUT_SELECTORS.join(', ')).first();
          await input.setInputFiles(helpers.imagePath);
        }
        break;
      }
      case 'clear_draft_images': {
        const removeButtons = page.locator(DRAFT_IMAGE_REMOVE_SELECTORS.join(', '));
        const count = await removeButtons.count();
        for (let i = 0; i < count; i++) {
          await removeButtons.nth(i).click().catch(() => undefined);
        }
        break;
      }
      case 'list_ean': {
        const helpers = this.context.helpers as { ean?: string };
        if (helpers?.ean) await this.withRetry(() => this.fillInput(EAN_SELECTORS, helpers.ean!), { context: 'list_ean' });
        break;
      }
      case 'list_brand': {
        const helpers = this.context.helpers as { brand?: string };
        if (helpers?.brand) await this.withRetry(() => this.fillInput(BRAND_SELECTORS, helpers.brand!), { context: 'list_brand' });
        break;
      }
      case 'list_weight': {
        const helpers = this.context.helpers as { weight?: string };
        if (helpers?.weight) await this.withRetry(() => this.fillInput(WEIGHT_SELECTORS, helpers.weight!), { context: 'list_weight' });
        break;
      }
      case 'category_picker_open': {
        const trigger = await this.findFieldTriggerByLabels(CATEGORY_FIELD_LABELS as string[]);
        if (trigger) {
          await trigger.click();
        } else {
          throw new Error('FAIL_CATEGORY_SET: Category selector trigger not found.');
        }
        break;
      }
      case 'category_selection': {
        const helpers = this.context.helpers as { categoryPath?: string };
        if (helpers?.categoryPath) {
          await this.selectCategoryPath(helpers.categoryPath);
        }
        break;
      }
      case 'publish': {
        await this.withRetry(async () => {
          const publishButton = page.locator(PUBLISH_SELECTORS.join(', ')).first();
          if (await publishButton.isVisible()) {
            await publishButton.click();
          } else {
            await this.captureArtifacts('tradera-publish-failed');
            throw new Error('FAIL_PUBLISH: Publish button not found.');
          }
        }, { context: 'publish' });
        break;
      }
      default:
        console.warn(`Step ${stepId} not implemented for TraderaSequencer.`);
    }
  }

  private async findFieldTriggerByLabels(labels: string[]) {
    const { page } = this.context;
    for (const label of labels) {
      const trigger = page.locator(`button:has-text("${label}"), [aria-label*="${label}"]`).first();
      if (await trigger.isVisible({ timeout: 1000 })) return trigger;
    }
    return null;
  }

  private async selectCategoryPath(path: string) {
    const { page } = this.context;
    const segments = path.split('>').map((s) => s.trim());
    for (const segment of segments) {
      const option = page.locator(`[role="menuitem"], [role="option"]`).filter({ hasText: segment }).first();
      await option.click();
      await page.waitForLoadState('networkidle').catch(() => undefined);
    }
  }

  private async checkAuthStatus(page: Page): Promise<boolean> {
    const profileSelector = '[data-testid="user-profile"], a[href*="/my/"]';
    const isVisible = await page.locator(profileSelector).first().isVisible();
    return isVisible || page.url().includes('/my/');
  }
}
