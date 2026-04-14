import { PlaywrightSequencer, PlaywrightSequencerContext } from './PlaywrightSequencer';
import { StepId } from './step-registry';
import { TRADERA_COOKIE_ACCEPT_SELECTORS } from '@/features/integrations/services/tradera-listing/config';

export class TraderaSequencer extends PlaywrightSequencer {
  constructor(context: PlaywrightSequencerContext) {
    super(context);
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
        await this.acceptCookies(TRADERA_COOKIE_ACCEPT_SELECTORS);
        break;
      case 'auth_check': {
        const isAuth = await this.checkAuthStatus(page);
        if (!isAuth) throw new Error('AUTH_REQUIRED: Tradera session not found.');
        break;
      }
      case 'sell_page_open':
        await page.goto('https://www.tradera.com/en/sell');
        break;
      default:
        console.warn(`Step ${stepId} not implemented for TraderaSequencer.`);
      }
      }

      private async checkAuthStatus(_page: Page): Promise<boolean> {
      const profileSelector = '[data-testid="user-profile"], a[href*="/my/"]';
      const isVisible = await this.context.page.locator(profileSelector).first().isVisible();
      const url = this.context.page.url();
      return isVisible || url.includes('/my/');
      }
      }
