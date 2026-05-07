export type ScrapeTemplatePlaceholderOption = {
  key: string;
  label: string;
  description: string;
};

export const SCRAPE_TEMPLATE_PLACEHOLDER_OPTIONS: ScrapeTemplatePlaceholderOption[] = [
  { key: 'name', label: 'Product name', description: 'Mapped scrape title.' },
  {
    key: 'name(TitleCase)',
    label: 'Product name TitleCase',
    description: 'Mapped scrape title with each word capitalized.',
  },
  {
    key: 'name(TitleCase)(remove:"WFB")(trim)',
    label: 'Product name TitleCase, remove WFB',
    description: 'Title-cased scrape title with WFB removed and edges trimmed.',
  },
  {
    key: 'nameTitleCase',
    label: 'Legacy product name title case',
    description: 'Alias for title-cased product name.',
  },
  { key: 'title', label: 'Title', description: 'Alias for product name.' },
  {
    key: 'title(TitleCase)',
    label: 'Title TitleCase',
    description: 'Alias for title-cased product name.',
  },
  {
    key: 'titleTitleCase',
    label: 'Legacy title title case',
    description: 'Alias for title-cased product name.',
  },
  { key: 'description', label: 'Description', description: 'Mapped scrape description.' },
  { key: 'price', label: 'Price', description: 'Mapped scraped price.' },
  { key: 'sourcePrice', label: 'Source price', description: 'Alias for scraped price.' },
  { key: 'currency', label: 'Currency', description: 'Mapped scrape currency.' },
  { key: 'sku', label: 'Generated SKU', description: 'Product SKU generated for this import.' },
  { key: 'sourceSku', label: 'Source SKU', description: 'SKU as mapped from the scraped source.' },
  { key: 'externalId', label: 'External ID', description: 'Mapped product ID or external ID.' },
  { key: 'productId', label: 'Product ID', description: 'Raw source product ID.' },
  { key: 'brand', label: 'Brand', description: 'Mapped brand or producer.' },
  { key: 'producer', label: 'Producer', description: 'Alias for brand.' },
  { key: 'category', label: 'Category', description: 'Mapped source category.' },
  { key: 'sourceUrl', label: 'Source URL', description: 'Canonical scraped product URL.' },
  { key: 'supplierLink', label: 'Supplier link', description: 'Alias for source URL.' },
  { key: 'imageUrl', label: 'First image URL', description: 'First scraped product image URL.' },
];
