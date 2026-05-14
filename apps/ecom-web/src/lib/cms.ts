/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions, complexity, max-lines, max-lines-per-function, no-console */
import { cache } from 'react';
import { getEcommerceProductsDb } from '@/lib/mongodb';
import type { Collection } from 'mongodb';
import {
  HOME_CONTENT_DEFAULTS,
  normalizeHomeContent,
  validateHomeContent,
  type HomeContent,
} from '@/data/homeContent';
import {
  SITE_CONTENT_DEFAULTS,
  normalizeSiteContent,
  validateSiteContent,
  type SiteContent,
} from '@/data/siteContent';
import {
  ABOUT_CONTENT_DEFAULTS,
  normalizeAboutContent,
  validateAboutContent,
  type AboutContent,
} from '@/data/aboutContent';
import {
  VALUES_CONTENT_DEFAULTS,
  normalizeValuesContent,
  validateValuesContent,
  type ValuesContent,
} from '@/data/valuesContent';
import {
  STORIES_PAGE_CONTENT_DEFAULTS,
  normalizeStoriesPageContent,
  validateStoriesPageContent,
  type StoriesPageContent,
} from '@/data/storiesPageContent';
import {
  LOOKBOOK_PAGE_CONTENT_DEFAULTS,
  normalizeLookbookPageContent,
  validateLookbookPageContent,
  type LookbookPageContent,
} from '@/data/lookbookPageContent';
import {
  CONTACT_CONTENT_DEFAULTS,
  normalizeContactContent,
  validateContactContent,
  type ContactContent,
} from '@/data/contactContent';
import {
  WISHLIST_CONTENT_DEFAULTS,
  normalizeWishlistContent,
  validateWishlistContent,
  type WishlistContent,
} from '@/data/wishlistContent';
import {
  CHECKOUT_CONTENT_DEFAULTS,
  ensureCheckoutProviderShipping,
  normalizeCheckoutContent,
  validateCheckoutContent,
  type CheckoutContent,
} from '@/data/checkoutContent';
import {
  PRODUCTS_CONTENT_DEFAULTS,
  normalizeProductsContent,
  validateProductsContent,
  type ProductsContent,
} from '@/data/productsContent';
import {
  ACCOUNT_CONTENT_DEFAULTS,
  normalizeAccountContent,
  validateAccountContent,
  type AccountContent,
} from '@/data/accountContent';
import { DEFAULT_LOCALE, normalizeLocale, type EcomLocale } from '@/lib/locales';

const CMS_PAGES_COLLECTION = 'ecom_cms_pages';
const HOME_PAGE_KEY = 'home';
const SITE_PAGE_KEY = 'site';
const ABOUT_PAGE_KEY = 'about';
const VALUES_PAGE_KEY = 'values';
const STORIES_PAGE_KEY = 'stories-page';
const LOOKBOOK_PAGE_KEY = 'lookbook-page';
const CONTACT_PAGE_KEY = 'contact';
const WISHLIST_PAGE_KEY = 'wishlist';
const CHECKOUT_PAGE_KEY = 'checkout';
const PRODUCTS_PAGE_KEY = 'products';
const ACCOUNT_PAGE_KEY = 'account';

interface CmsPageDoc {
  page: string;
  locale: string;
  content?: unknown;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface HomeCmsSnapshot {
  content: HomeContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

type LocaleInput = EcomLocale | string | null | undefined;

interface CmsSnapshot<TContent> {
  content: TContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

type SnapshotBuilder<TContent, TSnapshot extends CmsSnapshot<TContent>> = (
  doc: CmsPageDoc | null,
) => TSnapshot;

type SiteLogoFields = Pick<SiteContent['nav'], 'logoUrl' | 'logoAlt'>;

type SharedSiteLogoFields = SiteLogoFields & {
  hasSource: boolean;
};

type ContentLocalizer<TContent> = (content: TContent, locale?: LocaleInput) => TContent;

let cmsPagesIndexPromise: Promise<string> | null = null;

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : '';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : '';
}

function isMongoConnectivityError(error: unknown): boolean {
  const signature = `${getErrorName(error)} ${getErrorMessage(error)}`.toLowerCase();
  return [
    'mongoserverselectionerror',
    'mongonetworkerror',
    'server selection timed out',
    'connection refused',
    'econnrefused',
    'enotfound',
    'etimedout',
    'enetunreach',
    'eai_again',
  ].some((token) => signature.includes(token));
}

function logCmsFallback(label: string, error: unknown): void {
  if (isMongoConnectivityError(error)) {
    const message = getErrorMessage(error);
    console.warn(
      `[cms] ${label} CMS content unavailable because the ecommerce MongoDB is not reachable; using defaults. Start the local ecommerce database with \`npm run mongo:ecom:up\` when local CMS content is needed.${message.length > 0 ? ` ${message}` : ''}`
    );
    return;
  }

  console.error(`Failed to load ${label} CMS content, using defaults.`, error);
}

function logCmsIndexFailure(error: unknown): void {
  if (isMongoConnectivityError(error)) {
    console.warn('[cms] CMS page locale index was not ensured because the ecommerce MongoDB is not reachable.');
    return;
  }

  console.error('Failed to ensure CMS page locale index.', error);
}

async function getCmsPagesCollection(): Promise<Collection<CmsPageDoc>> {
  const db = await getEcommerceProductsDb();
  const collection = db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION);
  cmsPagesIndexPromise ??= collection.createIndex({ page: 1, locale: 1 }, { unique: true }).catch((error) => {
    cmsPagesIndexPromise = null;
    logCmsIndexFailure(error);
    return '';
  });
  await cmsPagesIndexPromise;
  return collection;
}

async function getLocalizedCmsContent<TContent, TSnapshot extends CmsSnapshot<TContent>>({
  page,
  locale,
  defaults,
  toSnapshot,
  localize,
  label,
}: {
  page: string;
  locale?: LocaleInput;
  defaults: TContent;
  toSnapshot: SnapshotBuilder<TContent, TSnapshot>;
  localize: ContentLocalizer<TContent>;
  label: string;
}): Promise<TContent> {
  const requestedLocale = normalizeLocale(locale);
  try {
    const collection = await getCmsPagesCollection();
    const localeDoc = await collection.findOne({ page, locale: requestedLocale });
    if (localeDoc) return toSnapshot(localeDoc).content;

    const enDoc = requestedLocale === DEFAULT_LOCALE
      ? null
      : await collection.findOne({ page, locale: DEFAULT_LOCALE });
    return localize(toSnapshot(enDoc).content, requestedLocale);
  } catch (error) {
    logCmsFallback(label, error);
    return localize(defaults, requestedLocale);
  }
}

async function getLocalizedCmsSnapshot<TContent, TSnapshot extends CmsSnapshot<TContent>>({
  page,
  locale,
  toSnapshot,
  localize,
}: {
  page: string;
  locale?: LocaleInput;
  toSnapshot: SnapshotBuilder<TContent, TSnapshot>;
  localize: ContentLocalizer<TContent>;
}): Promise<TSnapshot> {
  const requestedLocale = normalizeLocale(locale);
  const collection = await getCmsPagesCollection();
  const localeDoc = await collection.findOne({ page, locale: requestedLocale });
  if (localeDoc) return toSnapshot(localeDoc);

  const emptySnapshot = toSnapshot(null);
  if (requestedLocale === DEFAULT_LOCALE) return emptySnapshot;

  const enDoc = await collection.findOne({ page, locale: DEFAULT_LOCALE });
  return {
    ...emptySnapshot,
    content: localize(toSnapshot(enDoc).content, requestedLocale),
    updatedAt: null,
    updatedBy: null,
  };
}

async function saveLocalizedCmsContent<TContent, TSnapshot extends CmsSnapshot<TContent>>(
  page: string,
  content: TContent,
  userId: string,
  locale?: LocaleInput,
): Promise<TSnapshot> {
  const targetLocale = normalizeLocale(locale);
  const collection = await getCmsPagesCollection();
  const now = new Date();

  await collection.updateOne(
    { page, locale: targetLocale },
    {
      $set: {
        page,
        locale: targetLocale,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  return { content, updatedAt: now.toISOString(), updatedBy: userId } as TSnapshot;
}

async function deleteLocalizedCmsContent(page: string, locale?: LocaleInput): Promise<boolean> {
  const targetLocale = normalizeLocale(locale);
  if (targetLocale === DEFAULT_LOCALE) return false;

  const collection = await getCmsPagesCollection();
  const result = await collection.deleteOne({ page, locale: targetLocale });
  return (result.deletedCount ?? 0) > 0;
}

function localizeHomeContent(content: HomeContent, localeInput?: LocaleInput): HomeContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
  return {
    ...content,
    hero: {
      ...content.hero,
      status: 'NEXUS ONLINE - NOWE DROPY AKTYWNE',
      headlineLine1: 'KOLEKCJONERSKI',
      headlineLine2: 'CACHE',
      tags: ['Breloki', 'Piny', 'Pierścionki', 'Bransoletki', 'Kości'],
      description: 'Ulubione uniwersa zamienione w kolekcjonerskie przedmioty. Anime, gaming i film - licencjonowane, starannie wybrane dodatki.',
      primaryCtaLabel: 'Zobacz nowości',
      secondaryCtaLabel: 'Przeglądaj wszystko',
      stats: [
        { value: content.hero.stats[0]?.value ?? '1,800+', label: 'Produktów' },
        { value: content.hero.stats[1]?.value ?? '118', label: 'Kategorii' },
        { value: content.hero.stats[2]?.value ?? '100+', label: 'Uniwersów' },
      ],
      panelStatus: 'UNIT-001 / WYRÓŻNIONE',
      panelTitle: 'Edycja kolekcjonerska',
      panelSubtitle: 'kliknij, aby odkryć',
      panelPrice: 'Od € 15',
    },
    manifesto: {
      ...content.manifesto,
      marqueeItems: ['Oficjalny merch', 'Breloki anime', 'Piny gamingowe', 'Filmowe kolekcje', 'Limitowane dropy', 'Rzadkie znaleziska'],
      eyebrow: 'Kodeks kolekcjonera',
      quotePrefix: 'Każde uniwersum zasługuje na',
      quoteEmphasis: 'przedmiot, który możesz trzymać',
      quoteSuffix: '.',
      body: 'Wyszukujemy i wybieramy licencjonowane kolekcjonalia ze światów anime, gier i filmu, aby każdy element kolekcji miał znaczenie.',
      ctaLabel: 'Odkryj katalog',
    },
    categories: {
      ...content.categories,
      eyebrow: 'Przeglądaj według uniwersum',
      title: 'Wybierz swój świat',
      ctaLabel: 'Wszystkie kolekcje',
      cards: content.categories.cards.map((card) => {
        const labels: Record<string, Partial<typeof card>> = {
          objects: { label: 'Wszystkie produkty', sublabel: 'Breloki · Piny · Zawieszki', tag: 'Pełny katalog' },
          womenswear: { label: 'Anime', sublabel: 'Piny · Breloki · Biżuteria', tag: 'Nowy sezon' },
          menswear: { label: 'Gaming', sublabel: 'RPG · FPS · Strategie', tag: 'Gorące dropy' },
          accessories: { label: 'Film i TV', sublabel: 'Kino · Seriale · Ikony', tag: 'Kolekcja' },
        };
        const fallbackCard = HOME_CONTENT_DEFAULTS.categories.cards.find((item) => item.id === card.id);
        const localizedCard = labels[card.id] ?? {};
        const shouldLocalizeField = (field: 'label' | 'sublabel' | 'tag'): boolean =>
          fallbackCard === undefined || card[field] === fallbackCard[field];

        return {
          ...card,
          label: shouldLocalizeField('label') ? localizedCard.label ?? card.label : card.label,
          sublabel: shouldLocalizeField('sublabel') ? localizedCard.sublabel ?? card.sublabel : card.sublabel,
          tag: shouldLocalizeField('tag') ? localizedCard.tag ?? card.tag : card.tag,
        };
      }),
    },
    featured: {
      ...content.featured,
      liveEyebrow: 'Katalog live',
      fallbackEyebrow: 'Wyróżnione produkty',
      title: 'Świeże dropy',
      filters: ['Wszystko', 'Anime', 'Gaming', 'Film'],
      quickAddLabel: 'Dodaj do koszyka',
      ctaLiveLabel: 'Zobacz 1,800+ produktów',
      ctaFallbackLabel: 'Zobacz wszystkie produkty',
    },
    editorial: {
      ...content.editorial,
      eyebrow: 'Raporty z uniwersów',
      title: 'Lore i dropy',
      ctaLabel: 'Wszystkie raporty',
      readLabel: 'Czytaj raport',
    },
    recentlyViewed: {
      ...content.recentlyViewed,
      eyebrow: 'Twój ślad',
      title: 'Ostatnio oglądane',
      ctaLabel: 'Przeglądaj wszystko',
    },
  };
}

function localizeSiteContent(content: SiteContent, localeInput?: LocaleInput): SiteContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
  return {
    ...content,
    nav: {
      ...content.nav,
      links: content.nav.links.map((link) => {
        const labels: Record<string, string> = {
          '/products?new=1': 'Nowości',
          '/#new-drops': 'Nowości',
          '/products': 'Katalog',
        };
        return { ...link, label: labels[link.href] ?? link.label };
      }),
      announcement: {
        ...content.nav.announcement,
        message: 'Darmowa dostawa od € 60 - nowe dropy co tydzień',
        ctaLabel: 'Zobacz nowości',
      },
      mobileAccountLabel: 'Konto',
      mobileWishlistLabel: 'Lista życzeń',
    },
    footer: {
      ...content.footer,
      newsletter: {
        ...content.footer.newsletter,
        eyebrow: 'Bądź na bieżąco',
        title: 'Sygnał dropów',
        body: 'Nowe dropy, krótkie serie i ekskluzywne uniwersa prosto do skrzynki.',
        emailAriaLabel: 'Email do newslettera',
        emailPlaceholder: 'twoj@email.com',
        submitLabel: 'Zapisz się',
      },
      brandDescription: 'Licencjonowane kolekcjonalia z anime, gier i filmów, które lubisz najbardziej.',
      copyright: '© 2026 STARGATER NEXUS. Wszelkie prawa zastrzeżone.',
      columns: content.footer.columns.map((column) => ({
        ...column,
        heading: ({ Shop: 'Sklep', Company: 'Firma', Support: 'Pomoc' } as Record<string, string>)[column.heading] ?? column.heading,
        links: column.links.map((link) => ({
          ...link,
          label: ({
            'Anime Keychains': 'Breloki anime',
            'Gaming Pins': 'Piny gamingowe',
            'Film Collectibles': 'Kolekcjonalia filmowe',
            'New Drops': 'Nowości',
            'All Items': 'Wszystkie produkty',
            'About STARGATER': 'O STARGATER',
            'Sourcing & Ethics': 'Źródła i etyka',
            Contact: 'Kontakt',
            Returns: 'Zwroty',
            Shipping: 'Dostawa',
            Careers: 'Kariera',
            Press: 'Prasa',
            Affiliates: 'Partnerzy',
            'Sizing Guide': 'Przewodnik rozmiarów',
            'Care Guide': 'Pielęgnacja',
          } as Record<string, string>)[link.label] ?? link.label,
        })),
      })),
      legalLinks: content.footer.legalLinks.map((link) => ({
        ...link,
        label: ({ Privacy: 'Prywatność', Terms: 'Regulamin', Cookies: 'Cookies' } as Record<string, string>)[link.label] ?? link.label,
      })),
    },
    search: {
      ...content.search,
      dialogAriaLabel: 'Szukaj',
      inputAriaLabel: 'Szukaj',
      placeholder: 'Szukaj produktów, uniwersów, kategorii...',
      closeLabel: 'Zamknij',
      closeAriaLabel: 'Zamknij wyszukiwanie',
      trendingLabel: 'Popularne wyszukiwania',
      trendingSearches: ['Anime', 'Attack on Titan', 'Brelok', 'Elden Ring', 'Ghibli'],
      browseCollectionsLabel: 'Przeglądaj kolekcje',
      noResultsPrefix: 'Brak wyników dla',
      noResultsHelp: 'Spróbuj innej frazy albo przejrzyj kolekcje',
      addedToastTitle: 'Dodano do koszyka',
      loadingResultsLabel: 'Szukam...',
      liveLabel: 'live',
      resultSingular: 'wynik',
      resultPlural: 'wyników',
      resultsForLabel: 'dla',
      quickAddLabel: 'Dodaj',
      viewAllPrefix: 'Zobacz wszystkie',
      collectionCards: content.search.collectionCards.map((card) => ({
        ...card,
        label: ({
          womenswear: 'Anime',
          menswear: 'Gaming',
          accessories: 'Film i TV',
          all: 'Wszystkie produkty',
        } as Record<string, string>)[card.slug] ?? card.label,
      })),
    },
    cookieConsent: {
      ...content.cookieConsent,
      message: 'Używamy cookies, aby zapamiętać preferencje, zrozumieć korzystanie z STARGATER i poprawiać doświadczenie.',
      policyLabel: 'Polityka prywatności',
      essentialLabel: 'Tylko niezbędne',
      acceptLabel: 'Akceptuję wszystkie',
    },
    cart: {
      ...content.cart,
      ariaLabel: 'Koszyk',
      title: 'Twój koszyk',
      itemSingular: 'produkt',
      itemPlural: 'produkty',
      closeLabel: 'Zamknij koszyk',
      emptyMessage: 'Koszyk jest pusty',
      continueShoppingLabel: 'Kontynuuj zakupy',
      removeItemAriaPrefix: 'Usuń',
      decreaseQuantityLabel: 'Zmniejsz ilość',
      increaseQuantityLabel: 'Zwiększ ilość',
      subtotalLabel: 'Suma częściowa',
      shippingLabel: 'Dostawa',
      shippingNote: 'Obliczana przy kasie',
      totalLabel: 'Razem',
      checkoutLabel: 'Przejdź do kasy',
      footerNote: 'Darmowa dostawa od € 60',
    },
    auth: {
      ...content.auth,
      closeLabel: 'Zamknij',
      signInTabLabel: 'Logowanie',
      registerTabLabel: 'Utwórz konto',
      emailLabel: 'Adres email',
      passwordLabel: 'Hasło',
      showPasswordLabel: 'Pokaż hasło',
      hidePasswordLabel: 'Ukryj hasło',
      signInSubmitLabel: 'Zaloguj się',
      fullNameLabel: 'Imię i nazwisko',
      confirmPasswordLabel: 'Potwierdź hasło',
      registerSubmitLabel: 'Utwórz konto',
      loadingLabel: 'Ładowanie...',
      loginFailedError: 'Logowanie nie powiodło się',
      passwordMismatchError: 'Hasła nie są takie same',
      registrationFailedError: 'Rejestracja nie powiodła się',
    },
    quickView: {
      ...content.quickView,
      addedToastTitle: 'Dodano do koszyka',
      closeLabel: 'Zamknij szybki podgląd',
      selectSizeLabel: 'Wybierz rozmiar',
      addedButtonLabel: 'Dodano do koszyka',
      addToBagLabel: 'Dodaj do koszyka',
      removedWishlistToastTitle: 'Usunięto z listy życzeń',
      savedWishlistToastTitle: 'Zapisano na liście życzeń',
      savedWishlistButtonLabel: 'Zapisano',
      saveWishlistButtonLabel: 'Zapisz',
      fullDetailsLabel: 'Pełne szczegóły',
    },
    backToTop: {
      ...content.backToTop,
      ariaLabel: 'Wróć na górę',
    },
    notFound: {
      ...content.notFound,
      eyebrow: 'Nie znaleziono strony',
      titleLines: ['Ta strona', 'opuściła archiwum'],
      body: 'Strona mogła zostać przeniesiona, zmienić nazwę albo nigdy nie istnieć. Wróć na stronę główną lub przejrzyj kolekcje.',
      primaryLabel: 'Wróć do strony głównej',
      secondaryLabel: 'Przeglądaj produkty',
    },
  };
}

function localizeProductsContent(content: ProductsContent, localeInput?: LocaleInput): ProductsContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
  return {
    ...content,
    collection: {
      ...content.collection,
      allProductsLabel: 'Wszystkie produkty',
      newArrivalsLabel: 'Nowości',
      searchLabelPrefix: 'Szukaj',
      filtersLabel: 'Filtry',
      searchPlaceholder: 'Szukaj produktów…',
      clearAllLabel: 'Wyczyść wszystko',
      clearFiltersLabel: 'Wyczyść filtry',
      priceLabel: 'Cena',
      categoryLabel: 'Kategoria',
      categoryAllLabel: 'Wszystkie',
      typeLabel: 'Typ',
      universeLabel: 'Kategoria tematyczna',
      sizeLabel: 'Rozmiar',
      loreLabel: 'Uniwersum / Lore',
      homeBreadcrumbLabel: 'Strona główna',
      collectionsBreadcrumbLabel: 'Kolekcje',
      productsCountLabel: 'produktów',
      piecesCountLabel: 'sztuk',
      totalInCollectionLabel: 'łącznie w kolekcji',
      sortLabel: 'Sortuj:',
      comfortableViewAriaLabel: 'Widok wygodny',
      compactViewAriaLabel: 'Widok kompaktowy',
      resultSingular: 'wynik',
      resultPlural: 'wyników',
      ofLabel: 'z',
      noResultsTitle: 'Nie znaleziono produktów',
      quickAddLabel: 'Dodaj',
      addedToastTitle: 'Dodano do koszyka',
      loadingLabel: 'Ładowanie...',
      loadMorePrefix: 'Załaduj więcej',
      remainingLabel: 'pozostało',
      showingLabel: 'Wyświetlono',
      sortOptions: content.collection.sortOptions.map((option) => ({
        ...option,
        label: ({
          featured: 'Polecane',
          newest: 'Najnowsze',
          'price-asc': 'Cena: od najniższej',
          'price-desc': 'Cena: od najwyższej',
          'name-asc': 'Nazwa: A → Z',
          'name-desc': 'Nazwa: Z → A',
          category: 'Kategoria',
        } as Record<string, string>)[option.value] ?? option.label,
      })),
      priceRanges: content.collection.priceRanges.map((range, index) => ({
        ...range,
        label: [
          'Poniżej 200 zł',
          '200 zł - 500 zł',
          '500 zł - 1 000 zł',
          'Powyżej 1 000 zł',
        ][index] ?? range.label,
      })),
    },
    detail: {
      ...content.detail,
      homeBreadcrumbLabel: 'Strona główna',
      imageAriaPrefix: 'Zobacz zdjęcie',
      sizeGuideEyebrow: 'Rozmiary',
      sizeGuideTitle: 'Tabela rozmiarów',
      closeSizeGuideLabel: 'Zamknij tabelę rozmiarów',
      sizeGuideBody: 'Wszystkie wymiary podane są w centymetrach. Dla najlepszego dopasowania mierz na lekkim ubraniu.',
      sizeGuideHeaders: ['Rozmiar', 'Klatka', 'Talia', 'Biodra'],
      sizeGuideHelpPrefix: 'Nie masz pewności? Napisz do nas:',
      sizeRequiredLabel: 'Wybierz rozmiar',
      selectSizeLabel: 'Wybierz rozmiar',
      sizeGuideLabel: 'Tabela rozmiarów',
      addedButtonLabel: 'Dodano do koszyka',
      addToBagLabel: 'Dodaj do koszyka',
      addedToastTitle: 'Dodano do koszyka',
      removedWishlistToastTitle: 'Usunięto z listy życzeń',
      savedWishlistToastTitle: 'Zapisano na liście życzeń',
      savedWishlistButtonLabel: 'Zapisano',
      saveWishlistButtonLabel: 'Zapisz na liście życzeń',
      detailsAccordionLabel: 'Szczegóły produktu',
      careAccordionLabel: 'Pielęgnacja',
      shippingReturnsAccordionLabel: 'Dostawa i zwroty',
      shippingReturnsItems: [
        'Darmowa dostawa od € 60',
        'Standardowa dostawa: 3-5 dni roboczych',
        'Dostawa ekspresowa dostępna przy kasie',
        'Zwroty w ciągu 30 dni',
        'Produkty muszą być w oryginalnym stanie',
      ],
      reviewsEyebrow: 'Opinie klientów',
      reviewsTitle: 'Co mówią klienci',
      reviewSingularLabel: 'opinia',
      reviewPluralLabel: 'opinii',
      verifiedPurchaseLabel: 'Zweryfikowany zakup',
      writeReviewLabel: 'Napisz opinię',
      relatedEyebrow: 'Może Ci się spodobać',
      relatedTitle: 'Z tej samej kolekcji',
    },
  };
}

function localizeAboutContent(content: AboutContent, localeInput?: LocaleInput): AboutContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
  return {
    ...content,
    hero: {
      ...content.hero,
      eyebrow: 'Założone w 2012 - Lyon, Francja',
      title: 'Przedmioty, które zostają na długo',
      body: 'Jesteśmy małym domem kolekcjonerskim, który wybiera rzeczy z myślą o trwałości. Każdy produkt w katalogu ma swoje źródło, historię i powód, dla którego warto go zachować.',
    },
    origin: {
      ...content.origin,
      eyebrow: 'Początek',
      title: 'Jedno pytanie i potrzeba lepszych przedmiotów',
      paragraphs: [
        'STARGATER powstała z prostego pytania: dlaczego tak wiele rzeczy szybko traci znaczenie? Zaczęliśmy od szukania przedmiotów tworzonych z uwagą, a nie pod presją sezonu.',
        'Z czasem ta ciekawość zmieniła się w katalog licencjonowanych kolekcjonalii, akcesoriów i drobnych obiektów inspirowanych anime, grami oraz filmem.',
        'Wybieramy rzeczy, które dobrze wyglądają na półce, przy kluczach, na torbie albo w codziennym użyciu. Każdy drop ma być rozpoznawalny, dobrze opisany i łatwy do pokochania.',
        'Dziś STARGATER jest miejscem dla osób, które lubią kolekcjonować świadomie: mniej przypadkowych gadżetów, więcej przedmiotów związanych z ulubionymi światami.',
      ],
    },
    statsEyebrow: 'W liczbach',
    stats: [
      { value: content.stats[0]?.value ?? '1,800+', label: 'Produktów', sub: 'w katalogu live' },
      { value: content.stats[1]?.value ?? '118', label: 'Kategorii', sub: 'anime, gaming i film' },
      { value: content.stats[2]?.value ?? '100+', label: 'Uniwersów', sub: 'wybranych dla fanów' },
      { value: content.stats[3]?.value ?? '24/7', label: 'Katalog online', sub: 'aktualizowany z Product List' },
    ],
    historyEyebrow: 'Historia',
    milestones: [
      { year: '2012', event: 'Pierwsze kuratorskie podejście do przedmiotów tworzonych z myślą o długim użytkowaniu.' },
      { year: '2016', event: 'Rozszerzenie katalogu o akcesoria i małe obiekty kolekcjonerskie.' },
      { year: '2021', event: 'Przeniesienie uwagi na światy popkultury: anime, gaming, film i seriale.' },
      { year: '2024', event: 'Budowa katalogu produktów z wieloma zdjęciami, wariantami i opisami.' },
      { year: '2025', event: 'Połączenie Product List ze sklepem internetowym i automatycznym serwowaniem zdjęć.' },
      { year: '2026', event: 'Start dwujęzycznego doświadczenia sklepu opartego o języki katalogu.' },
    ],
    artisansEyebrow: 'Kuratorki i kuratorzy',
    artisansTitle: 'Jak wybieramy',
    artisansCtaLabel: 'Czytaj historie',
    artisans: content.artisans.map((artisan, index) => ({
      ...artisan,
      role: ['Selekcja anime', 'Selekcja gamingowa', 'Selekcja filmowa', 'Kontrola katalogu'][index] ?? artisan.role,
      location: ['Katalog STARGATER', 'Dropy live', 'Archiwum marek', 'Product List'][index] ?? artisan.location,
      note: [
        'Sprawdzamy, czy produkt dobrze oddaje charakter postaci, serii i uniwersum.',
        'Szukamy przedmiotów, które fani rozpoznają od razu i chętnie noszą na co dzień.',
        'Łączymy klasyczne ikony z nowymi dropami, aby katalog był żywy i aktualny.',
        'Dbamy o zdjęcia, opisy i dane, żeby sklep pokazywał pełny kontekst produktu.',
      ][index] ?? artisan.note,
    })),
    valuesEyebrow: 'Jak pracujemy',
    values: [
      {
        number: '01',
        title: 'Produkty z kontekstem',
        body: 'Każdy produkt powinien mówić jasno, z jakiego świata pochodzi i dlaczego jest wart uwagi.',
      },
      {
        number: '02',
        title: 'Zdjęcia przede wszystkim',
        body: 'Kolekcjonerzy muszą widzieć detal. Dlatego dbamy o wiele zdjęć i stabilne serwowanie plików.',
      },
      {
        number: '03',
        title: 'Język katalogu',
        body: 'Sklep podąża za językami ustawionymi w Product List, aby oferta była spójna z katalogiem.',
      },
      {
        number: '04',
        title: 'Dropy bez chaosu',
        body: 'Nowości mają być łatwe do znalezienia, opisane i gotowe do kupienia bez dodatkowego szukania.',
      },
    ],
    closing: {
      ...content.closing,
      quote: 'Wybierz przedmiot, który przypomina Ci o świecie, do którego chcesz wracać.',
      attribution: '- STARGATER',
      primaryCtaLabel: 'Przeglądaj kolekcję',
      secondaryCtaLabel: 'Czytaj historie',
    },
  };
}

function localizeValuesContent(content: ValuesContent, localeInput?: LocaleInput): ValuesContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
  return {
    ...content,
    hero: {
      ...content.hero,
      watermark: 'Wartości',
      eyebrow: 'Jak pracujemy',
      titleLine1: 'Kolekcje potrzebują',
      titleLine2: 'dobrych danych.',
      body: 'Każdy produkt powinien mieć jasny opis, komplet zdjęć i spójny język. Dzięki temu sklep jest przyjazny dla fanów i łatwy w utrzymaniu.',
    },
    stats: [
      { value: content.stats[0]?.value ?? '2', label: 'Języki katalogu' },
      { value: content.stats[1]?.value ?? '1,800+', label: 'Produktów live' },
      { value: content.stats[2]?.value ?? '100%', label: 'Zdjęć z Product List' },
      { value: content.stats[3]?.value ?? '24/7', label: 'Dostępny sklep' },
    ],
    materialsEyebrow: 'Co jest ważne',
    materialsTitle: 'Podstawy katalogu',
    materials: [
      {
        name: 'Pełne zdjęcia',
        origin: 'FastComet i lokalny katalog',
        desc: 'Produkt powinien mieć zdjęcie główne i dodatkowe ujęcia, a sklep musi pokazywać je stabilnie w listach i szczegółach.',
      },
      {
        name: 'Opisy w językach',
        origin: 'Product List',
        desc: 'Nazwy i opisy są pobierane z pól językowych katalogu, aby polska i angielska wersja sklepu mówiły tym samym głosem.',
      },
      {
        name: 'Czytelne kategorie',
        origin: 'Katalog produktów',
        desc: 'Kategorie pomagają znaleźć anime, gaming, film i akcesoria bez zgadywania, gdzie ukrył się produkt.',
      },
      {
        name: 'Aktualne ceny',
        origin: 'Dane produktu',
        desc: 'Ceny i dostępność są odświeżane z katalogu, dzięki czemu sklep pokazuje możliwie aktualny stan oferty.',
      },
      {
        name: 'Spójne linki',
        origin: 'Storefront',
        desc: 'Przełączanie języka zachowuje aktualną ścieżkę, więc klient nie traci miejsca podczas przeglądania.',
      },
      {
        name: 'Brak legacy uploadów',
        origin: 'Nowy system plików',
        desc: 'Zdjęcia produktów są normalizowane do aktualnej domeny plików i nie wracają do dawnych ścieżek.',
      },
    ],
    commitmentsEyebrow: 'Zobowiązania',
    commitmentsTitle: 'Jak utrzymujemy sklep',
    commitments: [
      {
        title: 'Języki z katalogu',
        body: 'Storefront pokazuje tyle języków, ile obsługuje katalog produktów, obecnie polski i angielski.',
      },
      {
        title: 'Jedno źródło zdjęć',
        body: 'Produkt List pozostaje źródłem danych, a sklep normalizuje URL-e zdjęć do aktualnej konfiguracji.',
      },
      {
        title: 'Czytelne fallbacki',
        body: 'Jeśli polski CMS nie istnieje, sklep nadal pokazuje polską wersję podstawowych stron i kontrolek.',
      },
      {
        title: 'Stabilne ścieżki',
        body: 'Adresy /pl oraz wersja domyślna prowadzą do tych samych widoków bez duplikowania routingu aplikacji.',
      },
      {
        title: 'Praktyczna edycja',
        body: 'Treści administracyjne można nadal zmieniać w CMS, a fallbacki zabezpieczają podstawowe doświadczenie.',
      },
      {
        title: 'Testowanie przepływu',
        body: 'Po zmianach sprawdzamy typecheck, API produktów oraz kluczowe ścieżki storefrontu.',
      },
    ],
    closing: {
      ...content.closing,
      quote: 'Dobry katalog nie przeszkadza w zakupie. Prowadzi klienta prosto do produktu.',
      primaryCtaLabel: 'Poznaj STARGATER',
      secondaryCtaLabel: 'Przeglądaj produkty',
    },
  };
}

function localizeStoriesPageContent(content: StoriesPageContent, localeInput?: LocaleInput): StoriesPageContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
  return {
    ...content,
    index: {
      ...content.index,
      eyebrow: 'Z archiwum',
      title: 'Historie',
      description: 'Krótkie materiały o dropach, produktach, kolekcjach i światach, z których pochodzą nasze przedmioty.',
      emptyTitle: 'Historie',
      emptyBody: 'Nie opublikowano jeszcze żadnych historii.',
      featuredBadge: 'Wyróżnione',
      readLabel: 'Czytaj historię',
      categoryFilters: ['Wszystkie', 'Anime', 'Gaming', 'Film', 'Kolekcje', 'Poradniki'],
      cardReadLabel: 'Czytaj',
    },
    detail: {
      ...content.detail,
      breadcrumbLabel: 'Historie',
      issueLabelPrefix: 'Historie STARGATER',
      relatedEyebrow: 'Czytaj dalej',
    },
  };
}

function localizeLookbookPageContent(content: LookbookPageContent, localeInput?: LocaleInput): LookbookPageContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
  return {
    ...content,
    emptyTitle: 'Lookbook',
    emptyBody: 'Nie opublikowano jeszcze wpisów lookbooka.',
    viewLabel: 'Zobacz editorial',
    featuredLabel: 'Wyróżnione',
    masthead: {
      ...content.masthead,
      watermark: 'LOOKBOOK',
      eyebrow: 'STARGATER · Archiwum wizualne',
      title: 'Lookbook',
      description: 'Selekcje wizualne, zbliżenia produktów i inspiracje dla kolekcjonerów.',
      issueRange: content.masthead.issueRange || 'Wydania 01-08',
      dateRange: content.masthead.dateRange || '2024 - 2026',
    },
    cta: {
      ...content.cta,
      issueLabel: 'Archiwum wydań',
      titleLine1: 'Każdy produkt',
      titleLine2: 'ma swój kontekst',
      body: 'Przeglądaj historie i znajdź przedmiot z uniwersum, do którego chcesz wracać.',
      label: 'Czytaj historie',
    },
    archive: {
      ...content.archive,
      label: 'Archiwum lookbooka STARGATER',
      ctaLabel: 'Wróć do sklepu',
    },
  };
}

function localizeContactContent(content: ContactContent, localeInput?: LocaleInput): ContactContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
  return {
    ...content,
    hero: {
      ...content.hero,
      watermark: 'Kontakt',
      eyebrow: 'Napisz do nas',
      titleLine1: 'Chętnie',
      titleLine2: 'pomożemy',
      body: 'Masz pytanie o produkt, zamówienie, zwrot albo współpracę? Napisz do nas, a wrócimy z konkretną odpowiedzią.',
    },
    info: {
      ...content.info,
      addressEyebrow: 'Studio',
      directEyebrow: 'Kontakt bezpośredni',
      hoursEyebrow: 'Godziny',
      hours: [
        { label: 'Poniedziałek - piątek', value: '10:00 - 18:00', muted: false },
        { label: 'Sobota', value: '10:00 - 16:00', muted: false },
        { label: 'Niedziela', value: 'Zamknięte', muted: true },
      ],
      followEyebrow: 'Obserwuj',
    },
    form: {
      ...content.form,
      nameLabel: 'Imię i nazwisko',
      namePlaceholder: 'Pełne imię i nazwisko',
      emailLabel: 'Adres email',
      emailPlaceholder: 'ty@example.com',
      subjectLabel: 'Temat',
      subjects: [
        'Pytanie o produkt',
        'Wsparcie zamówienia',
        'Zwroty i wymiany',
        'Współpraca i hurt',
        'Prasa i editorial',
        'Inne',
      ],
      messageLabel: 'Wiadomość',
      messagePlaceholder: 'Napisz, w czym możemy pomóc...',
      footnote: 'Odpowiadamy w ciągu 2 dni roboczych',
      submitLabel: 'Wyślij wiadomość',
    },
    success: {
      ...content.success,
      toastTitle: 'Wiadomość odebrana',
      toastMessage: 'Odpowiemy w ciągu 2 dni roboczych.',
      eyebrow: 'Wiadomość wysłana',
      titleLine1: 'Dziękujemy,',
      titleLine2: 'odezwiemy się.',
      body: 'Odpowiedzi spodziewaj się w ciągu 2 dni roboczych. W pilnych sprawach możesz też napisać bezpośrednio na hello@stargater.com.',
      resetLabel: 'Wyślij kolejną wiadomość',
    },
  };
}

function localizeWishlistContent(content: WishlistContent, localeInput?: LocaleInput): WishlistContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
  return {
    ...content,
    heroEyebrow: 'Zapisane produkty',
    heroTitle: 'Twoja lista życzeń',
    pieceSingular: 'produkt',
    piecePlural: 'produkty',
    savedLabel: 'zapisane',
    refreshingLabel: 'odświeżam ceny...',
    emptyTitle: 'Nic jeszcze nie zapisano',
    emptyBody: 'Użyj ikony serca przy produkcie, aby zapisać go tutaj.',
    emptyCtaLabel: 'Przeglądaj kolekcję',
    currentCatalogLabel: 'Ceny zgodne z aktualnym katalogiem',
    savedItemsLabel: 'Zapisane produkty',
    moveAllLabel: 'Przenieś wszystko do koszyka',
    moveToBagLabel: 'Przenieś do koszyka',
    movedToastTitle: 'Przeniesiono do koszyka',
    removedToastTitle: 'Usunięto z listy życzeń',
    removeItemAriaPrefix: 'Usuń',
    removeItemAriaSuffix: 'z listy życzeń',
    liveBadgeLabel: 'live',
  };
}

export function localizeCheckoutContent(content: CheckoutContent, localeInput?: LocaleInput): CheckoutContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
  const methodLabels: Record<string, string> = {
    standard: 'Dostawa standardowa',
    express: 'Dostawa ekspresowa',
    overnight: 'Dostawa następnego dnia',
    'inpost-locker': 'InPost Paczkomat',
    'poczta-polska': 'Poczta Polska',
    'poczta-polska-eu': 'Poczta Polska Międzynarodowa',
    'poczta-polska-world': 'Poczta Polska Międzynarodowa',
    'dpd-courier': 'Kurier DPD',
    'dpd-eu': 'DPD Międzynarodowy',
    'dpd-world': 'DPD Międzynarodowy',
  };
  const zoneLabels: Record<string, string> = {
    domestic: 'Polska',
    eu: 'Unia Europejska',
    international: 'Międzynarodowe',
  };
  const methodDetail = (method: CheckoutContent['shippingMethods'][number]): string => {
    if (method.id === 'inpost-locker') return 'Odbiór w wybranym paczkomacie, 1-2 dni robocze';
    if (method.businessDaysMin === 1 && method.businessDaysMax === 1) return 'Następny dzień roboczy';
    return `${method.businessDaysMin}-${method.businessDaysMax} dni roboczych`;
  };
  const localizeMethod = (method: CheckoutContent['shippingMethods'][number]): CheckoutContent['shippingMethods'][number] => ({
    ...method,
    label: methodLabels[method.id] ?? method.label,
    detail: methodDetail(method),
    priceLabel: method.price === 0 ? 'Darmowa' : method.priceLabel,
  });

  return {
    ...content,
    stepAriaLabel: 'Etapy kasy',
    steps: content.steps.map((step) => ({
      ...step,
      label: ({
        information: 'Dane',
        shipping: 'Dostawa',
        payment: 'Płatność',
      } as Record<string, string>)[step.key] ?? step.label,
    })),
    informationTitle: 'Kontakt i dostawa',
    informationFields: content.informationFields.map((field) => ({
      ...field,
      label: ({
        email: 'Adres email',
        firstName: 'Imię',
        lastName: 'Nazwisko',
        address: 'Adres',
        apartment: 'Mieszkanie / lokal (opcjonalnie)',
        city: 'Miasto',
        postcode: 'Kod pocztowy',
        country: 'Kraj',
        phone: 'Telefon (opcjonalnie)',
      } as Record<string, string>)[field.id] ?? field.label,
      placeholder: ({
        email: 'ty@example.com',
        firstName: 'Maria',
        lastName: 'Kowalska',
        address: 'ul. Marszałkowska 12',
        apartment: 'Piętro 3',
        city: 'Warszawa',
        postcode: '00-001',
        country: 'Polska',
        phone: '+48 500 000 000',
      } as Record<string, string>)[field.id] ?? field.placeholder,
    })),
    returnToBagLabel: 'Wróć do koszyka',
    continueToShippingLabel: 'Przejdź do dostawy',
    shippingTitle: 'Metoda dostawy',
    deliveryRecapLabel: 'Dostawa do',
    changeLabel: 'Zmień',
    shippingMethods: content.shippingMethods.map(localizeMethod),
    shippingZones: content.shippingZones.map((zone) => ({
      ...zone,
      label: zoneLabels[zone.id] ?? zone.label,
      methods: zone.methods.map(localizeMethod),
    })),
    freeShippingBannerLabel: 'Dodaj jeszcze {amount}, aby otrzymać darmową dostawę',
    backLabel: 'Wstecz',
    continueToPaymentLabel: 'Przejdź do płatności',
    paymentTitle: 'Płatność',
    securityNote: 'Wszystkie transakcje są bezpieczne i szyfrowane SSL',
    paymentFields: content.paymentFields.map((field) => ({
      ...field,
      label: ({
        cardNumber: 'Numer karty',
        cardName: 'Imię i nazwisko na karcie',
        expiry: 'Data ważności',
        securityCode: 'Kod bezpieczeństwa',
      } as Record<string, string>)[field.id] ?? field.label,
      placeholder: ({
        cardName: 'Maria Kowalska',
        securityCode: 'CVV',
      } as Record<string, string>)[field.id] ?? field.placeholder,
    })),
    billingSameLabel: 'Adres rozliczeniowy taki sam jak dostawy',
    addItemsFirstLabel: 'Najpierw dodaj produkty',
    placeOrderLabel: 'Złóż zamówienie',
    orderPlacedToastTitle: 'Zamówienie złożone!',
    orderPlacedToastMessage: 'Potwierdzenie zostało wysłane na Twój email.',
    confirmationTitle: 'Zamówienie potwierdzone',
    confirmationBodyPrefix: 'Dziękujemy. Zamówienie zostało przyjęte i jest przygotowywane. Potwierdzenie wyślemy na',
    confirmationEmailFallback: 'Twój email',
    confirmationBodySuffix: '.',
    continueShoppingLabel: 'Kontynuuj zakupy',
    trackOrderLabel: 'Śledź zamówienie',
    confirmationQuote: '"Kolekcjonerskie przedmioty, które zostają na długo."',
    orderSummary: {
      ...content.orderSummary,
      title: 'Podsumowanie zamówienia',
      emptyBagLabel: 'Koszyk jest pusty',
      promoAppliedSuffix: 'zastosowano',
      removePromoLabel: 'Usuń',
      promoToggleLabel: 'Masz kod promocyjny?',
      promoPlaceholder: 'Wpisz kod',
      promoApplyLabel: 'Zastosuj',
      promoInvalidLabel: 'Nieprawidłowy kod promocyjny',
      subtotalLabel: 'Suma częściowa',
      discountLabel: 'Rabat',
      shippingLabel: 'Dostawa',
      freeLabel: 'Darmowa',
      totalLabel: 'Razem',
    },
  };
}

function localizeAccountContent(content: AccountContent, localeInput?: LocaleInput): AccountContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
  return {
    ...content,
    loadingLabel: 'Ładowanie...',
    signedOut: {
      ...content.signedOut,
      title: 'Strefa klienta',
      body: 'Zaloguj się, aby zobaczyć zamówienia, zapisane produkty i ustawienia konta.',
      signInLabel: 'Zaloguj się',
      backToShopLabel: 'Wróć do sklepu',
    },
    tabs: content.tabs.map((tab) => ({
      ...tab,
      label: ({
        overview: 'Przegląd',
        orders: 'Zamówienia',
        settings: 'Ustawienia',
        admin: 'Admin',
      } as Record<string, string>)[tab.id] ?? tab.label,
    })),
    header: {
      ...content.header,
      watermark: 'Konto',
      eyebrow: 'Klient',
      welcomePrefix: 'Witaj ponownie,',
      superAdminPrefix: 'Super Admin',
      ordersLabel: 'zamówienia',
    },
    sidebar: {
      ...content.sidebar,
      memberRoleLabel: 'Klient',
      superAdminRoleLabel: 'Super Admin',
      wishlistLabel: 'Lista życzeń',
      signOutLabel: 'Wyloguj się',
    },
    overview: {
      ...content.overview,
      stats: content.overview.stats.map((stat) => ({
        ...stat,
        label: ({
          orders: 'Liczba zamówień',
          items: 'Kupione produkty',
          wishlist: 'Lista życzeń',
          memberSince: 'Klient od',
        } as Record<string, string>)[stat.key] ?? stat.label,
        fallbackValue: stat.key === 'memberSince' ? 'Klient' : stat.fallbackValue,
      })),
      recentOrderLabel: 'Ostatnie zamówienie',
      viewAllOrdersLabel: 'Zobacz wszystkie zamówienia',
    },
    orders: {
      ...content.orders,
      title: 'Historia zamówień',
      emptyLabel: 'Brak zamówień.',
      orderNumberLabel: 'Zamówienie',
      shippingLabel: 'Dostawa',
      trackingLabel: 'Tracking',
      itemsLabel: 'Produkty',
      qtyLabel: 'Ilość',
      statuses: {
        pending_payment: 'Oczekuje na płatność',
        delivered: 'Dostarczone',
        'in-transit': 'W drodze',
        processing: 'W realizacji',
        cancelled: 'Anulowane',
      },
    },
    settings: {
      ...content.settings,
      title: 'Ustawienia konta',
      personalDetailsLabel: 'Dane osobowe',
      fullNameLabel: 'Imię i nazwisko',
      emailLabel: 'Adres email',
      defaultShippingAddressLabel: 'Domyślny adres dostawy',
      editLabel: 'Edytuj',
      communicationPreferencesLabel: 'Preferencje komunikacji',
      preferences: content.settings.preferences.map((preference, index) => ({
        ...preference,
        label: [
          'Nowości i kolekcje',
          'Publikacje editorial i lookbook',
          'Aktualizacje statusu zamówienia',
          'Ekskluzywne wydarzenia dla klientów',
        ][index] ?? preference.label,
      })),
      saveChangesLabel: 'Zapisz zmiany',
    },
    admin: {
      ...content.admin,
      title: 'Panel administratora',
      badgeLabel: 'Super Admin',
      cmsLinkLabel: 'Otwórz CMS',
      cmsLinkDescription: 'Edytuj teksty sklepu, strony, stories, lookbook i wspólne treści witryny.',
      registeredUsersLabel: 'Zarejestrowani użytkownicy',
      recentRegistrationsLabel: 'Ostatnie rejestracje',
      loadingLabel: 'Ładowanie...',
      loadUsersError: 'Nie udało się załadować użytkowników',
      noUsersLabel: 'Brak użytkowników.',
      tableHeaders: ['Imię / Email', 'Email', 'Dołączył'],
    },
  };
}

export interface SiteCmsSnapshot {
  content: SiteContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface AboutCmsSnapshot {
  content: AboutContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface ValuesCmsSnapshot {
  content: ValuesContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface StoriesPageCmsSnapshot {
  content: StoriesPageContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface LookbookPageCmsSnapshot {
  content: LookbookPageContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface ContactCmsSnapshot {
  content: ContactContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface WishlistCmsSnapshot {
  content: WishlistContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface CheckoutCmsSnapshot {
  content: CheckoutContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface ProductsCmsSnapshot {
  content: ProductsContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface AccountCmsSnapshot {
  content: AccountContent;
  updatedAt: string | null;
  updatedBy: string | null;
}

function toHomeSnapshot(doc: CmsPageDoc | null): HomeCmsSnapshot {
  return {
    content: normalizeHomeContent(doc?.content ?? HOME_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export const getHomeContent = cache(async (locale?: LocaleInput): Promise<HomeContent> => {
  return getLocalizedCmsContent({
    page: HOME_PAGE_KEY,
    locale,
    defaults: HOME_CONTENT_DEFAULTS,
    toSnapshot: toHomeSnapshot,
    localize: localizeHomeContent,
    label: 'home',
  });
});

export async function getHomeCmsSnapshot(locale?: LocaleInput): Promise<HomeCmsSnapshot> {
  return getLocalizedCmsSnapshot({
    page: HOME_PAGE_KEY,
    locale,
    toSnapshot: toHomeSnapshot,
    localize: localizeHomeContent,
  });
}

export function parseHomeContentUpdate(input: unknown): { content: HomeContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateHomeContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveHomeContent(
  content: HomeContent,
  userId: string,
  locale?: LocaleInput,
): Promise<HomeCmsSnapshot> {
  return saveLocalizedCmsContent<HomeContent, HomeCmsSnapshot>(HOME_PAGE_KEY, content, userId, locale);
}

export async function deleteHomeContent(locale?: LocaleInput): Promise<boolean> {
  return deleteLocalizedCmsContent(HOME_PAGE_KEY, locale);
}

function toSiteSnapshot(doc: CmsPageDoc | null): SiteCmsSnapshot {
  return {
    content: normalizeSiteContent(doc?.content ?? SITE_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

function ensureCatalogNavLink(content: SiteContent, locale?: LocaleInput): SiteContent {
  if (content.nav.links.some((l) => l.href === '/products')) return content;
  const label = normalizeLocale(locale) === 'pl' ? 'Katalog' : 'Catalog';
  return {
    ...content,
    nav: {
      ...content.nav,
      links: [...content.nav.links, { label, href: '/products' }],
    },
  };
}

function getSiteLogoFields(content: SiteContent): SiteLogoFields {
  return {
    logoUrl: content.nav.logoUrl,
    logoAlt: content.nav.logoAlt,
  };
}

function applySiteLogoFields(content: SiteContent, logo: SiteLogoFields): SiteContent {
  return {
    ...content,
    nav: {
      ...content.nav,
      logoUrl: logo.logoUrl,
      logoAlt: logo.logoAlt,
    },
  };
}

function applySharedSiteLogo(content: SiteContent, logo: SharedSiteLogoFields): SiteContent {
  return logo.hasSource ? applySiteLogoFields(content, logo) : content;
}

async function readSharedSiteLogo(collection: Collection<CmsPageDoc>): Promise<SharedSiteLogoFields> {
  const docs = await collection.find({ page: SITE_PAGE_KEY }).toArray();
  const defaultDoc = docs.find((doc) => doc.locale === DEFAULT_LOCALE);

  if (defaultDoc) {
    return {
      ...getSiteLogoFields(toSiteSnapshot(defaultDoc).content),
      hasSource: true,
    };
  }

  const logoDoc = docs.find((doc) => {
    const logo = getSiteLogoFields(toSiteSnapshot(doc).content);
    return logo.logoUrl.trim().length > 0 || logo.logoAlt.trim().length > 0;
  });

  if (!logoDoc) return { logoUrl: '', logoAlt: '', hasSource: false };

  return {
    ...getSiteLogoFields(toSiteSnapshot(logoDoc).content),
    hasSource: true,
  };
}

async function syncSharedSiteLogo(
  collection: Collection<CmsPageDoc>,
  logo: SiteLogoFields,
  userId: string,
  now: Date,
): Promise<void> {
  await collection.updateOne(
    { page: SITE_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $setOnInsert: {
        page: SITE_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content: applySiteLogoFields(SITE_CONTENT_DEFAULTS, logo),
        createdAt: now,
      },
    },
    { upsert: true },
  );

  await collection.updateMany(
    { page: SITE_PAGE_KEY },
    {
      $set: {
        'content.nav.logoUrl': logo.logoUrl,
        'content.nav.logoAlt': logo.logoAlt,
        updatedAt: now,
        updatedBy: userId,
      },
    },
  );
}

export const getSiteContent = cache(async (locale?: LocaleInput): Promise<SiteContent> => {
  let content = await getLocalizedCmsContent({
    page: SITE_PAGE_KEY,
    locale,
    defaults: SITE_CONTENT_DEFAULTS,
    toSnapshot: toSiteSnapshot,
    localize: localizeSiteContent,
    label: 'site',
  });
  try {
    const collection = await getCmsPagesCollection();
    content = applySharedSiteLogo(content, await readSharedSiteLogo(collection));
  } catch (error) {
    logCmsFallback('shared site logo', error);
  }
  return ensureCatalogNavLink(content, locale);
});

export async function getSiteCmsSnapshot(locale?: LocaleInput): Promise<SiteCmsSnapshot> {
  const snapshot = await getLocalizedCmsSnapshot({
    page: SITE_PAGE_KEY,
    locale,
    toSnapshot: toSiteSnapshot,
    localize: localizeSiteContent,
  });
  const collection = await getCmsPagesCollection();
  return {
    ...snapshot,
    content: applySharedSiteLogo(snapshot.content, await readSharedSiteLogo(collection)),
  };
}

export function parseSiteContentUpdate(input: unknown): { content: SiteContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateSiteContent(candidate);
  return {
    content: errors.length === 0 ? normalizeSiteContent(content) : null,
    errors,
  };
}

export async function saveSiteContent(
  content: SiteContent,
  userId: string,
  locale?: LocaleInput,
): Promise<SiteCmsSnapshot> {
  const targetLocale = normalizeLocale(locale);
  const collection = await getCmsPagesCollection();
  const now = new Date();

  await collection.updateOne(
    { page: SITE_PAGE_KEY, locale: targetLocale },
    {
      $set: {
        page: SITE_PAGE_KEY,
        locale: targetLocale,
        content: normalizeSiteContent(content),
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  await syncSharedSiteLogo(collection, getSiteLogoFields(content), userId, now);

  return { content, updatedAt: now.toISOString(), updatedBy: userId };
}

export async function deleteSiteContent(locale?: LocaleInput): Promise<boolean> {
  return deleteLocalizedCmsContent(SITE_PAGE_KEY, locale);
}

export async function saveSiteLogo(logoUrl: string, logoAlt: string, userId: string): Promise<SiteCmsSnapshot> {
  const { content, errors } = validateSiteContent({
    ...SITE_CONTENT_DEFAULTS,
    nav: {
      ...SITE_CONTENT_DEFAULTS.nav,
      logoUrl,
      logoAlt,
    },
  });

  if (errors.length > 0) {
    throw new Error(`Invalid site logo content. ${errors.join(' ')}`.trim());
  }

  const collection = await getCmsPagesCollection();
  const now = new Date();
  const logo = getSiteLogoFields(content);
  await syncSharedSiteLogo(collection, logo, userId, now);

  const defaultDoc = await collection.findOne({ page: SITE_PAGE_KEY, locale: DEFAULT_LOCALE });
  return {
    ...toSiteSnapshot(defaultDoc),
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toAboutSnapshot(doc: CmsPageDoc | null): AboutCmsSnapshot {
  return {
    content: normalizeAboutContent(doc?.content ?? ABOUT_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export const getAboutContent = cache(async (locale?: LocaleInput): Promise<AboutContent> => {
  return getLocalizedCmsContent({
    page: ABOUT_PAGE_KEY,
    locale,
    defaults: ABOUT_CONTENT_DEFAULTS,
    toSnapshot: toAboutSnapshot,
    localize: localizeAboutContent,
    label: 'about',
  });
});

export async function getAboutCmsSnapshot(locale?: LocaleInput): Promise<AboutCmsSnapshot> {
  return getLocalizedCmsSnapshot({
    page: ABOUT_PAGE_KEY,
    locale,
    toSnapshot: toAboutSnapshot,
    localize: localizeAboutContent,
  });
}

export function parseAboutContentUpdate(input: unknown): { content: AboutContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateAboutContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveAboutContent(
  content: AboutContent,
  userId: string,
  locale?: LocaleInput,
): Promise<AboutCmsSnapshot> {
  return saveLocalizedCmsContent<AboutContent, AboutCmsSnapshot>(ABOUT_PAGE_KEY, content, userId, locale);
}

export async function deleteAboutContent(locale?: LocaleInput): Promise<boolean> {
  return deleteLocalizedCmsContent(ABOUT_PAGE_KEY, locale);
}

function toValuesSnapshot(doc: CmsPageDoc | null): ValuesCmsSnapshot {
  return {
    content: normalizeValuesContent(doc?.content ?? VALUES_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export const getValuesContent = cache(async (locale?: LocaleInput): Promise<ValuesContent> => {
  return getLocalizedCmsContent({
    page: VALUES_PAGE_KEY,
    locale,
    defaults: VALUES_CONTENT_DEFAULTS,
    toSnapshot: toValuesSnapshot,
    localize: localizeValuesContent,
    label: 'values',
  });
});

export async function getValuesCmsSnapshot(locale?: LocaleInput): Promise<ValuesCmsSnapshot> {
  return getLocalizedCmsSnapshot({
    page: VALUES_PAGE_KEY,
    locale,
    toSnapshot: toValuesSnapshot,
    localize: localizeValuesContent,
  });
}

export function parseValuesContentUpdate(input: unknown): { content: ValuesContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateValuesContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveValuesContent(
  content: ValuesContent,
  userId: string,
  locale?: LocaleInput,
): Promise<ValuesCmsSnapshot> {
  return saveLocalizedCmsContent<ValuesContent, ValuesCmsSnapshot>(VALUES_PAGE_KEY, content, userId, locale);
}

export async function deleteValuesContent(locale?: LocaleInput): Promise<boolean> {
  return deleteLocalizedCmsContent(VALUES_PAGE_KEY, locale);
}

function toStoriesPageSnapshot(doc: CmsPageDoc | null): StoriesPageCmsSnapshot {
  return {
    content: normalizeStoriesPageContent(doc?.content ?? STORIES_PAGE_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export const getStoriesPageContent = cache(async (locale?: LocaleInput): Promise<StoriesPageContent> => {
  return getLocalizedCmsContent({
    page: STORIES_PAGE_KEY,
    locale,
    defaults: STORIES_PAGE_CONTENT_DEFAULTS,
    toSnapshot: toStoriesPageSnapshot,
    localize: localizeStoriesPageContent,
    label: 'stories page',
  });
});

export async function getStoriesPageCmsSnapshot(locale?: LocaleInput): Promise<StoriesPageCmsSnapshot> {
  return getLocalizedCmsSnapshot({
    page: STORIES_PAGE_KEY,
    locale,
    toSnapshot: toStoriesPageSnapshot,
    localize: localizeStoriesPageContent,
  });
}

export function parseStoriesPageContentUpdate(input: unknown): { content: StoriesPageContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateStoriesPageContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveStoriesPageContent(
  content: StoriesPageContent,
  userId: string,
  locale?: LocaleInput,
): Promise<StoriesPageCmsSnapshot> {
  return saveLocalizedCmsContent<StoriesPageContent, StoriesPageCmsSnapshot>(
    STORIES_PAGE_KEY,
    content,
    userId,
    locale,
  );
}

export async function deleteStoriesPageContent(locale?: LocaleInput): Promise<boolean> {
  return deleteLocalizedCmsContent(STORIES_PAGE_KEY, locale);
}

function toLookbookPageSnapshot(doc: CmsPageDoc | null): LookbookPageCmsSnapshot {
  return {
    content: normalizeLookbookPageContent(doc?.content ?? LOOKBOOK_PAGE_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export const getLookbookPageContent = cache(async (locale?: LocaleInput): Promise<LookbookPageContent> => {
  return getLocalizedCmsContent({
    page: LOOKBOOK_PAGE_KEY,
    locale,
    defaults: LOOKBOOK_PAGE_CONTENT_DEFAULTS,
    toSnapshot: toLookbookPageSnapshot,
    localize: localizeLookbookPageContent,
    label: 'lookbook page',
  });
});

export async function getLookbookPageCmsSnapshot(locale?: LocaleInput): Promise<LookbookPageCmsSnapshot> {
  return getLocalizedCmsSnapshot({
    page: LOOKBOOK_PAGE_KEY,
    locale,
    toSnapshot: toLookbookPageSnapshot,
    localize: localizeLookbookPageContent,
  });
}

export function parseLookbookPageContentUpdate(input: unknown): { content: LookbookPageContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateLookbookPageContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveLookbookPageContent(
  content: LookbookPageContent,
  userId: string,
  locale?: LocaleInput,
): Promise<LookbookPageCmsSnapshot> {
  return saveLocalizedCmsContent<LookbookPageContent, LookbookPageCmsSnapshot>(
    LOOKBOOK_PAGE_KEY,
    content,
    userId,
    locale,
  );
}

export async function deleteLookbookPageContent(locale?: LocaleInput): Promise<boolean> {
  return deleteLocalizedCmsContent(LOOKBOOK_PAGE_KEY, locale);
}

function toContactSnapshot(doc: CmsPageDoc | null): ContactCmsSnapshot {
  return {
    content: normalizeContactContent(doc?.content ?? CONTACT_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export const getContactContent = cache(async (locale?: LocaleInput): Promise<ContactContent> => {
  return getLocalizedCmsContent({
    page: CONTACT_PAGE_KEY,
    locale,
    defaults: CONTACT_CONTENT_DEFAULTS,
    toSnapshot: toContactSnapshot,
    localize: localizeContactContent,
    label: 'contact',
  });
});

export async function getContactCmsSnapshot(locale?: LocaleInput): Promise<ContactCmsSnapshot> {
  return getLocalizedCmsSnapshot({
    page: CONTACT_PAGE_KEY,
    locale,
    toSnapshot: toContactSnapshot,
    localize: localizeContactContent,
  });
}

export function parseContactContentUpdate(input: unknown): { content: ContactContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateContactContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveContactContent(
  content: ContactContent,
  userId: string,
  locale?: LocaleInput,
): Promise<ContactCmsSnapshot> {
  return saveLocalizedCmsContent<ContactContent, ContactCmsSnapshot>(CONTACT_PAGE_KEY, content, userId, locale);
}

export async function deleteContactContent(locale?: LocaleInput): Promise<boolean> {
  return deleteLocalizedCmsContent(CONTACT_PAGE_KEY, locale);
}

function toWishlistSnapshot(doc: CmsPageDoc | null): WishlistCmsSnapshot {
  return {
    content: normalizeWishlistContent(doc?.content ?? WISHLIST_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export const getWishlistContent = cache(async (locale?: LocaleInput): Promise<WishlistContent> => {
  return getLocalizedCmsContent({
    page: WISHLIST_PAGE_KEY,
    locale,
    defaults: WISHLIST_CONTENT_DEFAULTS,
    toSnapshot: toWishlistSnapshot,
    localize: localizeWishlistContent,
    label: 'wishlist',
  });
});

export async function getWishlistCmsSnapshot(locale?: LocaleInput): Promise<WishlistCmsSnapshot> {
  return getLocalizedCmsSnapshot({
    page: WISHLIST_PAGE_KEY,
    locale,
    toSnapshot: toWishlistSnapshot,
    localize: localizeWishlistContent,
  });
}

export function parseWishlistContentUpdate(input: unknown): { content: WishlistContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateWishlistContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveWishlistContent(
  content: WishlistContent,
  userId: string,
  locale?: LocaleInput,
): Promise<WishlistCmsSnapshot> {
  return saveLocalizedCmsContent<WishlistContent, WishlistCmsSnapshot>(WISHLIST_PAGE_KEY, content, userId, locale);
}

export async function deleteWishlistContent(locale?: LocaleInput): Promise<boolean> {
  return deleteLocalizedCmsContent(WISHLIST_PAGE_KEY, locale);
}

function toCheckoutSnapshot(doc: CmsPageDoc | null): CheckoutCmsSnapshot {
  return {
    content: ensureCheckoutProviderShipping(normalizeCheckoutContent(doc?.content ?? CHECKOUT_CONTENT_DEFAULTS)),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export const getCheckoutContent = cache(async (locale?: LocaleInput): Promise<CheckoutContent> => {
  return getLocalizedCmsContent({
    page: CHECKOUT_PAGE_KEY,
    locale,
    defaults: CHECKOUT_CONTENT_DEFAULTS,
    toSnapshot: toCheckoutSnapshot,
    localize: localizeCheckoutContent,
    label: 'checkout',
  });
});

export async function getCheckoutCmsSnapshot(locale?: LocaleInput): Promise<CheckoutCmsSnapshot> {
  return getLocalizedCmsSnapshot({
    page: CHECKOUT_PAGE_KEY,
    locale,
    toSnapshot: toCheckoutSnapshot,
    localize: localizeCheckoutContent,
  });
}

export function parseCheckoutContentUpdate(input: unknown): { content: CheckoutContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateCheckoutContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveCheckoutContent(
  content: CheckoutContent,
  userId: string,
  locale?: LocaleInput,
): Promise<CheckoutCmsSnapshot> {
  return saveLocalizedCmsContent<CheckoutContent, CheckoutCmsSnapshot>(CHECKOUT_PAGE_KEY, content, userId, locale);
}

export async function deleteCheckoutContent(locale?: LocaleInput): Promise<boolean> {
  return deleteLocalizedCmsContent(CHECKOUT_PAGE_KEY, locale);
}

function toProductsSnapshot(doc: CmsPageDoc | null): ProductsCmsSnapshot {
  return {
    content: normalizeProductsContent(doc?.content ?? PRODUCTS_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export const getProductsContent = cache(async (locale?: LocaleInput): Promise<ProductsContent> => {
  return getLocalizedCmsContent({
    page: PRODUCTS_PAGE_KEY,
    locale,
    defaults: PRODUCTS_CONTENT_DEFAULTS,
    toSnapshot: toProductsSnapshot,
    localize: localizeProductsContent,
    label: 'products',
  });
});

export async function getProductsCmsSnapshot(locale?: LocaleInput): Promise<ProductsCmsSnapshot> {
  return getLocalizedCmsSnapshot({
    page: PRODUCTS_PAGE_KEY,
    locale,
    toSnapshot: toProductsSnapshot,
    localize: localizeProductsContent,
  });
}

export function parseProductsContentUpdate(input: unknown): { content: ProductsContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateProductsContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveProductsContent(
  content: ProductsContent,
  userId: string,
  locale?: LocaleInput,
): Promise<ProductsCmsSnapshot> {
  return saveLocalizedCmsContent<ProductsContent, ProductsCmsSnapshot>(PRODUCTS_PAGE_KEY, content, userId, locale);
}

export async function deleteProductsContent(locale?: LocaleInput): Promise<boolean> {
  return deleteLocalizedCmsContent(PRODUCTS_PAGE_KEY, locale);
}

function toAccountSnapshot(doc: CmsPageDoc | null): AccountCmsSnapshot {
  return {
    content: normalizeAccountContent(doc?.content ?? ACCOUNT_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export const getAccountContent = cache(async (locale?: LocaleInput): Promise<AccountContent> => {
  return getLocalizedCmsContent({
    page: ACCOUNT_PAGE_KEY,
    locale,
    defaults: ACCOUNT_CONTENT_DEFAULTS,
    toSnapshot: toAccountSnapshot,
    localize: localizeAccountContent,
    label: 'account',
  });
});

export async function getAccountCmsSnapshot(locale?: LocaleInput): Promise<AccountCmsSnapshot> {
  return getLocalizedCmsSnapshot({
    page: ACCOUNT_PAGE_KEY,
    locale,
    toSnapshot: toAccountSnapshot,
    localize: localizeAccountContent,
  });
}

export function parseAccountContentUpdate(input: unknown): { content: AccountContent | null; errors: string[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { content: null, errors: ['CMS payload must be an object.'] };
  }

  const root = input as Record<string, unknown>;
  const candidate = root['content'] ?? input;
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return { content: null, errors: ['CMS content must be an object.'] };
  }

  const { content, errors } = validateAccountContent(candidate);
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveAccountContent(
  content: AccountContent,
  userId: string,
  locale?: LocaleInput,
): Promise<AccountCmsSnapshot> {
  return saveLocalizedCmsContent<AccountContent, AccountCmsSnapshot>(ACCOUNT_PAGE_KEY, content, userId, locale);
}

export async function deleteAccountContent(locale?: LocaleInput): Promise<boolean> {
  return deleteLocalizedCmsContent(ACCOUNT_PAGE_KEY, locale);
}
