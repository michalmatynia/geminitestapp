export const TITLE_SELECTORS = [
  'input[name="shortDescription"]',
  '#shortDescription',
  'input[name="title"]',
  '#title',
  '[data-testid*="title"] input',
  'input[placeholder*="headline" i]',
  'input[placeholder*="rubrik" i]',
  'input[aria-label*="title" i]',
  'input[aria-label*="titel" i]',
  'input[aria-label*="rubrik" i]',
];

export const DESCRIPTION_SELECTORS = [
  '#tip-tap-editor',
  '[aria-label="Description"][contenteditable="true"]',
  '[aria-label="Beskrivning"][contenteditable="true"]',
  '[aria-label*="description" i][contenteditable="true"]',
  '[aria-label*="beskriv" i][contenteditable="true"]',
  'textarea[name="description"]',
  '#description',
  'textarea[placeholder*="description" i]',
  'textarea[placeholder*="beskriv" i]',
  '[data-testid*="description"] textarea',
  '[contenteditable="true"]',
  '[role="textbox"][contenteditable="true"]',
];

export const DUPLICATE_DESCRIPTION_TEXT_SELECTORS = [
  '[data-testid*="description"]',
  '[id*="description" i]',
  '[class*="description" i]',
  '[class*="Description"]',
  'article',
  'main',
];

export const PRICE_SELECTORS = [
  'input[name="price_fixedPrice"]',
  '#price_fixedPrice',
  'input[name="price"]',
  '#price',
  'input[data-testid*="price"]',
  'input[inputmode="decimal"]',
  'input[placeholder*="price" i]',
  'input[placeholder*="pris" i]',
  'input[aria-label*="price" i]',
  'input[aria-label*="pris" i]',
];

export const QUANTITY_SELECTORS = [
  'input[name="quantity"]',
  '#quantity',
  'input[name="itemCount"]',
  '#itemCount',
  '[data-testid*="quantity"] input',
  '[data-testid*="item-count"] input',
  'input[placeholder*="quantity" i]',
  'input[placeholder*="antal" i]',
  'input[aria-label*="quantity" i]',
  'input[aria-label*="antal" i]',
];

export const EAN_SELECTORS = [
  'input[name="ean"]',
  '#ean',
  'input[name="gtin"]',
  '#gtin',
  '[data-testid*="ean"] input',
  '[data-testid*="gtin"] input',
  'input[placeholder*="EAN" i]',
  'input[placeholder*="GTIN" i]',
  'input[placeholder*="barcode" i]',
  'input[aria-label*="EAN" i]',
  'input[aria-label*="GTIN" i]',
  'input[aria-label*="barcode" i]',
];

export const BRAND_SELECTORS = [
  'input[name="brand"]',
  '#brand',
  'input[name="producer"]',
  '#producer',
  '[data-testid*="brand"] input',
  '[data-testid*="producer"] input',
  'input[placeholder*="brand" i]',
  'input[placeholder*="märke" i]',
  'input[aria-label*="brand" i]',
  'input[aria-label*="märke" i]',
];

export const WEIGHT_SELECTORS = [
  'input[name="weight"]',
  '#weight',
  'input[name="vikt"]',
  '#vikt',
  '[data-testid*="weight"] input',
  'input[placeholder*="weight" i]',
  'input[placeholder*="vikt" i]',
  'input[aria-label*="weight" i]',
  'input[aria-label*="vikt" i]',
];

export const WIDTH_SELECTORS = [
  'input[name="width"]',
  '#width',
  'input[name="bredd"]',
];

export const COOKIE_ACCEPT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  'button:has-text("Accept all cookies")',
  'button:has-text("Allow all cookies")',
  'button:has-text("Allow all")',
  'button:has-text("Accept")',
  'button:has-text("Accept all")',
  'button:has-text("Acceptera alla cookies")',
  'button:has-text("Acceptera alla kakor")',
  'button:has-text("Acceptera alla")',
  'button:has-text("Acceptera")',
  'button:has-text("Godkänn alla cookies")',
  'button:has-text("Godkänn alla")',
  'button:has-text("Godkänn")',
  'button:has-text("Tillåt alla cookies")',
  'button:has-text("Tillåt alla")',
  '[role="dialog"] button:has-text("Godkänn")',
  '[role="dialog"] button:has-text("Acceptera")',
  '[role="dialog"] button:has-text("Accept")',
  '[aria-modal="true"] button:has-text("Godkänn")',
  '[aria-modal="true"] button:has-text("Acceptera")',
  'dialog button:has-text("Godkänn")',
  'dialog button:has-text("Acceptera")',
  '[data-testid*="cookie"] button',
  '[id*="cookie"] button',
];

export const DRAFT_IMAGE_REMOVE_SELECTORS = [
  'button[aria-label*="Remove image" i]',
  'button[aria-label*="Delete image" i]',
  'button[aria-label*="Remove photo" i]',
  'button[aria-label*="Delete photo" i]',
  'button[aria-label="Remove" i]',
  'button[aria-label="Delete" i]',
  'button[aria-label*="Ta bort" i]',
  'button[aria-label*="Radera" i]',
  '[data-testid*="remove-image"]',
  '[data-testid*="delete-image"]',
  '[data-testid*="remove-photo"]',
  '[data-testid*="delete-photo"]',
  '[data-testid*="remove"]',
  '[data-testid*="delete"]',
  'button:has-text("Remove image")',
  'button:has-text("Delete image")',
  'button:has-text("Remove")',
  'button:has-text("Delete")',
  'button:has-text("Ta bort")',
  'button:has-text("Radera")',
];

export const IMAGE_INPUT_SELECTORS = [
  'input[type="file"][accept*="image"]',
  '[data-testid*="image"] input[type="file"]',
  '[data-testid*="photo"] input[type="file"]',
  '[data-testid*="upload"] input[type="file"]',
  'input[type="file"][name*="image" i]',
  'input[type="file"][name*="photo" i]',
  'input[type="file"]',
];


export const PUBLISH_SELECTORS = [
  'button[type="submit"]',
  'button:has-text("Publish")',
  'button:has-text("Publicera")',
  'button:has-text("Save draft")',
  'button:has-text("Spara utkast")',
  '[data-testid*="publish-button"]',
  '[data-testid*="submit-button"]',
  '#publish',
];


export const CATEGORY_FIELD_LABELS = ['Category', 'Kategori'];

export const CATEGORY_PLACEHOLDER_LABELS = [
  'Choose category',
  'Select category',
  'Choose a category',
  'Select a category',
  'Välj kategori',
  'Välj en kategori',
  'Välj kategori först',
];



