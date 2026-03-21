import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import type { SettingsPanelField } from '@/features/kangur/shared/ui/templates/SettingsPanelBuilder';

export type KangurThemeMode = 'daily' | 'dawn' | 'sunset' | 'nightly';
export type KangurThemeSettingsLocale = 'en' | 'pl';
export type KangurThemePreviewSectionId =
  | 'corePalette'
  | 'textOverrides'
  | 'logoLoader'
  | 'backgroundsSurfaces'
  | 'buttons'
  | 'navigationPills'
  | 'gradients'
  | 'homeActions'
  | 'progressBars'
  | 'inputs'
  | 'typographyLayout'
  | 'shapeSpacing'
  | 'shadowsDepth';
export type KangurThemeSectionId =
  | KangurThemePreviewSectionId
  | 'buttonShadows'
  | 'gelEffects';

export const KANGUR_THEME_PREVIEW_SECTION_IDS: readonly KangurThemePreviewSectionId[] = [
  'corePalette',
  'textOverrides',
  'logoLoader',
  'backgroundsSurfaces',
  'buttons',
  'navigationPills',
  'gradients',
  'homeActions',
  'progressBars',
  'inputs',
  'typographyLayout',
  'shapeSpacing',
  'shadowsDepth',
] as const;

const SECTION_COPY: Record<
  KangurThemeSettingsLocale,
  Record<KangurThemeSectionId, { title: string; subtitle: string }>
> = {
  en: {
    corePalette: {
      title: 'Core Palette',
      subtitle: 'Shared tones for highlights, text, and feedback states across Kangur.',
    },
    textOverrides: {
      title: 'Text Overrides',
      subtitle: 'Optional overrides for page, cards, and navigation text colors.',
    },
    logoLoader: {
      title: 'Logo & Loader',
      subtitle: 'Tune the Kangur logo gradients used on the boot loader and navigation.',
    },
    backgroundsSurfaces: {
      title: 'Backgrounds and Surfaces',
      subtitle: 'Base page, panel, card, and chat shell colors.',
    },
    buttons: {
      title: 'Buttons',
      subtitle: 'Primary and secondary CTA colors used by the live storefront.',
    },
    buttonShadows: {
      title: 'Button Shadows',
      subtitle: 'Drop shadows for the primary and secondary button shell.',
    },
    gelEffects: {
      title: 'Gel Effects',
      subtitle: 'Gloss overlay, inner shadows, text shadow, and outer glow for gel-style buttons.',
    },
    navigationPills: {
      title: 'Navigation Pills',
      subtitle: 'Sidebar and tab pill styling for default and active states.',
    },
    gradients: {
      title: 'Gradients',
      subtitle: 'Accent gradients used by lesson tiles, badges, and decorative highlights.',
    },
    homeActions: {
      title: 'Home Actions',
      subtitle:
        'Theme the four main home buttons (icons stay untouched). Leave a field empty to keep the default tone.',
    },
    progressBars: {
      title: 'Progress Bars',
      subtitle: 'Track colors for progress indicators across Kangur.',
    },
    inputs: {
      title: 'Inputs',
      subtitle: 'Search, answer, and tutor prompt field colors.',
    },
    typographyLayout: {
      title: 'Typography and Layout',
      subtitle: 'Fonts, base text rhythm, and page width used by the live Kangur shell.',
    },
    shapeSpacing: {
      title: 'Shape and Spacing',
      subtitle: 'Shared radius controls for panels, navigation, buttons, and inputs.',
    },
    shadowsDepth: {
      title: 'Shadows and Depth',
      subtitle: 'Fine-tune glass panel and card shadow softness.',
    },
  },
  pl: {
    corePalette: {
      title: 'Paleta główna',
      subtitle: 'Wspólne tony dla wyróżnień, tekstu i stanów informacji zwrotnej w Kangur.',
    },
    textOverrides: {
      title: 'Nadpisania tekstu',
      subtitle: 'Opcjonalne nadpisania kolorów tekstu strony, kart i nawigacji.',
    },
    logoLoader: {
      title: 'Logo i loader',
      subtitle: 'Dostrój gradienty logo Kangur używane w loaderze i nawigacji.',
    },
    backgroundsSurfaces: {
      title: 'Tła i powierzchnie',
      subtitle: 'Bazowe kolory strony, paneli, kart i powłoki czatu.',
    },
    buttons: {
      title: 'Przyciski',
      subtitle: 'Kolory głównych i drugorzędnych CTA używanych w publicznym storefrontcie.',
    },
    buttonShadows: {
      title: 'Cienie przycisków',
      subtitle: 'Cienie zewnętrzne dla obudowy głównych i drugorzędnych przycisków.',
    },
    gelEffects: {
      title: 'Efekty żelowe',
      subtitle: 'Połysk, cienie wewnętrzne, cień tekstu i zewnętrzna poświata dla żelowych przycisków.',
    },
    navigationPills: {
      title: 'Pills nawigacji',
      subtitle: 'Styl pills dla sidebaru i zakładek w stanie domyślnym i aktywnym.',
    },
    gradients: {
      title: 'Gradienty',
      subtitle: 'Gradienty akcentów używane na kafelkach lekcji, badgeach i dekoracyjnych wyróżnieniach.',
    },
    homeActions: {
      title: 'Akcje strony głównej',
      subtitle:
        'Motywuj cztery główne przyciski strony głównej (ikony pozostają bez zmian). Puste pole zachowuje domyślny ton.',
    },
    progressBars: {
      title: 'Paski postępu',
      subtitle: 'Kolory toru dla wskaźników postępu w Kangur.',
    },
    inputs: {
      title: 'Pola',
      subtitle: 'Kolory pola wyszukiwania, odpowiedzi i promptu tutora.',
    },
    typographyLayout: {
      title: 'Typografia i układ',
      subtitle: 'Fonty, rytm bazowego tekstu i szerokość strony używane przez powłokę Kangur.',
    },
    shapeSpacing: {
      title: 'Kształt i odstępy',
      subtitle: 'Wspólne promienie dla paneli, nawigacji, przycisków i pól.',
    },
    shadowsDepth: {
      title: 'Cienie i głębia',
      subtitle: 'Dostrój miękkość cieni szklanego panelu i kart.',
    },
  },
};

const MODE_COPY: Record<
  KangurThemeSettingsLocale,
  Record<
    KangurThemeMode,
    {
      label: string;
      resetLabel: string;
      resetDescription: string;
      toastMessage: string;
    }
  >
> = {
  en: {
    daily: {
      label: 'Daily theme',
      resetLabel: 'Restore daily theme',
      resetDescription: 'Overwrite this theme with the default daily preset.',
      toastMessage: 'Daily theme restored to default settings.',
    },
    dawn: {
      label: 'Dawn theme',
      resetLabel: 'Restore dawn theme',
      resetDescription: 'Overwrite this theme with the default dawn preset.',
      toastMessage: 'Dawn theme restored to default settings.',
    },
    sunset: {
      label: 'Sunset theme',
      resetLabel: 'Restore sunset theme',
      resetDescription: 'Overwrite this theme with the default sunset preset.',
      toastMessage: 'Sunset theme restored to default settings.',
    },
    nightly: {
      label: 'Night theme',
      resetLabel: 'Restore night theme',
      resetDescription: 'Overwrite this theme with the default night preset.',
      toastMessage: 'Night theme restored to default settings.',
    },
  },
  pl: {
    daily: {
      label: 'Motyw dzienny',
      resetLabel: 'Przywróć motyw dzienny',
      resetDescription: 'Nadpisuje ten motyw domyślnym presetem dziennym.',
      toastMessage: 'Motyw dzienny przywrócony do domyślnych ustawień.',
    },
    dawn: {
      label: 'Motyw świtowy',
      resetLabel: 'Przywróć motyw świtowy',
      resetDescription: 'Nadpisuje ten motyw domyślnym presetem świtu.',
      toastMessage: 'Motyw świtowy przywrócony do domyślnych ustawień.',
    },
    sunset: {
      label: 'Motyw zachodu',
      resetLabel: 'Przywróć motyw zachodu',
      resetDescription: 'Nadpisuje ten motyw domyślnym presetem zachodu.',
      toastMessage: 'Motyw zachodu przywrócony do domyślnych ustawień.',
    },
    nightly: {
      label: 'Motyw nocny',
      resetLabel: 'Przywróć motyw nocny',
      resetDescription: 'Nadpisuje ten motyw domyślnym presetem nocnym.',
      toastMessage: 'Motyw nocny przywrócony do domyślnych ustawień.',
    },
  },
};

const FONT_WEIGHT_OPTIONS_BY_LOCALE: Record<
  KangurThemeSettingsLocale,
  ReadonlyArray<LabeledOptionDto<string>>
> = {
  en: [
    { value: '300', label: 'Light (300)' },
    { value: '400', label: 'Regular (400)' },
    { value: '500', label: 'Medium (500)' },
    { value: '600', label: 'Semibold (600)' },
    { value: '700', label: 'Bold (700)' },
    { value: '800', label: 'Extrabold (800)' },
  ],
  pl: [
    { value: '300', label: 'Lekki (300)' },
    { value: '400', label: 'Regularny (400)' },
    { value: '500', label: 'Średni (500)' },
    { value: '600', label: 'Półgruby (600)' },
    { value: '700', label: 'Gruby (700)' },
    { value: '800', label: 'Bardzo gruby (800)' },
  ],
};

const HOME_ACTION_GROUP_LABELS: Record<
  KangurThemeSettingsLocale,
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

const HOME_ACTION_TOKEN_LABELS: Record<KangurThemeSettingsLocale, Record<string, string>> = {
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

const PANEL_COPY: Record<
  KangurThemeSettingsLocale,
  {
    autosaveTitle: string;
    autosaveDescription: string;
    restoreDefaultButton: string;
    restoring: string;
    resetError: string;
    auto: string;
    progressTrackColorPickerAria: string;
    progressTrackColorValueAria: string;
  }
> = {
  en: {
    autosaveTitle: 'Autosave',
    autosaveDescription:
      'Changes in this editor save to Mongo automatically and feed the live Kangur storefront theme. This panel only shows tokens that the public Kangur runtime maps today, so every field here has a live storefront effect.',
    restoreDefaultButton: 'Restore defaults',
    restoring: 'Restoring...',
    resetError: 'Failed to restore the theme.',
    auto: 'Auto',
    progressTrackColorPickerAria: 'Progress track color picker',
    progressTrackColorValueAria: 'Progress track color value',
  },
  pl: {
    autosaveTitle: 'Automatyczny zapis',
    autosaveDescription:
      'Zmiany w tym edytorze zapisują się automatycznie do Mongo i zasilają motyw live Kangur. Ten panel pokazuje tylko tokeny, które dzisiejszy runtime publiczny Kangur mapuje, więc każde pole ma realny efekt w storefrontcie.',
    restoreDefaultButton: 'Przywróć domyślne',
    restoring: 'Przywracam...',
    resetError: 'Nie udało się przywrócić motywu.',
    auto: 'Auto',
    progressTrackColorPickerAria: 'Wybierak koloru toru postępu',
    progressTrackColorValueAria: 'Wartość koloru toru postępu',
  },
};

const PL_FIELD_LABELS: Record<string, string> = {
  'Primary Accent': 'Glowny akcent',
  'Secondary Accent': 'Drugorzedny akcent',
  'Warning Accent': 'Akcent ostrzezenia',
  'Success Accent': 'Akcent sukcesu',
  'Primary Text': 'Glowny tekst',
  'Muted Text': 'Wyciszony tekst',
  'Page Text Override': 'Nadpisanie tekstu strony',
  'Page Muted Text Override': 'Nadpisanie wyciszonego tekstu strony',
  'Card Text Override': 'Nadpisanie tekstu karty',
  'Navigation Text Override': 'Nadpisanie tekstu nawigacji',
  'Navigation Active Text Override': 'Nadpisanie aktywnego tekstu nawigacji',
  'Navigation Hover Text Override': 'Nadpisanie tekstu hover nawigacji',
  'Wordmark Start': 'Poczatek napisu logo',
  'Wordmark Mid': 'Srodek napisu logo',
  'Wordmark End': 'Koniec napisu logo',
  'Ring Start': 'Poczatek obwodki',
  'Ring End': 'Koniec obwodki',
  'Accent Start': 'Poczatek akcentu',
  'Accent End': 'Koniec akcentu',
  'Inner Glow Start': 'Poczatek wewnetrznej poswiaty',
  'Inner Glow End': 'Koniec wewnetrznej poswiaty',
  'Logo Shadow': 'Cien logo',
  'Logo Glint': 'Blik logo',
  'Page Background': 'Tło strony',
  'Surface Background': 'Tło powierzchni',
  'Card Background': 'Tło karty',
  'Container Background': 'Tło kontenera',
  'Panel Gradient Start': 'Początek gradientu panelu',
  'Panel Gradient End': 'Koniec gradientu panelu',
  'Panel Transparency': 'Przezroczystość panelu',
  'Base Border': 'Bazowa ramka',
  'Surface Border': 'Ramka powierzchni',
  'Primary Button Background': 'Tło głównego przycisku',
  'Primary Button Text': 'Tekst głównego przycisku',
  'Secondary Button Background': 'Tło drugorzędnego przycisku',
  'Secondary Button Text': 'Tekst drugorzędnego przycisku',
  'Outline Border': 'Ramka outline',
  'Button Padding X': 'Padding X przycisku',
  'Button Padding Y': 'Padding Y przycisku',
  'Button Font Size': 'Rozmiar fontu przycisku',
  'Button Font Weight': 'Grubość fontu przycisku',
  'Button Border Width': 'Szerokosc ramki przycisku',
  'Button Border Opacity': 'Przezroczystosc ramki przycisku',
  'Shadow Opacity': 'Przezroczystosc cienia',
  'Shadow X': 'Cien X',
  'Shadow Y': 'Cien Y',
  'Shadow Blur': 'Rozmycie cienia',
  'Gloss Opacity': 'Przezroczystosc polysku',
  'Gloss Height': 'Wysokosc polysku',
  'Gloss Angle': 'Kat polysku',
  'Top Highlight': 'Gorne podswietlenie',
  'Inner Shadow Opacity': 'Przezroczystosc cienia wewnetrznego',
  'Inner Shadow Blur': 'Rozmycie cienia wewnetrznego',
  'Inner Shadow Y': 'Cien wewnetrzny Y',
  'Text Shadow Opacity': 'Przezroczystosc cienia tekstu',
  'Text Shadow Y': 'Cien tekstu Y',
  'Text Shadow Blur': 'Rozmycie cienia tekstu',
  'Outer Glow Opacity': 'Przezroczystosc zewnetrznej poswiaty',
  'Outer Glow Spread': 'Rozchodzenie zewnetrznej poswiaty',
  'Navbar Gradient Start': 'Poczatek gradientu nawigacji',
  'Navbar Gradient End': 'Koniec gradientu nawigacji',
  'Navbar Transparency': 'Przezroczystosc nawigacji',
  'Pill Background': 'Tlo pill',
  'Pill Text': 'Tekst pill',
  'Active Pill Background': 'Tlo aktywnej pill',
  'Active Pill Text': 'Tekst aktywnej pill',
  'Pill Padding X': 'Padding X pill',
  'Pill Padding Y': 'Padding Y pill',
  'Pill Font Size': 'Rozmiar fontu pill',
  'Indigo Gradient Start': 'Poczatek gradientu indigo',
  'Indigo Gradient End': 'Koniec gradientu indigo',
  'Violet Gradient Start': 'Poczatek gradientu fioletowego',
  'Violet Gradient End': 'Koniec gradientu fioletowego',
  'Emerald Gradient Start': 'Poczatek gradientu szmaragdowego',
  'Emerald Gradient End': 'Koniec gradientu szmaragdowego',
  'Sky Gradient Start': 'Poczatek gradientu blekitnego',
  'Sky Gradient End': 'Koniec gradientu blekitnego',
  'Amber Gradient Start': 'Poczatek gradientu bursztynowego',
  'Amber Gradient End': 'Koniec gradientu bursztynowego',
  'Rose Gradient Start': 'Poczatek gradientu rozowego',
  'Rose Gradient End': 'Koniec gradientu rozowego',
  'Teal Gradient Start': 'Poczatek gradientu turkusowego',
  'Teal Gradient End': 'Koniec gradientu turkusowego',
  'Slate Gradient Start': 'Poczatek gradientu lupkowego',
  'Slate Gradient End': 'Koniec gradientu lupkowego',
  'Progress Track': 'Tor postepu',
  'Input Background': 'Tlo pola',
  'Input Text': 'Tekst pola',
  'Input Border': 'Ramka pola',
  'Input Placeholder': 'Placeholder pola',
  'Input Height': 'Wysokosc pola',
  'Input Font Size': 'Rozmiar fontu pola',
  'Heading Font': 'Font naglowkow',
  'Body Font': 'Font tekstu',
  'Base Font Size': 'Bazowy rozmiar fontu',
  'Body Line Height': 'Wysokosc linii tekstu',
  'Heading Line Height': 'Wysokosc linii naglowka',
  'Page Width': 'Szerokosc strony',
  'Shared Gap Scale': 'Wspolna skala odstepow',
  'Page Padding Top': 'Padding strony od gory',
  'Page Padding Right': 'Padding strony po prawej',
  'Page Padding Bottom': 'Padding strony od dolu',
  'Page Padding Left': 'Padding strony po lewej',
  'Panel Radius': 'Promien panelu',
  'Card Radius': 'Promien karty',
  'Panel Inner Padding': 'Wewnetrzny padding panelu',
  'Navigation Pill Radius': 'Promien pill nawigacji',
  'Button Radius': 'Promien przycisku',
  'Button Border Radius': 'Promien ramki przycisku',
  'Input Radius': 'Promien pola',
  'Panel Shadow Opacity': 'Przezroczystosc cienia panelu',
  'Panel Shadow Blur': 'Rozmycie cienia panelu',
  'Panel Shadow Y': 'Cien panelu Y',
  'Panel Shadow X': 'Cien panelu X',
  'Card Shadow Opacity': 'Przezroczystosc cienia karty',
  'Card Shadow Blur': 'Rozmycie cienia karty',
  'Card Shadow Y': 'Cien karty Y',
  'Card Shadow X': 'Cien karty X',
};

const PL_FIELD_HELPER_TEXTS: Record<string, string> = {
  'Leave empty to use the Primary Text color.':
    'Zostaw puste, aby uzyc koloru glownego tekstu.',
  'Leave empty to use the Muted Text color.':
    'Zostaw puste, aby uzyc koloru wyciszonego tekstu.',
  'Controls text color inside soft cards.':
    'Steruje kolorem tekstu wewnatrz miekkich kart.',
  'Overrides the top navigation text color.':
    'Nadpisuje kolor tekstu gornej nawigacji.',
  'Overrides the active navigation text color.':
    'Nadpisuje kolor aktywnego tekstu nawigacji.',
  'Overrides the hover navigation text color.':
    'Nadpisuje kolor tekstu hover w nawigacji.',
  'Leave empty to derive from the active palette.':
    'Zostaw puste, aby wyprowadzic kolor z aktywnej palety.',
  'CSS color or gradient (e.g. #ff8a3d or linear-gradient(...)).':
    'Kolor CSS lub gradient (np. #ff8a3d albo linear-gradient(...)).',
  'CSS color or gradient (e.g. #ffffff or linear-gradient(...)).':
    'Kolor CSS lub gradient (np. #ffffff albo linear-gradient(...)).',
  'White-to-transparent gloss overlay covering the top portion of the button.':
    'Bialy do przezroczystego polysk pokrywajacy gorna czesc przycisku.',
  'Bright inset line along the top edge of the button.':
    'Jasna linia wewnetrzna przy gornej krawedzi przycisku.',
  'Dark inset shadow at the bottom edge for depth.':
    'Ciemny cien wewnetrzny przy dolnej krawedzi, dodajacy glebi.',
  'Raised or embossed text effect.':
    'Efekt wypuklego lub tloczonego tekstu.',
  'Colored halo around the button. Distinct from drop shadow.':
    'Kolorowa poswiata wokol przycisku, oddzielna od cienia zewnetrznego.',
  'Leave empty to let Kangur pick a track color based on the current mode.':
    'Zostaw puste, aby Kangur sam dobral kolor toru dla biezacego trybu.',
};

const PL_FIELD_PLACEHOLDERS: Record<string, string> = {
  Auto: 'Auto',
};

export const resolveKangurThemeSettingsLocale = (
  locale: string | null | undefined
): KangurThemeSettingsLocale => (normalizeSiteLocale(locale) === 'pl' ? 'pl' : 'en');

export const getKangurThemeModeCopy = (
  locale: KangurThemeSettingsLocale,
  mode: KangurThemeMode
) => MODE_COPY[locale][mode];

export const getKangurThemePanelCopy = (locale: KangurThemeSettingsLocale) =>
  PANEL_COPY[locale];

export const getKangurThemeSectionCopy = (
  locale: KangurThemeSettingsLocale,
  sectionId: KangurThemeSectionId
) => SECTION_COPY[locale][sectionId];

export const localizeKangurThemeField = <T extends object>(
  locale: KangurThemeSettingsLocale,
  field: SettingsPanelField<T>
): SettingsPanelField<T> => {
  if (locale !== 'pl') {
    return field;
  }

  return {
    ...field,
    label: PL_FIELD_LABELS[field.label] ?? field.label,
    helperText:
      typeof field.helperText === 'string'
        ? (PL_FIELD_HELPER_TEXTS[field.helperText] ?? field.helperText)
        : field.helperText,
    placeholder:
      typeof field.placeholder === 'string'
        ? (PL_FIELD_PLACEHOLDERS[field.placeholder] ?? field.placeholder)
        : field.placeholder,
  };
};

export const mapKangurThemeSectionToPreviewSection = (
  sectionId: KangurThemeSectionId
): KangurThemePreviewSectionId => {
  if (sectionId === 'buttonShadows' || sectionId === 'gelEffects') {
    return 'buttons';
  }

  return sectionId;
};

export const buildKangurThemeFontWeightOptions = (
  locale: KangurThemeSettingsLocale
): ReadonlyArray<LabeledOptionDto<string>> => FONT_WEIGHT_OPTIONS_BY_LOCALE[locale];

export const buildKangurThemeHomeActionFields = (
  locale: KangurThemeSettingsLocale
): SettingsPanelField<ThemeSettings>[] => {
  const groups = [
    { prefix: 'homeActionLessons', key: 'lessons' },
    { prefix: 'homeActionPlay', key: 'play' },
    { prefix: 'homeActionTraining', key: 'training' },
    { prefix: 'homeActionKangur', key: 'kangur' },
  ] as const;
  const suffixes = [
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

  return groups.flatMap((group) =>
    suffixes.map((suffix) => ({
      key: `${group.prefix}${suffix}` as keyof ThemeSettings,
      label: `${HOME_ACTION_GROUP_LABELS[locale][group.key]} ${HOME_ACTION_TOKEN_LABELS[locale][suffix]}`,
      type: 'color' as const,
    }))
  );
};
