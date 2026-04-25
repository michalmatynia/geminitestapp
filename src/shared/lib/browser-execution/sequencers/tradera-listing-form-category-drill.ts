import type { Page } from 'playwright';

import type { TraderaListingFormCategoryPickerItem } from './tradera-listing-form-category-picker';
import { clickAndReadTraderaListingFormPostSelectionCategoryItem } from './tradera-listing-form-category-post-selection';
import {
  clickTraderaListingFormCategoryPickerItemByName,
  closeTraderaListingFormCategoryPicker,
  openTraderaListingFormCategoryPicker,
} from './tradera-listing-form-category-picker-automation';
import {
  readTraderaListingFormPostSelectionCategoryItems,
  readTraderaListingFormCategoryPickerItems,
  readTraderaListingFormCategoryPickerOptionNames,
  shouldUseReopenedTraderaListingFormCategoryPickerItems,
  type TraderaListingFormCategoryPickerUpdateResult,
  waitForTraderaListingFormCategoryPickerUpdate,
} from './tradera-listing-form-category-picker-state';

type WaitFn = (ms: number) => Promise<void>;

type PageAutomationInput = {
  page: Page;
  wait: WaitFn;
};

type CategoryClickContinuation = {
  canContinue: boolean;
  postSelectionItems: TraderaListingFormCategoryPickerItem[];
};

type CurrentPostSelectionContinuation = {
  startIndex: number;
  postSelectionItems: TraderaListingFormCategoryPickerItem[];
};

const categoryItemMatches = (
  left: TraderaListingFormCategoryPickerItem,
  right: TraderaListingFormCategoryPickerItem
): boolean =>
  (left.id.length > 0 && right.id.length > 0 && left.id === right.id) ||
  left.name.trim().toLowerCase() === right.name.trim().toLowerCase();

const reopenPickerAfterClosedCategorySelection = async ({
  clickedItem,
  nextItem,
  optionsBefore,
  page,
  wait,
}: PageAutomationInput & {
  clickedItem: TraderaListingFormCategoryPickerItem;
  nextItem: TraderaListingFormCategoryPickerItem | null;
  optionsBefore: string[];
}): Promise<boolean> => {
  const reopened = await openTraderaListingFormCategoryPicker({ page, wait });
  if (!reopened) return false;

  const reopenedItems = await readTraderaListingFormCategoryPickerItems(page);
  const shouldUseReopenedItems =
    shouldUseReopenedTraderaListingFormCategoryPickerItems({
      clickedName: clickedItem.name,
      nextName: nextItem?.name ?? null,
      optionsBefore,
      reopenedItems,
    });
  if (shouldUseReopenedItems) return true;

  await closeTraderaListingFormCategoryPicker({ page, wait });
  return false;
};

const ensurePickerCanContinueAfterCategoryClick = async ({
  clickedItem,
  nextItem,
  optionsBefore,
  page,
  selectedPath,
  update,
  wait,
}: PageAutomationInput & {
  clickedItem: TraderaListingFormCategoryPickerItem;
  nextItem: TraderaListingFormCategoryPickerItem | null;
  optionsBefore: string[];
  selectedPath: TraderaListingFormCategoryPickerItem[];
  update: TraderaListingFormCategoryPickerUpdateResult;
}): Promise<CategoryClickContinuation> => {
  if (!update.pickerVisible) {
    const postSelectionItems = await readTraderaListingFormPostSelectionCategoryItems({
      nextName: nextItem?.name ?? null,
      optionsBefore,
      page,
      path: selectedPath,
    });
    if (postSelectionItems.length > 0) {
      return { canContinue: true, postSelectionItems };
    }

    const reopened = await reopenPickerAfterClosedCategorySelection({
      clickedItem,
      nextItem,
      optionsBefore,
      page,
      wait,
    });
    return { canContinue: reopened, postSelectionItems: [] };
  }

  if (update.updated) return { canContinue: true, postSelectionItems: [] };

  await closeTraderaListingFormCategoryPicker({ page, wait });
  return { canContinue: false, postSelectionItems: [] };
};

const clickPostSelectionPathItem = async ({
  item,
  nextItem,
  optionsBefore,
  page,
  pathToItem,
  wait,
}: PageAutomationInput & {
  item: TraderaListingFormCategoryPickerItem;
  nextItem: TraderaListingFormCategoryPickerItem | null;
  optionsBefore: string[];
  pathToItem: TraderaListingFormCategoryPickerItem[];
}): Promise<CategoryClickContinuation> => {
  const result = await clickAndReadTraderaListingFormPostSelectionCategoryItem({
    name: item.name,
    nextName: nextItem?.name ?? null,
    optionsBefore,
    page,
    path: pathToItem,
    wait,
  });
  return { canContinue: result.clicked, postSelectionItems: result.childItems };
};

const readPathOptionsBefore = async ({
  page,
  postSelectionItems,
}: {
  page: Page;
  postSelectionItems: TraderaListingFormCategoryPickerItem[];
}): Promise<string[]> =>
  postSelectionItems.length > 0
    ? postSelectionItems.map((categoryItem) => categoryItem.name)
    : readTraderaListingFormCategoryPickerOptionNames(page);

const clickCategoryPathItem = async ({
  item,
  nextItem,
  optionsBefore,
  page,
  pathToItem,
  postSelectionItems,
  wait,
}: PageAutomationInput & {
  item: TraderaListingFormCategoryPickerItem;
  nextItem: TraderaListingFormCategoryPickerItem | null;
  optionsBefore: string[];
  pathToItem: TraderaListingFormCategoryPickerItem[];
  postSelectionItems: TraderaListingFormCategoryPickerItem[];
}): Promise<CategoryClickContinuation> =>
  postSelectionItems.some((candidate) => categoryItemMatches(candidate, item))
    ? clickPostSelectionPathItem({
        item,
        nextItem,
        optionsBefore,
        page,
        pathToItem,
        wait,
      })
    : clickPickerPathItem({
        item,
        nextItem,
        optionsBefore,
        page,
        pathToItem,
        wait,
      });

const readDrilledCategoryItems = async ({
  page,
  postSelectionItems,
}: {
  page: Page;
  postSelectionItems: TraderaListingFormCategoryPickerItem[];
}): Promise<TraderaListingFormCategoryPickerItem[]> =>
  postSelectionItems.length > 0
    ? postSelectionItems
    : readTraderaListingFormCategoryPickerItems(page);

/* eslint-disable no-await-in-loop -- Prefix probing checks likely selected category depths from deepest to shallowest. */
const findCurrentPostSelectionContinuation = async ({
  page,
  path,
}: {
  page: Page;
  path: TraderaListingFormCategoryPickerItem[];
}): Promise<CurrentPostSelectionContinuation | null> => {
  for (let prefixLength = path.length - 1; prefixLength > 0; prefixLength -= 1) {
    const nextItem = path[prefixLength];
    if (nextItem === undefined) continue;

    const postSelectionItems = await readTraderaListingFormPostSelectionCategoryItems({
      nextName: nextItem.name,
      optionsBefore: [],
      page,
      path: path.slice(0, prefixLength),
    });
    if (postSelectionItems.some((candidate) => categoryItemMatches(candidate, nextItem))) {
      return { startIndex: prefixLength, postSelectionItems };
    }
  }

  return null;
};
/* eslint-enable no-await-in-loop */

const prepareCategoryDrillStart = async ({
  page,
  path,
  wait,
}: PageAutomationInput & {
  path: TraderaListingFormCategoryPickerItem[];
}): Promise<CurrentPostSelectionContinuation | null> => {
  const currentContinuation = await findCurrentPostSelectionContinuation({ page, path });
  if (currentContinuation !== null) return currentContinuation;

  const opened = await openTraderaListingFormCategoryPicker({ page, wait });
  return opened ? { startIndex: 0, postSelectionItems: [] } : null;
};

/* eslint-disable no-await-in-loop -- Category path traversal is serial because each click changes the active picker or page-level category surface. */
export const drillAndReadTraderaListingFormCategoryPath = async ({
  page,
  path,
  wait,
}: PageAutomationInput & {
  path: TraderaListingFormCategoryPickerItem[];
}): Promise<TraderaListingFormCategoryPickerItem[] | null> => {
  const start = await prepareCategoryDrillStart({ page, path, wait });
  if (start === null) return null;

  let postSelectionItems = start.postSelectionItems;

  for (let index = start.startIndex; index < path.length; index += 1) {
    const item = path[index];
    if (item === undefined) continue;

    const pathToItem = path.slice(0, index + 1);
    const nextItem = path[index + 1] ?? null;
    const optionsBefore = await readPathOptionsBefore({ page, postSelectionItems });
    const continuation = await clickCategoryPathItem({
      item,
      nextItem,
      optionsBefore,
      page,
      pathToItem,
      postSelectionItems,
      wait,
    });

    if (!continuation.canContinue) return null;
    postSelectionItems = continuation.postSelectionItems;
  }

  const items = await readDrilledCategoryItems({ page, postSelectionItems });
  await closeTraderaListingFormCategoryPicker({ page, wait });
  return items;
};
/* eslint-enable no-await-in-loop */

const clickPickerPathItem = async ({
  item,
  nextItem,
  optionsBefore,
  page,
  pathToItem,
  wait,
}: PageAutomationInput & {
  item: TraderaListingFormCategoryPickerItem;
  nextItem: TraderaListingFormCategoryPickerItem | null;
  optionsBefore: string[];
  pathToItem: TraderaListingFormCategoryPickerItem[];
}): Promise<CategoryClickContinuation> => {
  const clicked = await clickTraderaListingFormCategoryPickerItemByName({
    name: item.name,
    page,
    wait,
  });
  if (!clicked) {
    await closeTraderaListingFormCategoryPicker({ page, wait });
    return { canContinue: false, postSelectionItems: [] };
  }

  const update = await waitForTraderaListingFormCategoryPickerUpdate({
    optionsBefore,
    page,
    wait,
  });
  return ensurePickerCanContinueAfterCategoryClick({
    clickedItem: item,
    nextItem,
    optionsBefore,
    page,
    selectedPath: pathToItem,
    update,
    wait,
  });
};
