import { PlaywrightSequencer, PlaywrightSequencerContext } from './PlaywrightSequencer';
import { StepId } from './step-registry';
import { 
  VINTED_COOKIE_ACCEPT_SELECTORS, 
  VINTED_LOGIN_SUCCESS_SELECTORS 
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
      case 'cookie_accept':
        await this.acceptCookies(VINTED_COOKIE_ACCEPT_SELECTORS as unknown as string[]);
        break;
      case 'auth_check': {
        const isLoggedIn = await this.checkLoggedIn(page);
        if (!isLoggedIn) {
          throw new Error('AUTH_REQUIRED: Vinted session is not active.');
        }
        break;
      }
      default:
        console.warn(`Step ${stepId} not implemented for VintedSequencer.`);
    }
  }

  private async checkLoggedIn(page: Page): Promise<boolean> {
    for (const selector of VINTED_LOGIN_SUCCESS_SELECTORS) {
      const isVisible = await page.evaluate((s) => !!document.querySelector(s), selector as string);
      if (isVisible) {
        return true;
      }
    }
    return false;
  }
}
