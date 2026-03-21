import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import type { SettingsPanelField } from '@/features/kangur/shared/ui/templates/SettingsPanelBuilder';
import type { KangurStorefrontAppearanceMode } from '@/features/kangur/storefront-appearance-settings';
import {
  BUILTIN_DAILY_ID,
  BUILTIN_DAWN_ID,
  BUILTIN_NIGHTLY_ID,
  BUILTIN_SUNSET_ID,
  FACTORY_DAILY_ID,
  FACTORY_DAWN_ID,
  FACTORY_NIGHTLY_ID,
  FACTORY_SUNSET_ID,
  PRESET_DAILY_CRYSTAL_ID,
  PRESET_NIGHTLY_CRYSTAL_ID,
  SLOT_ORDER,
  THEME_SECTIONS,
  type AppearanceThemeSectionId,
  type AppearanceSlot,
  type ThemeSelectionId,
} from './AppearancePage.constants';

export type AppearanceAdminLocale = 'en' | 'pl';
export type AppearancePreviewSection =
  | 'page'
  | 'buttons'
  | 'cards'
  | 'colors'
  | 'chat'
  | 'components';
export type AppearanceCatalogSortOption =
  | 'created-desc'
  | 'created-asc'
  | 'updated-desc'
  | 'name-asc'
  | 'name-desc';

const PRESET_LABELS = {
  dailyCrystal: 'Daily Crystal (preset)',
  nightlyCrystal: 'Nightly Crystal (preset)',
} as const;

const SECTION_COPY: Record<
  AppearanceAdminLocale,
  Record<AppearanceThemeSectionId, { title: string; subtitle: string }>
> = {
  en: {
    corePalette: {
      title: 'Core Palette',
      subtitle: 'Brand colors, text tones, and feedback states across Kangur.',
    },
    textOverrides: {
      title: 'Text Overrides',
      subtitle: 'Optional overrides for page, cards, and navigation text colors.',
    },
    logoLoader: {
      title: 'Logo & Loader',
      subtitle: 'Fine-tune the Kangur logo gradients used on the loader and navigation.',
    },
    layoutRadii: {
      title: 'Layout & Radii',
      subtitle: 'Page spacing, corner rounding, and panel alignment.',
    },
    gradientsTransparency: {
      title: 'Gradients & Transparency',
      subtitle: 'Fine-tune panel backgrounds and navigation transparency.',
    },
    typography: {
      title: 'Typography',
      subtitle: 'Fonts used for headings and body text.',
    },
    buttonsGlobal: {
      title: 'Buttons (Global)',
      subtitle: 'Shared settings for primary and secondary buttons.',
    },
    buttonShadows: {
      title: 'Button Shadows',
      subtitle: 'Drop shadows for primary and secondary buttons.',
    },
    gelGlassEffects: {
      title: 'Gel & Glass Effects',
      subtitle: 'Settings for modern glass and gel styles.',
    },
    homeActionButtons: {
      title: 'Home Action Buttons',
      subtitle: 'Highly specialized overrides for the main game-home action cards.',
    },
    dropShadows: {
      title: 'Drop Shadows',
      subtitle: 'Shared shadow configurations for containers and cards.',
    },
  },
  pl: {
    corePalette: {
      title: 'Paleta główna',
      subtitle: 'Kolory marki, tony tekstu i stany informacji zwrotnej w Kangur.',
    },
    textOverrides: {
      title: 'Nadpisania tekstu',
      subtitle: 'Opcjonalne nadpisania kolorów tekstu strony, kart i nawigacji.',
    },
    logoLoader: {
      title: 'Logo i loader',
      subtitle: 'Dostrój gradienty logo Kangur używane w loaderze i nawigacji.',
    },
    layoutRadii: {
      title: 'Układ i promienie',
      subtitle: 'Odstępy strony, zaokrąglenia rogów i ustawienie paneli.',
    },
    gradientsTransparency: {
      title: 'Gradienty i przezroczystość',
      subtitle: 'Dostrój tła paneli i przezroczystość nawigacji.',
    },
    typography: {
      title: 'Typografia',
      subtitle: 'Fonty używane w nagłówkach i tekście głównym.',
    },
    buttonsGlobal: {
      title: 'Przyciski (globalnie)',
      subtitle: 'Wspólne ustawienia dla głównych i drugorzędnych przycisków.',
    },
    buttonShadows: {
      title: 'Cienie przycisków',
      subtitle: 'Cienie zewnętrzne dla głównych i drugorzędnych przycisków.',
    },
    gelGlassEffects: {
      title: 'Efekty żelowe i szklane',
      subtitle: 'Ustawienia nowoczesnych efektów glass i gel.',
    },
    homeActionButtons: {
      title: 'Przyciski akcji strony głównej',
      subtitle: 'Specjalne nadpisania dla głównych kart akcji na stronie gry.',
    },
    dropShadows: {
      title: 'Cienie',
      subtitle: 'Wspólne konfiguracje cieni dla kontenerów i kart.',
    },
  },
};

const OPTION_LABELS: Record<AppearanceAdminLocale, Record<string, string>> = {
  en: {},
  pl: {
    '300': 'Lekki (300)',
    '400': 'Regularny (400)',
    '500': 'Średni (500)',
    '600': 'Polgruby (600)',
    '700': 'Gruby (700)',
    '800': 'Bardzo gruby (800)',
    inherit: 'Dziedzicz',
    'system-ui': 'Interfejs systemowy',
    none: 'Brak',
    small: 'Maly',
    medium: 'Średni',
    large: 'Duzy',
    'vertical-lift': 'Pionowe uniesienie',
    scale: 'Powiekszenie',
    glow: 'Poswiata',
    border: 'Podswietlenie ramki',
    ease: 'Lagodne',
    'ease-in': 'Lagodne wejscie',
    'ease-out': 'Lagodne wyjscie',
    'ease-in-out': 'Lagodne wejscie i wyjscie',
    linear: 'Liniowe',
    left: 'Lewa',
    right: 'Prawa',
  },
};

const FIELD_LABELS: Record<AppearanceAdminLocale, Record<string, string>> = {
  en: {},
  pl: {
    primaryColor: 'Glowny akcent',
    secondaryColor: 'Drugorzedny akcent',
    accentColor: 'Akcent ostrzezenia',
    successColor: 'Sukces',
    errorColor: 'Blad / destrukcyjne',
    textColor: 'Glowny tekst',
    mutedTextColor: 'Wyciszony tekst',
    pageTextColor: 'Nadpisanie tekstu strony',
    pageMutedTextColor: 'Nadpisanie wyciszonego tekstu strony',
    cardTextColor: 'Nadpisanie tekstu karty',
    navTextColor: 'Nadpisanie tekstu nawigacji',
    navActiveTextColor: 'Nadpisanie aktywnego tekstu nawigacji',
    navHoverTextColor: 'Nadpisanie tekstu hover nawigacji',
    logoWordStart: 'Poczatek napisu logo',
    logoWordMid: 'Srodek napisu logo',
    logoWordEnd: 'Koniec napisu logo',
    logoRingStart: 'Poczatek obwodki',
    logoRingEnd: 'Koniec obwodki',
    logoAccentStart: 'Poczatek akcentu',
    logoAccentEnd: 'Koniec akcentu',
    logoInnerStart: 'Poczatek wnetrza logo',
    logoInnerEnd: 'Koniec wnetrza logo',
    logoShadow: 'Cien logo',
    logoGlint: 'Blik logo',
    pagePadding: 'Domyslny padding strony',
    pagePaddingTop: 'Padding strony od gory',
    pagePaddingBottom: 'Padding strony od dolu',
    gridGutter: 'Odstep siatki',
    cardRadius: 'Promien rogu karty',
    containerPaddingInner: 'Wewnetrzny padding kontenera',
    panelGradientStart: 'Poczatek gradientu panelu',
    panelGradientEnd: 'Koniec gradientu panelu',
    panelTransparency: 'Nieprzezroczystosc panelu (0-1)',
    navGradientStart: 'Poczatek gradientu nawigacji',
    navGradientEnd: 'Koniec gradientu nawigacji',
    navTransparency: 'Nieprzezroczystosc nawigacji (0-1)',
    headingFont: 'Font naglowka',
    bodyFont: 'Font tekstu',
    baseSize: 'Bazowy rozmiar fontu',
    headingWeight: 'Grubosc naglowka',
    bodyWeight: 'Grubosc tekstu',
    lineHeight: 'Wysokosc linii tekstu',
    headingLineHeight: 'Wysokosc linii naglowka',
    btnPrimaryBg: 'Tlo glownego przycisku',
    btnPrimaryText: 'Tekst glownego przycisku',
    btnSecondaryBg: 'Tlo drugorzednego przycisku',
    btnSecondaryText: 'Tekst drugorzednego przycisku',
    btnOutlineBorder: 'Kolor ramki outline',
    btnRadius: 'Promien rogu przycisku',
    btnBorderRadius: 'Promien ramki przycisku',
    btnFontSize: 'Rozmiar fontu przycisku',
    btnFontWeight: 'Grubosc fontu przycisku',
    btnPaddingX: 'Padding X przycisku',
    btnPaddingY: 'Padding Y przycisku',
    btnBorderWidth: 'Szerokosc ramki przycisku',
    btnBorderOpacity: 'Nieprzezroczystosc ramki przycisku (0-100)',
    btnShadowX: 'Cien przycisku X',
    btnShadowY: 'Cien przycisku Y',
    btnShadowBlur: 'Rozmycie cienia przycisku',
    btnShadowOpacity: 'Nieprzezroczystosc cienia przycisku (0-1)',
    btnGlossOpacity: 'Nieprzezroczystosc polysku',
    btnGlossHeight: 'Wysokosc polysku (%)',
    btnGlossAngle: 'Kat polysku (deg)',
    btnGlossColor: 'Kolor zabarwienia polysku',
    btnInsetHighlightOpacity: 'Nieprzezroczystosc podswietlenia wewnetrznego',
    btnInsetShadowOpacity: 'Nieprzezroczystosc cienia wewnetrznego',
    btnInsetShadowBlur: 'Rozmycie cienia wewnetrznego',
    btnInsetShadowY: 'Cien wewnetrzny Y',
    btnTextShadowOpacity: 'Nieprzezroczystosc cienia tekstu',
    btnTextShadowY: 'Cien tekstu Y',
    btnTextShadowBlur: 'Rozmycie cienia tekstu',
    btnGlowOpacity: 'Nieprzezroczystosc poswiaty przycisku',
    btnGlowSpread: 'Rozchodzenie poswiaty przycisku',
    btnGlowColor: 'Nadpisanie koloru poswiaty',
    containerShadowX: 'Cien panelu X',
    containerShadowY: 'Cien panelu Y',
    containerShadowBlur: 'Rozmycie cienia panelu',
    containerShadowOpacity: 'Nieprzezroczystosc cienia panelu',
    cardShadowX: 'Cien karty X',
    cardShadowY: 'Cien karty Y',
    cardShadowBlur: 'Rozmycie cienia karty',
    cardShadowOpacity: 'Nieprzezroczystosc cienia karty',
  },
};

const FIELD_HELPERS: Record<AppearanceAdminLocale, Record<string, string>> = {
  en: {},
  pl: {
    pageTextColor: 'Zostaw puste, aby uzyc koloru glownego tekstu.',
    pageMutedTextColor: 'Zostaw puste, aby uzyc koloru wyciszonego tekstu.',
    cardTextColor: 'Steruje kolorem tekstu wewnatrz miekkich kart.',
    navTextColor: 'Nadpisuje kolor tekstu gornej nawigacji.',
    navActiveTextColor: 'Nadpisuje kolor aktywnego tekstu nawigacji.',
    navHoverTextColor: 'Nadpisuje kolor tekstu hover nawigacji.',
  },
};

const FIELD_PLACEHOLDERS: Record<AppearanceAdminLocale, Record<string, string>> = {
  en: {},
  pl: {
    pageTextColor: 'Auto',
    pageMutedTextColor: 'Auto',
    cardTextColor: 'Auto',
    navTextColor: 'Auto',
    navActiveTextColor: 'Auto',
    navHoverTextColor: 'Auto',
    pagePaddingTop: 'Auto',
    pagePaddingBottom: 'Auto',
    panelGradientStart: 'Auto',
    panelGradientEnd: 'Auto',
    navGradientStart: 'Auto',
    navGradientEnd: 'Auto',
    btnPrimaryBg: 'Auto',
    btnSecondaryBg: 'Auto',
    btnGlowColor: 'Auto (tlo przycisku)',
  },
};

const HOME_ACTION_GROUP_LABELS: Record<
  AppearanceAdminLocale,
  Record<'lessons' | 'play' | 'training' | 'kangur', string>
> = {
  en: {
    lessons: 'Lessons',
    play: 'Play',
    training: 'Training',
    kangur: 'Kangur',
  },
  pl: {
    lessons: 'Lekcje',
    play: 'Graj',
    training: 'Trening',
    kangur: 'Kangur',
  },
};

const HOME_ACTION_TOKEN_LABELS: Record<AppearanceAdminLocale, Record<string, string>> = {
  en: {
    TextColor: 'Text Color',
    TextActiveColor: 'Active Text Color',
    LabelStart: 'Label Gradient Start',
    LabelMid: 'Label Gradient Mid',
    LabelEnd: 'Label Gradient End',
    LabelStartActive: 'Active Label Gradient Start',
    LabelMidActive: 'Active Label Gradient Mid',
    LabelEndActive: 'Active Label Gradient End',
    AccentStart: 'Accent Gradient Start',
    AccentMid: 'Accent Gradient Mid',
    AccentEnd: 'Accent Gradient End',
    UnderlayStart: 'Underlay Gradient Start',
    UnderlayMid: 'Underlay Gradient Mid',
    UnderlayEnd: 'Underlay Gradient End',
    UnderlayTintStart: 'Underlay Tint Start',
    UnderlayTintMid: 'Underlay Tint Mid',
    UnderlayTintEnd: 'Underlay Tint End',
    AccentShadowColor: 'Accent Shadow',
    UnderlayShadowColor: 'Underlay Shadow',
    SurfaceShadowColor: 'Surface Shadow',
  },
  pl: {
    TextColor: 'Kolor tekstu',
    TextActiveColor: 'Kolor aktywnego tekstu',
    LabelStart: 'Poczatek gradientu etykiety',
    LabelMid: 'Srodek gradientu etykiety',
    LabelEnd: 'Koniec gradientu etykiety',
    LabelStartActive: 'Poczatek aktywnego gradientu etykiety',
    LabelMidActive: 'Srodek aktywnego gradientu etykiety',
    LabelEndActive: 'Koniec aktywnego gradientu etykiety',
    AccentStart: 'Poczatek gradientu akcentu',
    AccentMid: 'Srodek gradientu akcentu',
    AccentEnd: 'Koniec gradientu akcentu',
    UnderlayStart: 'Poczatek gradientu podkladu',
    UnderlayMid: 'Srodek gradientu podkladu',
    UnderlayEnd: 'Koniec gradientu podkladu',
    UnderlayTintStart: 'Poczatek zabarwienia podkladu',
    UnderlayTintMid: 'Srodek zabarwienia podkladu',
    UnderlayTintEnd: 'Koniec zabarwienia podkladu',
    AccentShadowColor: 'Cien akcentu',
    UnderlayShadowColor: 'Cien podkladu',
    SurfaceShadowColor: 'Cien powierzchni',
  },
};

const PAGE_COPY = {
  en: {
    breadcrumbs: ['Admin', 'Kangur', 'Settings', 'Appearance'],
    shellTitle: 'Kangur Appearance',
    shellDescription: 'Focused editing shell for lessons, tests, and content operations.',
    backToSettings: 'Back to Settings',
    saveTheme: 'Save theme',
    saving: 'Saving...',
    selectedTheme: 'Selected theme',
    selectedThemeAria: 'Selected theme',
    unsavedChanges: 'Unsaved changes',
    assignThemeToSlot: (themeName: string) => `Assign theme "${themeName}" to a slot`,
    presetReadOnly:
      'This Crystal preset is read-only, but you can still assign it to a slot above.',
    factoryReadOnly: 'This is a factory Kangur theme. It is read-only.',
    restoreDefaults: 'Restore defaults',
    statusTitle: 'Status',
    statusBadges: {
      readOnly: 'Read only',
      unsaved: 'Unsaved changes',
      saved: 'Saved',
    },
    statusItems: {
      theme: 'Theme',
      type: 'Type',
      assignedSlots: 'Assigned slots',
    },
    themeTypes: {
      factory: 'Factory',
      preset: 'Preset',
      builtin: 'Built-in',
      custom: 'Custom',
    },
    notAssigned: 'Not assigned',
  },
  pl: {
    breadcrumbs: ['Admin', 'Kangur', 'Ustawienia', 'Wygląd'],
    shellTitle: 'Wygląd Kangur',
    shellDescription: 'Skupiony panel edycji dla lekcji, testów i operacji na treści.',
    backToSettings: 'Wróć do ustawień',
    saveTheme: 'Zapisz motyw',
    saving: 'Zapisuje...',
    selectedTheme: 'Wybrany motyw',
    selectedThemeAria: 'Wybrany motyw',
    unsavedChanges: 'Niezapisane zmiany',
    assignThemeToSlot: (themeName: string) => `Przypisz motyw "${themeName}" do slotu`,
    presetReadOnly:
      'To preset Crystal. Jest tylko do odczytu, ale nadal możesz przypisać go do slotu powyżej.',
    factoryReadOnly: 'To fabryczny motyw Kangura. Jest tylko do odczytu.',
    restoreDefaults: 'Przywróć domyślne',
    statusTitle: 'Status',
    statusBadges: {
      readOnly: 'Tylko odczyt',
      unsaved: 'Niezapisane zmiany',
      saved: 'Zapisano',
    },
    statusItems: {
      theme: 'Motyw',
      type: 'Typ',
      assignedSlots: 'Przypisane sloty',
    },
    themeTypes: {
      factory: 'Fabryczny',
      preset: 'Preset',
      builtin: 'Wbudowany',
      custom: 'Wlasny',
    },
    notAssigned: 'Nieprzypisany',
  },
} as const;

const MODE_SELECTOR_COPY = {
  en: {
    title: 'Startup system',
    description:
      'Choose which visual system (light or dark) should load by default when the app starts.',
    selectAriaLabel: 'Select startup appearance mode',
  },
  pl: {
    title: 'System startowy',
    description:
      'Wybierz, który system wizualny (jasny lub ciemny) ma być ładowany domyślnie przy starcie aplikacji.',
    selectAriaLabel: 'Wybierz startowy tryb wyglądu',
  },
} as const;

const MODE_OPTION_LABELS: Record<AppearanceAdminLocale, Record<KangurStorefrontAppearanceMode, string>> = {
  en: {
    default: 'Daily theme',
    dawn: 'Dawn theme',
    sunset: 'Sunset theme',
    dark: 'Night theme',
  },
  pl: {
    default: 'Motyw dzienny',
    dawn: 'Motyw świtowy',
    sunset: 'Motyw zachodu',
    dark: 'Motyw nocny',
  },
};

const IMPORT_EXPORT_COPY = {
  en: {
    title: 'Import / Export',
    description: 'Move theme configuration between environments with the clipboard.',
    exportButton: 'Export to clipboard',
    importButton: 'Import from clipboard',
    exportError: 'Failed to copy the configuration.',
    exportSuccess: 'Theme configuration copied to the clipboard.',
    importError: 'Invalid clipboard data format.',
    importSuccess: 'Theme loaded from the clipboard. Remember to save your changes.',
  },
  pl: {
    title: 'Import / Eksport',
    description: 'Przenoś konfiguracje motywu między środowiskami za pomocą schowka.',
    exportButton: 'Eksportuj do schowka',
    importButton: 'Importuj ze schowka',
    exportError: 'Nie udało się skopiować konfiguracji.',
    exportSuccess: 'Konfiguracja motywu skopiowana do schowka.',
    importError: 'Nieprawidłowy format danych w schowku.',
    importSuccess: 'Motyw wczytany ze schowka. Pamiętaj o zapisaniu zmian.',
  },
} as const;

const THEME_CATALOG_COPY = {
  en: {
    openButton: (count: number) => `Theme catalog (${count})`,
    modalTitle: 'Saved theme catalog',
    saveCurrentAsNew: 'Save current theme as new',
    themeNamePlaceholder: 'Theme name...',
    themeNameAria: 'Theme name',
    save: 'Save',
    filterCatalog: 'Filter catalog',
    searchPlaceholder: 'Search themes by name...',
    searchAria: 'Filter themes in the catalog',
    sortLabel: 'Sorting',
    sortAria: 'Theme catalog sorting',
    countSummary: (visible: number, total: number) => `Showing ${visible} of ${total} themes`,
    defaultSortHint: 'Default: newest themes first',
    savedBadge: 'Saved',
    createdLabel: 'Created',
    updatedLabel: 'Updated',
    selected: 'Selected',
    load: 'Load',
    duplicating: 'Duplicating...',
    duplicate: 'Duplicate',
    deleteAria: 'Delete theme from catalog',
    emptyCatalog: 'No saved themes in the catalog.',
    emptyFilters: 'No themes match the current filters.',
    noDate: 'no date',
    createDefaultName: 'New theme',
    duplicateSuffix: 'copy',
    createError: 'Theme save failed.',
    createSuccess: 'New theme was added to the catalog.',
    duplicateError: 'Failed to duplicate the theme.',
    duplicateSuccess: 'Theme duplicated.',
    deleteError: 'Theme deletion failed.',
    deleteSuccess: 'Theme removed.',
    confirmDelete: 'Are you sure you want to remove this theme from the catalog?',
    sortOptions: [
      { value: 'created-desc', label: 'Newest' },
      { value: 'created-asc', label: 'Oldest' },
      { value: 'updated-desc', label: 'Recently updated' },
      { value: 'name-asc', label: 'Name A-Z' },
      { value: 'name-desc', label: 'Name Z-A' },
    ] as const satisfies ReadonlyArray<LabeledOptionDto<AppearanceCatalogSortOption>>,
    dateLocale: 'en-US',
    compareLocale: 'en',
  },
  pl: {
    openButton: (count: number) => `Katalog motywów (${count})`,
    modalTitle: 'Katalog zapisanych motywów',
    saveCurrentAsNew: 'Zapisz aktualny motyw jako nowy',
    themeNamePlaceholder: 'Nazwa motywu...',
    themeNameAria: 'Nazwa motywu',
    save: 'Zapisz',
    filterCatalog: 'Filtruj katalog',
    searchPlaceholder: 'Szukaj motywu po nazwie...',
    searchAria: 'Filtruj motywy w katalogu',
    sortLabel: 'Sortowanie',
    sortAria: 'Sortowanie katalogu motywów',
    countSummary: (visible: number, total: number) => `Pokazano ${visible} z ${total} motywów`,
    defaultSortHint: 'Domyślnie: najnowsze motywy na górze',
    savedBadge: 'Zapisany',
    createdLabel: 'Utworzono',
    updatedLabel: 'Zaktualizowano',
    selected: 'Wybrany',
    load: 'Wczytaj',
    duplicating: 'Duplikuję...',
    duplicate: 'Duplikuj',
    deleteAria: 'Usuń motyw z katalogu',
    emptyCatalog: 'Brak zapisanych motywów w katalogu.',
    emptyFilters: 'Brak motywów pasujących do bieżących filtrów.',
    noDate: 'brak daty',
    createDefaultName: 'Nowy motyw',
    duplicateSuffix: 'kopia',
    createError: 'Błąd zapisu motywu.',
    createSuccess: 'Nowy motyw został dodany do katalogu.',
    duplicateError: 'Nie udało się zduplikować motywu.',
    duplicateSuccess: 'Motyw został zduplikowany.',
    deleteError: 'Błąd usuwania motywu.',
    deleteSuccess: 'Motyw został usunięty.',
    confirmDelete: 'Czy na pewno chcesz usunąć ten motyw z katalogu?',
    sortOptions: [
      { value: 'created-desc', label: 'Najnowsze' },
      { value: 'created-asc', label: 'Najstarsze' },
      { value: 'updated-desc', label: 'Ostatnio zaktualizowane' },
      { value: 'name-asc', label: 'Nazwa A-Z' },
      { value: 'name-desc', label: 'Nazwa Z-A' },
    ] as const satisfies ReadonlyArray<LabeledOptionDto<AppearanceCatalogSortOption>>,
    dateLocale: 'pl-PL',
    compareLocale: 'pl',
  },
} as const;

const PREVIEW_COPY = {
  en: {
    targetLabels: {
      current: 'Preview',
      daily: 'Day',
      dawn: 'Dawn',
      sunset: 'Sunset',
      nightly: 'Night',
    },
    groupAriaLabel: 'Theme preview',
    sectionLabels: {
      page: 'Page and Navigation',
      buttons: 'Buttons',
      cards: 'Cards and Inputs',
      colors: 'Colors and Gradients',
      chat: 'Chat',
      components: 'Components',
    },
    navItems: ['Courses', 'Results', 'Profile'],
    homeActions: [
      { id: 'lessons', label: 'Lessons', emoji: '\ud83d\udcda' },
      { id: 'play', label: 'Play', emoji: '\ud83c\udfae' },
      { id: 'training', label: 'Training', emoji: '\ud83c\udfc6' },
      { id: 'kangur', label: 'Kangur', emoji: '\ud83e\udd98' },
    ],
    pageHeading: 'Alphabet - age 6',
    pageSubtext: 'Letters, syllables, and first words.',
    buttonLabels: {
      primary: 'Primary',
      hover: 'Hover',
      secondary: 'Secondary',
      surface: 'Surface',
      warning: 'Warning',
      success: 'Success',
    },
    lessonTitle: 'Lesson 3 - Fractions',
    lessonMeta: '12 exercises · 45 min',
    continueLabel: 'Continue',
    resultsLabel: 'Results',
    searchPlaceholder: 'Search exercise...',
    studentOneName: 'Anna Kowalska',
    studentOneMeta: 'Progress: 74% · #12 in class',
    studentTwoName: 'Jan Nowak',
    studentTwoMeta: '1,240 pts',
    profileLabel: 'Profile',
    dropdownItems: ['Common fractions', 'Decimal fractions', 'Percentages'],
    accentGradientsLabel: 'Accent Gradients',
    accentGradientNames: ['Indigo', 'Violet', 'Emerald', 'Sky', 'Amber', 'Rose', 'Teal', 'Slate'],
    logoPaletteLabel: 'Logo Palette',
    logoPaletteNames: ['Word Start', 'Word Mid', 'Word End', 'Ring Start', 'Ring End', 'Accent Start', 'Accent End'],
    badgesLabel: 'Badges',
    badges: ['New', '-20%', 'Done', 'Important', 'Info', 'VIP'],
    assistantName: 'AI Assistant',
    assistantStatus: 'online',
    assistantGreeting: 'Hi! How can I help you today?',
    assistantHint: 'Tip: ask about fractions',
    userPrompt: 'Explain decimal fractions to me',
    successMessage: 'Reply generated successfully',
    chatChips: ['More', 'Quiz'],
    composerPlaceholder: 'Write a message...',
    elevatedLabel: 'Elevated',
    subtleLabel: 'Subtle',
    segmentedLabels: ['Day', 'Week', 'Month'],
    disabledFieldLabel: 'Disabled field',
    controlLabel: 'Control',
    previewInputAria: 'preview input',
  },
  pl: {
    targetLabels: {
      current: 'Podgląd',
      daily: 'Dzień',
      dawn: 'Świt',
      sunset: 'Zmierzch',
      nightly: 'Noc',
    },
    groupAriaLabel: 'Podgląd motywu',
    sectionLabels: {
      page: 'Strona i nawigacja',
      buttons: 'Przyciski',
      cards: 'Karty i pola',
      colors: 'Kolory i gradienty',
      chat: 'Czat',
      components: 'Komponenty',
    },
    navItems: ['Kursy', 'Wyniki', 'Profil'],
    homeActions: [
      { id: 'lessons', label: 'Lekcje', emoji: '\ud83d\udcda' },
      { id: 'play', label: 'Graj', emoji: '\ud83c\udfae' },
      { id: 'training', label: 'Trening', emoji: '\ud83c\udfc6' },
      { id: 'kangur', label: 'Kangur', emoji: '\ud83e\udd98' },
    ],
    pageHeading: 'Alfabet - 6 lat',
    pageSubtext: 'Litery, sylaby i pierwsze słowa.',
    buttonLabels: {
      primary: 'Główny',
      hover: 'Hover',
      secondary: 'Drugorzędny',
      surface: 'Powierzchnia',
      warning: 'Ostrzeżenie',
      success: 'Sukces',
    },
    lessonTitle: 'Lekcja 3 - Ułamki',
    lessonMeta: '12 ćwiczeń · 45 min',
    continueLabel: 'Kontynuuj',
    resultsLabel: 'Wyniki',
    searchPlaceholder: 'Wyszukaj ćwiczenie...',
    studentOneName: 'Anna Kowalska',
    studentOneMeta: 'Postęp: 74% · #12 w klasie',
    studentTwoName: 'Jan Nowak',
    studentTwoMeta: '1 240 pkt',
    profileLabel: 'Profil',
    dropdownItems: ['Ułamki zwykłe', 'Ułamki dziesiętne', 'Procenty'],
    accentGradientsLabel: 'Gradienty akcentów',
    accentGradientNames: ['Indygo', 'Fiolet', 'Szmaragd', 'Błękit', 'Bursztyn', 'Róż', 'Turkus', 'Łupkowy'],
    logoPaletteLabel: 'Paleta logo',
    logoPaletteNames: ['Napis start', 'Napis środek', 'Napis koniec', 'Obwódka start', 'Obwódka koniec', 'Akcent start', 'Akcent koniec'],
    badgesLabel: 'Znaczniki',
    badges: ['Nowe', '-20%', 'Gotowe', 'Ważne', 'Info', 'VIP'],
    assistantName: 'Asystent AI',
    assistantStatus: 'online',
    assistantGreeting: 'Cześć! W czym mogę Ci dzisiaj pomóc?',
    assistantHint: 'Podpowiedź: zapytaj o ułamki',
    userPrompt: 'Wyjaśnij mi ułamki dziesiętne',
    successMessage: 'Odpowiedź wygenerowana pomyślnie',
    chatChips: ['Więcej', 'Quiz'],
    composerPlaceholder: 'Napisz wiadomość...',
    elevatedLabel: 'Wyniesiony',
    subtleLabel: 'Subtelny',
    segmentedLabels: ['Dzień', 'Tydzień', 'Miesiąc'],
    disabledFieldLabel: 'Pole wyłączone',
    controlLabel: 'Kontrolka',
    previewInputAria: 'pole podglądu',
  },
} as const;

const CONTEXT_COPY = {
  en: {
    defaultModeSaveError: 'Failed to save the default startup theme.',
    defaultModeSaveSuccess: 'Default startup theme updated.',
    unsavedSwitchConfirm:
      'You have unsaved changes in the current theme. Do you want to switch anyway?',
    assignError: 'Failed to assign the theme.',
    assignSuccess: (slotLabel: string) => `Theme assigned to slot "${slotLabel}".`,
    unassignError: 'Failed to unassign the theme.',
    unassignSuccess: (slotLabel: string) => `Slot "${slotLabel}" restored to factory settings.`,
    saveFactoryError: 'Cannot save changes to a factory theme.',
    saveError: 'Theme save failed.',
    saveSuccess: 'Theme saved.',
  },
  pl: {
    defaultModeSaveError: 'Nie udało się zapisać domyślnego motywu startowego.',
    defaultModeSaveSuccess: 'Domyślny motyw startowy zaktualizowany.',
    unsavedSwitchConfirm:
      'Masz niezapisane zmiany w aktualnym motywie. Czy na pewno chcesz przełączyć?',
    assignError: 'Nie udało się przypisać motywu.',
    assignSuccess: (slotLabel: string) => `Motyw przypisany do slotu "${slotLabel}".`,
    unassignError: 'Nie udało się odpiąć motywu.',
    unassignSuccess: (slotLabel: string) => `Slot "${slotLabel}" przywrócony do fabrycznego.`,
    saveFactoryError: 'Nie można zapisać zmian w motywie fabrycznym.',
    saveError: 'Błąd zapisu motywu.',
    saveSuccess: 'Motyw został zapisany.',
  },
} as const;

export const resolveAppearanceAdminLocale = (
  locale: string | null | undefined
): AppearanceAdminLocale => (normalizeSiteLocale(locale) === 'pl' ? 'pl' : 'en');

export const getAppearancePageCopy = (locale: AppearanceAdminLocale) => PAGE_COPY[locale];

export const getAppearanceModeSelectorCopy = (locale: AppearanceAdminLocale) =>
  MODE_SELECTOR_COPY[locale];

export const getAppearanceImportExportCopy = (locale: AppearanceAdminLocale) =>
  IMPORT_EXPORT_COPY[locale];

export const getAppearanceThemeCatalogCopy = (locale: AppearanceAdminLocale) =>
  THEME_CATALOG_COPY[locale];

export const getAppearancePreviewCopy = (locale: AppearanceAdminLocale) =>
  PREVIEW_COPY[locale];

export const getAppearanceContextCopy = (locale: AppearanceAdminLocale) =>
  CONTEXT_COPY[locale];

export const getAppearanceSlotLabel = (
  locale: AppearanceAdminLocale,
  slot: AppearanceSlot
): string => {
  const labels: Record<AppearanceAdminLocale, Record<AppearanceSlot, string>> = {
    en: {
      daily: 'Day',
      dawn: 'Dawn',
      sunset: 'Sunset',
      nightly: 'Night',
    },
    pl: {
      daily: 'Dzien',
      dawn: 'Swit',
      sunset: 'Zmierzch',
      nightly: 'Noc',
    },
  };

  return labels[locale][slot];
};

export const getAppearanceThemeTypeLabel = (
  locale: AppearanceAdminLocale,
  type: 'factory' | 'preset' | 'builtin' | 'custom'
): string => PAGE_COPY[locale].themeTypes[type];

export const getAppearanceThemeSelectionLabel = (
  locale: AppearanceAdminLocale,
  id: ThemeSelectionId,
  catalog: ReadonlyArray<{ id: string; name: string }>
): string => {
  if (id === PRESET_DAILY_CRYSTAL_ID) return PRESET_LABELS.dailyCrystal;
  if (id === PRESET_NIGHTLY_CRYSTAL_ID) return PRESET_LABELS.nightlyCrystal;

  const labels: Record<
    AppearanceAdminLocale,
    Record<string, string>
  > = {
    en: {
      [BUILTIN_DAILY_ID]: 'Day theme (built-in)',
      [BUILTIN_DAWN_ID]: 'Dawn theme (built-in)',
      [BUILTIN_SUNSET_ID]: 'Sunset theme (built-in)',
      [BUILTIN_NIGHTLY_ID]: 'Night theme (built-in)',
      [FACTORY_DAILY_ID]: 'Day theme (factory)',
      [FACTORY_DAWN_ID]: 'Dawn theme (factory)',
      [FACTORY_SUNSET_ID]: 'Sunset theme (factory)',
      [FACTORY_NIGHTLY_ID]: 'Night theme (factory)',
    },
    pl: {
      [BUILTIN_DAILY_ID]: 'Motyw dzienny (wbudowany)',
      [BUILTIN_DAWN_ID]: 'Motyw switowy (wbudowany)',
      [BUILTIN_SUNSET_ID]: 'Motyw zachodu (wbudowany)',
      [BUILTIN_NIGHTLY_ID]: 'Motyw nocny (wbudowany)',
      [FACTORY_DAILY_ID]: 'Motyw dzienny (fabryczny)',
      [FACTORY_DAWN_ID]: 'Motyw switowy (fabryczny)',
      [FACTORY_SUNSET_ID]: 'Motyw zachodu (fabryczny)',
      [FACTORY_NIGHTLY_ID]: 'Motyw nocny (fabryczny)',
    },
  };

  if (labels[locale][id]) {
    return labels[locale][id];
  }

  return catalog.find((entry) => entry.id === id)?.name ?? String(id);
};

export const buildAppearanceThemeSelectorOptions = (
  locale: AppearanceAdminLocale,
  catalog: ReadonlyArray<{ id: string; name: string }>
): Array<LabeledOptionDto<string>> => {
  const builtins: ThemeSelectionId[] = [
    FACTORY_DAILY_ID,
    FACTORY_DAWN_ID,
    FACTORY_SUNSET_ID,
    FACTORY_NIGHTLY_ID,
    BUILTIN_DAILY_ID,
    BUILTIN_DAWN_ID,
    BUILTIN_SUNSET_ID,
    BUILTIN_NIGHTLY_ID,
    PRESET_DAILY_CRYSTAL_ID,
    PRESET_NIGHTLY_CRYSTAL_ID,
  ];

  return [
    ...builtins.map((id) => ({
      value: id,
      label: getAppearanceThemeSelectionLabel(locale, id, catalog),
    })),
    ...catalog.map((entry) => ({ value: entry.id, label: entry.name })),
  ];
};

export const buildAppearanceModeOptions = (
  locale: AppearanceAdminLocale
): ReadonlyArray<LabeledOptionDto<KangurStorefrontAppearanceMode>> => [
  { value: 'default', label: MODE_OPTION_LABELS[locale].default },
  { value: 'dawn', label: MODE_OPTION_LABELS[locale].dawn },
  { value: 'sunset', label: MODE_OPTION_LABELS[locale].sunset },
  { value: 'dark', label: MODE_OPTION_LABELS[locale].dark },
];

const HOME_ACTION_GROUPS = [
  { prefix: 'homeActionLessons', key: 'lessons' },
  { prefix: 'homeActionPlay', key: 'play' },
  { prefix: 'homeActionTraining', key: 'training' },
  { prefix: 'homeActionKangur', key: 'kangur' },
] as const;

const HOME_ACTION_TOKENS = [
  'TextColor',
  'TextActiveColor',
  'LabelStart',
  'LabelMid',
  'LabelEnd',
  'LabelStartActive',
  'LabelMidActive',
  'LabelEndActive',
  'AccentStart',
  'AccentMid',
  'AccentEnd',
  'UnderlayStart',
  'UnderlayMid',
  'UnderlayEnd',
  'UnderlayTintStart',
  'UnderlayTintMid',
  'UnderlayTintEnd',
  'AccentShadowColor',
  'UnderlayShadowColor',
  'SurfaceShadowColor',
] as const;

export const buildAppearanceHomeActionFields = (
  locale: AppearanceAdminLocale
): SettingsPanelField<ThemeSettings>[] =>
  HOME_ACTION_GROUPS.flatMap((group) =>
    HOME_ACTION_TOKENS.map((suffix) => ({
      key: `${group.prefix}${suffix}` as keyof ThemeSettings,
      label: `${HOME_ACTION_GROUP_LABELS[locale][group.key]} ${HOME_ACTION_TOKEN_LABELS[locale][suffix]}`,
      type: 'color' as const,
    }))
  );

const localizeOption = <T extends string | number>(
  locale: AppearanceAdminLocale,
  option: LabeledOptionDto<T>
): LabeledOptionDto<T> => ({
  ...option,
  label: OPTION_LABELS[locale][String(option.value)] ?? option.label,
});

export const localizeAppearanceField = <T extends object>(
  locale: AppearanceAdminLocale,
  field: SettingsPanelField<T>
): SettingsPanelField<T> => {
  const fieldId = String(field.key);

  return {
    ...field,
    label: FIELD_LABELS[locale][fieldId] ?? field.label,
    helperText:
      typeof field.helperText === 'string'
        ? (FIELD_HELPERS[locale][fieldId] ?? field.helperText)
        : field.helperText,
    placeholder:
      typeof field.placeholder === 'string'
        ? (FIELD_PLACEHOLDERS[locale][fieldId] ?? field.placeholder)
        : field.placeholder,
    options: field.options?.map((option) => localizeOption(locale, option)),
  };
};

export const buildAppearanceThemeSections = (
  locale: AppearanceAdminLocale
): Array<{
  id: AppearanceThemeSectionId;
  title: string;
  subtitle: string;
  fields: SettingsPanelField<ThemeSettings>[];
}> =>
  THEME_SECTIONS.map((section) => {
    const sectionId = section.id;
    const localized = SECTION_COPY[locale][sectionId] ?? {
      title: section.title,
      subtitle: section.subtitle,
    };

    const fields =
      sectionId === 'homeActionButtons'
        ? buildAppearanceHomeActionFields(locale)
        : section.fields.map((field) => localizeAppearanceField(locale, field));

    return {
      id: sectionId,
      title: localized.title,
      subtitle: localized.subtitle,
      fields,
    };
  });

export const formatAppearanceCatalogTimestamp = (
  locale: AppearanceAdminLocale,
  value: string | null | undefined
): string => {
  const copy = THEME_CATALOG_COPY[locale];
  if (!value) return copy.noDate;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return copy.noDate;
  }
  return new Intl.DateTimeFormat(copy.dateLocale, { dateStyle: 'medium' }).format(
    new Date(timestamp)
  );
};

export const compareAppearanceCatalogNames = (
  locale: AppearanceAdminLocale,
  left: string,
  right: string
): number =>
  left.localeCompare(right, THEME_CATALOG_COPY[locale].compareLocale, {
    sensitivity: 'base',
    numeric: true,
  });

export const getAppearanceSlotOrder = (): AppearanceSlot[] => [...SLOT_ORDER];
