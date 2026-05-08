import { getDb } from '@/lib/mongodb';
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

async function findCmsPage(page: string, localeInput?: LocaleInput): Promise<CmsPageDoc | null> {
  const locale = normalizeLocale(localeInput);
  const db = await getDb();
  const collection = db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION);
  const doc = await collection.findOne({ page, locale });
  if (doc || locale === DEFAULT_LOCALE) return doc;
  return collection.findOne({ page, locale: DEFAULT_LOCALE });
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
      tags: ['Anime', 'Gaming', 'Film', 'Manga', 'Breloki', 'Piny', 'Biżuteria'],
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
      panelSubtitle: 'Anime · Gaming · Film',
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
        return { ...card, ...(labels[card.id] ?? {}) };
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
          '/products': 'Wszystkie produkty',
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
      copyright: '© 2026 ARCANA NEXUS. Wszelkie prawa zastrzeżone.',
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
            'About ARCANA': 'O ARCANA',
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
      message: 'Używamy cookies, aby zapamiętać preferencje, zrozumieć korzystanie z ARCANA i poprawiać doświadczenie.',
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
      clearAllLabel: 'Wyczyść wszystko',
      clearFiltersLabel: 'Wyczyść filtry',
      priceLabel: 'Cena',
      sizeLabel: 'Rozmiar',
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
          'price-asc': 'Cena: od najniższej',
          'price-desc': 'Cena: od najwyższej',
          newest: 'Najnowsze',
        } as Record<string, string>)[option.value] ?? option.label,
      })),
      priceRanges: content.collection.priceRanges.map((range, index) => ({
        ...range,
        label: [
          'Poniżej € 200',
          '€ 200 - € 500',
          '€ 500 - € 1,000',
          'Powyżej € 1,000',
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
        'ARCANA powstała z prostego pytania: dlaczego tak wiele rzeczy szybko traci znaczenie? Zaczęliśmy od szukania przedmiotów tworzonych z uwagą, a nie pod presją sezonu.',
        'Z czasem ta ciekawość zmieniła się w katalog licencjonowanych kolekcjonalii, akcesoriów i drobnych obiektów inspirowanych anime, grami oraz filmem.',
        'Wybieramy rzeczy, które dobrze wyglądają na półce, przy kluczach, na torbie albo w codziennym użyciu. Każdy drop ma być rozpoznawalny, dobrze opisany i łatwy do pokochania.',
        'Dziś ARCANA jest miejscem dla osób, które lubią kolekcjonować świadomie: mniej przypadkowych gadżetów, więcej przedmiotów związanych z ulubionymi światami.',
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
      location: ['Katalog ARCANA', 'Dropy live', 'Archiwum marek', 'Product List'][index] ?? artisan.location,
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
      attribution: '- ARCANA',
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
      primaryCtaLabel: 'Poznaj ARCANA',
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
      issueLabelPrefix: 'Historie ARCANA',
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
      eyebrow: 'ARCANA · Archiwum wizualne',
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
      label: 'Archiwum lookbooka ARCANA',
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
      body: 'Odpowiedzi spodziewaj się w ciągu 2 dni roboczych. W pilnych sprawach możesz też napisać bezpośrednio na hello@arcana.com.',
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

function localizeCheckoutContent(content: CheckoutContent, localeInput?: LocaleInput): CheckoutContent {
  if (normalizeLocale(localeInput) !== 'pl') return content;
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
    shippingMethods: content.shippingMethods.map((method) => ({
      ...method,
      label: ({
        standard: 'Dostawa standardowa',
        express: 'Dostawa ekspresowa',
        overnight: 'Dostawa następnego dnia',
      } as Record<string, string>)[method.id] ?? method.label,
      detail: ({
        standard: '5-7 dni roboczych',
        express: '2-3 dni robocze',
        overnight: 'Następny dzień roboczy przed 12:00',
      } as Record<string, string>)[method.id] ?? method.detail,
      priceLabel: method.price === 0 ? 'Darmowa' : method.priceLabel,
    })),
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
      qtyLabel: 'Ilość',
      statuses: {
        delivered: 'Dostarczone',
        'in-transit': 'W drodze',
        processing: 'W realizacji',
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

export async function getHomeContent(locale?: LocaleInput): Promise<HomeContent> {
  try {
    const doc = await findCmsPage(HOME_PAGE_KEY, locale);
    return localizeHomeContent(toHomeSnapshot(doc).content, locale);
  } catch (error) {
    console.error('Failed to load home CMS content, using defaults.', error);
    return localizeHomeContent(HOME_CONTENT_DEFAULTS, locale);
  }
}

export async function getHomeCmsSnapshot(locale?: LocaleInput): Promise<HomeCmsSnapshot> {
  const doc = await findCmsPage(HOME_PAGE_KEY, locale);
  return toHomeSnapshot(doc);
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

export async function saveHomeContent(content: HomeContent, userId: string): Promise<HomeCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: HOME_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: HOME_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toSiteSnapshot(doc: CmsPageDoc | null): SiteCmsSnapshot {
  return {
    content: normalizeSiteContent(doc?.content ?? SITE_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getSiteContent(locale?: LocaleInput): Promise<SiteContent> {
  try {
    const doc = await findCmsPage(SITE_PAGE_KEY, locale);
    return localizeSiteContent(toSiteSnapshot(doc).content, locale);
  } catch (error) {
    console.error('Failed to load site CMS content, using defaults.', error);
    return localizeSiteContent(SITE_CONTENT_DEFAULTS, locale);
  }
}

export async function getSiteCmsSnapshot(locale?: LocaleInput): Promise<SiteCmsSnapshot> {
  const doc = await findCmsPage(SITE_PAGE_KEY, locale);
  return toSiteSnapshot(doc);
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
  return { content: errors.length === 0 ? content : null, errors };
}

export async function saveSiteContent(content: SiteContent, userId: string): Promise<SiteCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: SITE_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: SITE_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
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

export async function getAboutContent(locale?: LocaleInput): Promise<AboutContent> {
  try {
    const doc = await findCmsPage(ABOUT_PAGE_KEY, locale);
    return localizeAboutContent(toAboutSnapshot(doc).content, locale);
  } catch (error) {
    console.error('Failed to load about CMS content, using defaults.', error);
    return localizeAboutContent(ABOUT_CONTENT_DEFAULTS, locale);
  }
}

export async function getAboutCmsSnapshot(locale?: LocaleInput): Promise<AboutCmsSnapshot> {
  const doc = await findCmsPage(ABOUT_PAGE_KEY, locale);
  return toAboutSnapshot(doc);
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

export async function saveAboutContent(content: AboutContent, userId: string): Promise<AboutCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: ABOUT_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: ABOUT_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toValuesSnapshot(doc: CmsPageDoc | null): ValuesCmsSnapshot {
  return {
    content: normalizeValuesContent(doc?.content ?? VALUES_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getValuesContent(locale?: LocaleInput): Promise<ValuesContent> {
  try {
    const doc = await findCmsPage(VALUES_PAGE_KEY, locale);
    return localizeValuesContent(toValuesSnapshot(doc).content, locale);
  } catch (error) {
    console.error('Failed to load values CMS content, using defaults.', error);
    return localizeValuesContent(VALUES_CONTENT_DEFAULTS, locale);
  }
}

export async function getValuesCmsSnapshot(locale?: LocaleInput): Promise<ValuesCmsSnapshot> {
  const doc = await findCmsPage(VALUES_PAGE_KEY, locale);
  return toValuesSnapshot(doc);
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

export async function saveValuesContent(content: ValuesContent, userId: string): Promise<ValuesCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: VALUES_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: VALUES_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toStoriesPageSnapshot(doc: CmsPageDoc | null): StoriesPageCmsSnapshot {
  return {
    content: normalizeStoriesPageContent(doc?.content ?? STORIES_PAGE_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getStoriesPageContent(locale?: LocaleInput): Promise<StoriesPageContent> {
  try {
    const doc = await findCmsPage(STORIES_PAGE_KEY, locale);
    return localizeStoriesPageContent(toStoriesPageSnapshot(doc).content, locale);
  } catch (error) {
    console.error('Failed to load stories page CMS content, using defaults.', error);
    return localizeStoriesPageContent(STORIES_PAGE_CONTENT_DEFAULTS, locale);
  }
}

export async function getStoriesPageCmsSnapshot(locale?: LocaleInput): Promise<StoriesPageCmsSnapshot> {
  const doc = await findCmsPage(STORIES_PAGE_KEY, locale);
  return toStoriesPageSnapshot(doc);
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

export async function saveStoriesPageContent(content: StoriesPageContent, userId: string): Promise<StoriesPageCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: STORIES_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: STORIES_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toLookbookPageSnapshot(doc: CmsPageDoc | null): LookbookPageCmsSnapshot {
  return {
    content: normalizeLookbookPageContent(doc?.content ?? LOOKBOOK_PAGE_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getLookbookPageContent(locale?: LocaleInput): Promise<LookbookPageContent> {
  try {
    const doc = await findCmsPage(LOOKBOOK_PAGE_KEY, locale);
    return localizeLookbookPageContent(toLookbookPageSnapshot(doc).content, locale);
  } catch (error) {
    console.error('Failed to load lookbook page CMS content, using defaults.', error);
    return localizeLookbookPageContent(LOOKBOOK_PAGE_CONTENT_DEFAULTS, locale);
  }
}

export async function getLookbookPageCmsSnapshot(locale?: LocaleInput): Promise<LookbookPageCmsSnapshot> {
  const doc = await findCmsPage(LOOKBOOK_PAGE_KEY, locale);
  return toLookbookPageSnapshot(doc);
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

export async function saveLookbookPageContent(content: LookbookPageContent, userId: string): Promise<LookbookPageCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: LOOKBOOK_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: LOOKBOOK_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toContactSnapshot(doc: CmsPageDoc | null): ContactCmsSnapshot {
  return {
    content: normalizeContactContent(doc?.content ?? CONTACT_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getContactContent(locale?: LocaleInput): Promise<ContactContent> {
  try {
    const doc = await findCmsPage(CONTACT_PAGE_KEY, locale);
    return localizeContactContent(toContactSnapshot(doc).content, locale);
  } catch (error) {
    console.error('Failed to load contact CMS content, using defaults.', error);
    return localizeContactContent(CONTACT_CONTENT_DEFAULTS, locale);
  }
}

export async function getContactCmsSnapshot(locale?: LocaleInput): Promise<ContactCmsSnapshot> {
  const doc = await findCmsPage(CONTACT_PAGE_KEY, locale);
  return toContactSnapshot(doc);
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

export async function saveContactContent(content: ContactContent, userId: string): Promise<ContactCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: CONTACT_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: CONTACT_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toWishlistSnapshot(doc: CmsPageDoc | null): WishlistCmsSnapshot {
  return {
    content: normalizeWishlistContent(doc?.content ?? WISHLIST_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getWishlistContent(locale?: LocaleInput): Promise<WishlistContent> {
  try {
    const doc = await findCmsPage(WISHLIST_PAGE_KEY, locale);
    return localizeWishlistContent(toWishlistSnapshot(doc).content, locale);
  } catch (error) {
    console.error('Failed to load wishlist CMS content, using defaults.', error);
    return localizeWishlistContent(WISHLIST_CONTENT_DEFAULTS, locale);
  }
}

export async function getWishlistCmsSnapshot(locale?: LocaleInput): Promise<WishlistCmsSnapshot> {
  const doc = await findCmsPage(WISHLIST_PAGE_KEY, locale);
  return toWishlistSnapshot(doc);
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

export async function saveWishlistContent(content: WishlistContent, userId: string): Promise<WishlistCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: WISHLIST_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: WISHLIST_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toCheckoutSnapshot(doc: CmsPageDoc | null): CheckoutCmsSnapshot {
  return {
    content: normalizeCheckoutContent(doc?.content ?? CHECKOUT_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getCheckoutContent(locale?: LocaleInput): Promise<CheckoutContent> {
  try {
    const doc = await findCmsPage(CHECKOUT_PAGE_KEY, locale);
    return localizeCheckoutContent(toCheckoutSnapshot(doc).content, locale);
  } catch (error) {
    console.error('Failed to load checkout CMS content, using defaults.', error);
    return localizeCheckoutContent(CHECKOUT_CONTENT_DEFAULTS, locale);
  }
}

export async function getCheckoutCmsSnapshot(locale?: LocaleInput): Promise<CheckoutCmsSnapshot> {
  const doc = await findCmsPage(CHECKOUT_PAGE_KEY, locale);
  return toCheckoutSnapshot(doc);
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

export async function saveCheckoutContent(content: CheckoutContent, userId: string): Promise<CheckoutCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: CHECKOUT_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: CHECKOUT_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toProductsSnapshot(doc: CmsPageDoc | null): ProductsCmsSnapshot {
  return {
    content: normalizeProductsContent(doc?.content ?? PRODUCTS_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getProductsContent(locale?: LocaleInput): Promise<ProductsContent> {
  try {
    const doc = await findCmsPage(PRODUCTS_PAGE_KEY, locale);
    return localizeProductsContent(toProductsSnapshot(doc).content, locale);
  } catch (error) {
    console.error('Failed to load products CMS content, using defaults.', error);
    return localizeProductsContent(PRODUCTS_CONTENT_DEFAULTS, locale);
  }
}

export async function getProductsCmsSnapshot(locale?: LocaleInput): Promise<ProductsCmsSnapshot> {
  const doc = await findCmsPage(PRODUCTS_PAGE_KEY, locale);
  return toProductsSnapshot(doc);
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

export async function saveProductsContent(content: ProductsContent, userId: string): Promise<ProductsCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: PRODUCTS_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: PRODUCTS_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}

function toAccountSnapshot(doc: CmsPageDoc | null): AccountCmsSnapshot {
  return {
    content: normalizeAccountContent(doc?.content ?? ACCOUNT_CONTENT_DEFAULTS),
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : null,
    updatedBy: doc?.updatedBy ?? null,
  };
}

export async function getAccountContent(locale?: LocaleInput): Promise<AccountContent> {
  try {
    const doc = await findCmsPage(ACCOUNT_PAGE_KEY, locale);
    return localizeAccountContent(toAccountSnapshot(doc).content, locale);
  } catch (error) {
    console.error('Failed to load account CMS content, using defaults.', error);
    return localizeAccountContent(ACCOUNT_CONTENT_DEFAULTS, locale);
  }
}

export async function getAccountCmsSnapshot(locale?: LocaleInput): Promise<AccountCmsSnapshot> {
  const doc = await findCmsPage(ACCOUNT_PAGE_KEY, locale);
  return toAccountSnapshot(doc);
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

export async function saveAccountContent(content: AccountContent, userId: string): Promise<AccountCmsSnapshot> {
  const db = await getDb();
  const now = new Date();

  await db.collection<CmsPageDoc>(CMS_PAGES_COLLECTION).updateOne(
    { page: ACCOUNT_PAGE_KEY, locale: DEFAULT_LOCALE },
    {
      $set: {
        page: ACCOUNT_PAGE_KEY,
        locale: DEFAULT_LOCALE,
        content,
        updatedAt: now,
        updatedBy: userId,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    content,
    updatedAt: now.toISOString(),
    updatedBy: userId,
  };
}
