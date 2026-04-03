import fs from 'node:fs';

let content1 = fs.readFileSync('src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx', 'utf8');
content1 = content1.replace(
  `} from './traderaQuickListFeedback';\nimport type { TraderaQuickListFeedbackStatus } from './traderaQuickListFeedback';`,
  `} from '@/features/integrations/public';\nimport type { TraderaQuickListFeedbackStatus } from '@/features/integrations/public';`
);
// just in case single import was used:
content1 = content1.replace(`from './traderaQuickListFeedback';`, `from '@/features/integrations/public';`);
fs.writeFileSync('src/features/products/components/list/columns/buttons/TraderaQuickListButton.tsx', content1);

let content2 = fs.readFileSync('src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx', 'utf8');
content2 = content2.replace(`from './traderaQuickListFeedback';`, `from '@/features/integrations/public';`);
fs.writeFileSync('src/features/products/components/list/columns/buttons/TraderaStatusButton.tsx', content2);

let content3 = fs.readFileSync('src/features/products/hooks/product-list/useProductListModals.ts', 'utf8');
content3 = content3.replace(`from '@/features/products/components/list/columns/buttons/traderaQuickListFeedback';`, `from '@/features/integrations/public';`);
fs.writeFileSync('src/features/products/hooks/product-list/useProductListModals.ts', content3);

console.log('Fixed missing types');
