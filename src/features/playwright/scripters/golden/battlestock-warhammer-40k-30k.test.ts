import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadScripterFromJson } from '../loader';
import { resolveScripterImportSource } from '../scripter-import-source';
import { createFixtureDriver } from '../test-utils/fixture-driver';
import type { ScripterDefinition } from '../types';

const loadBattleStockDefinition = async (): Promise<string> =>
  await readFile(
    join(process.cwd(), 'data/scripters/battlestock-warhammer-40k-30k.json'),
    'utf8'
  );

const pageOneHtml = `
<html>
  <body>
    <product-list>
      <product-tile
        product-id="13033"
        name="40k spiritseer"
        price="60"
        producer="Games Workshop"
        category="Eldar / Aeldari"
        currency="PLN"
      >
        <product-link>
          <a href="/pl/p/40k-spiritseer/13033" title="40k spiritseer">40k spiritseer</a>
        </product-link>
        <picture class="image product-tile__image_primary">
          <img src="/environment/cache/images/productGfx_34831_1500_1500/40k-spiritseer.jpg" />
        </picture>
      </product-tile>
    </product-list>
    <div class="product-list__footer">
      <a
        href="https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45/2"
        class="btn pagination__button pagination__button_with-text"
        aria-label="Następne produkty"
      >Next</a>
    </div>
  </body>
</html>`;

const pageTwoHtml = `
<html>
  <body>
    <product-list>
      <product-tile
        product-id="13034"
        name="40k wraithlord"
        price="180"
        producer="Games Workshop"
        category="Eldar / Aeldari"
        currency="PLN"
      >
        <product-link>
          <a href="/pl/p/40k-wraithlord/13034" title="40k wraithlord">40k wraithlord</a>
        </product-link>
        <picture class="image product-tile__image_primary">
          <img src="/environment/cache/images/productGfx_34832_1500_1500/40k-wraithlord.jpg" />
        </picture>
      </product-tile>
    </product-list>
  </body>
</html>`;

type LoadedScripterResult = ReturnType<typeof loadScripterFromJson>;
type ScripterDraft = Awaited<ReturnType<typeof resolveScripterImportSource>>['drafts'][number];

const expectLoadedDefinition = (loaded: LoadedScripterResult): ScripterDefinition => {
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) throw new Error('Expected BattleStock definition to load');
  return loaded.definition;
};

const expectSpiritseerDraft = (draft: ScripterDraft | undefined): void => {
  expect(draft?.externalId).toBe('13033');
  expect(draft?.draft.name).toBe('40k spiritseer');
  expect(draft?.draft.price).toBe(60);
  expect(draft?.draft.supplierLink).toBe(
    'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033'
  );
  expect(draft?.draft.imageLinks).toEqual([
    '/environment/cache/images/productGfx_34831_1500_1500/40k-spiritseer.jpg',
  ]);
  expect(draft?.issues).toEqual([]);
};

const expectWraithlordDraft = (draft: ScripterDraft | undefined): void => {
  expect(draft?.externalId).toBe('13034');
  expect(draft?.draft.name).toBe('40k wraithlord');
  expect(draft?.draft.price).toBe(180);
};

describe('BattleStock Warhammer 40k / 30k golden scripter', () => {
  it('extracts product tile identity, price, URL, and images across pagination', async () => {
    const loaded = loadScripterFromJson(await loadBattleStockDefinition());
    const definition = expectLoadedDefinition(loaded);

    const driver = createFixtureDriver({
      initialUrl: 'https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45',
      onClickResolveHref: true,
      pages: [
        {
          url: 'https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45',
          html: pageOneHtml,
        },
        {
          url: 'https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45/2',
          html: pageTwoHtml,
        },
      ],
    });

    const result = await resolveScripterImportSource(definition, driver, {
      catalogDefaults: { catalogIds: ['catalog-battlestock'] },
    });

    expect(result.drafts).toHaveLength(2);
    expect(result.source.scripterId).toBe('battlestock-warhammer-40k-30k');

    const [spiritseer, wraithlord] = result.drafts;
    expectSpiritseerDraft(spiritseer);
    expectWraithlordDraft(wraithlord);
  });
});
