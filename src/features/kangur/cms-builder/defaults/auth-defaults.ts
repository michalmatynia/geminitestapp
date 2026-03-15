// @ts-nocheck
import type { PageComponentInput } from '@/shared/contracts/cms';
import {
  makeBlockSection,
  makeWidgetBlock,
  withOrders,
} from '../project-factories';

export const createDefaultAuthScreenComponents = (): PageComponentInput[] =>
  withOrders([
    makeBlockSection({
      id: 'kangur-auth-login-panel',
      blocks: [makeWidgetBlock('kangur-widget-auth-login-panel', 'game-screen')],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    }),
  ]);
