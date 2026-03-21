import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import type { SettingsPanelField } from '@/features/kangur/shared/ui/templates/SettingsPanelBuilder';
import type { KangurStorefrontAppearanceMode } from '@/features/kangur/storefront-appearance-settings';
import type { KangurAdminLocaleDto as AppearanceAdminLocale } from '../kangur-admin-locale';
import { resolveKangurAdminLocale } from '../kangur-admin-locale';
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

const PRESET_LABELS: Record<AppearanceAdminLocale, { dailyCrystal: string; nightlyCrystal: string }> = {
  en: {
    dailyCrystal: 'Daily Crystal (preset)',
    nightlyCrystal: 'Nightly Crystal (preset)',
  },
  pl: {
    dailyCrystal: 'Daily Crystal (preset)',
    nightlyCrystal: 'Nightly Crystal (preset)',
  },
  uk: {
    dailyCrystal: 'Daily Crystal (пресет)',
    nightlyCrystal: 'Nightly Crystal (пресет)',
  },
};

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
  uk: {
    corePalette: {
      title: 'Основна палітра',
      subtitle: 'Кольори бренду, тони тексту та стани зворотного звʼязку в Kangur.',
    },
    textOverrides: {
      title: 'Перевизначення тексту',
      subtitle: 'Необовʼязкові перевизначення кольорів тексту сторінки, карток і навігації.',
    },
    logoLoader: {
      title: 'Лого і лоадер',
      subtitle: 'Налаштуйте градієнти логотипа Kangur, які використовуються в лоадері та навігації.',
    },
    layoutRadii: {
      title: 'Макет і радіуси',
      subtitle: 'Відступи сторінки, заокруглення кутів і вирівнювання панелей.',
    },
    gradientsTransparency: {
      title: 'Градієнти і прозорість',
      subtitle: 'Налаштуйте тла панелей і прозорість навігації.',
    },
    typography: {
      title: 'Типографіка',
      subtitle: 'Шрифти, що використовуються в заголовках і основному тексті.',
    },
    buttonsGlobal: {
      title: 'Кнопки (глобально)',
      subtitle: 'Спільні налаштування для основних і другорядних кнопок.',
    },
    buttonShadows: {
      title: 'Тіні кнопок',
      subtitle: 'Зовнішні тіні для основних і другорядних кнопок.',
    },
    gelGlassEffects: {
      title: 'Гелеві та скляні ефекти',
      subtitle: 'Налаштування сучасних glass і gel ефектів.',
    },
    homeActionButtons: {
      title: 'Кнопки дій головної сторінки',
      subtitle: 'Спеціальні перевизначення для головних карток дій на ігровій сторінці.',
    },
    dropShadows: {
      title: 'Тіні',
      subtitle: 'Спільні конфігурації тіней для контейнерів і карток.',
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
  uk: {
    '300': 'Легка (300)',
    '400': 'Звичайна (400)',
    '500': 'Середня (500)',
    '600': 'Напівжирна (600)',
    '700': 'Жирна (700)',
    '800': 'Дуже жирна (800)',
    inherit: 'Успадкувати',
    'system-ui': 'Системний інтерфейс',
    none: 'Немає',
    small: 'Малий',
    medium: 'Середній',
    large: 'Великий',
    'vertical-lift': 'Вертикальний підйом',
    scale: 'Масштаб',
    glow: 'Сяйво',
    border: 'Підсвітка рамки',
    ease: 'Плавно',
    'ease-in': 'Плавний вхід',
    'ease-out': 'Плавний вихід',
    'ease-in-out': 'Плавний вхід і вихід',
    linear: 'Лінійно',
    left: 'Ліва',
    right: 'Права',
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
  uk: {
    primaryColor: 'Основний акцент',
    secondaryColor: 'Другорядний акцент',
    accentColor: 'Акцент попередження',
    successColor: 'Успіх',
    errorColor: 'Помилка / деструктивне',
    textColor: 'Основний текст',
    mutedTextColor: 'Приглушений текст',
    pageTextColor: 'Перевизначення тексту сторінки',
    pageMutedTextColor: 'Перевизначення приглушеного тексту сторінки',
    cardTextColor: 'Перевизначення тексту картки',
    navTextColor: 'Перевизначення тексту навігації',
    navActiveTextColor: 'Перевизначення активного тексту навігації',
    navHoverTextColor: 'Перевизначення hover-тексту навігації',
    logoWordStart: 'Початок напису логотипа',
    logoWordMid: 'Середина напису логотипа',
    logoWordEnd: 'Кінець напису логотипа',
    logoRingStart: 'Початок обвідки',
    logoRingEnd: 'Кінець обвідки',
    logoAccentStart: 'Початок акценту',
    logoAccentEnd: 'Кінець акценту',
    logoInnerStart: 'Початок внутрішнього сяйва логотипа',
    logoInnerEnd: 'Кінець внутрішнього сяйва логотипа',
    logoShadow: 'Тінь логотипа',
    logoGlint: 'Блік логотипа',
    pagePadding: 'Типовий padding сторінки',
    pagePaddingTop: 'Padding сторінки зверху',
    pagePaddingBottom: 'Padding сторінки знизу',
    gridGutter: 'Відступ сітки',
    cardRadius: 'Радіус кута картки',
    containerPaddingInner: 'Внутрішній padding контейнера',
    panelGradientStart: 'Початок градієнта панелі',
    panelGradientEnd: 'Кінець градієнта панелі',
    panelTransparency: 'Непрозорість панелі (0-1)',
    navGradientStart: 'Початок градієнта навігації',
    navGradientEnd: 'Кінець градієнта навігації',
    navTransparency: 'Непрозорість навігації (0-1)',
    headingFont: 'Шрифт заголовка',
    bodyFont: 'Шрифт тексту',
    baseSize: 'Базовий розмір шрифту',
    headingWeight: 'Товщина заголовка',
    bodyWeight: 'Товщина тексту',
    lineHeight: 'Висота рядка тексту',
    headingLineHeight: 'Висота рядка заголовка',
    btnPrimaryBg: 'Тло основної кнопки',
    btnPrimaryText: 'Текст основної кнопки',
    btnSecondaryBg: 'Тло другорядної кнопки',
    btnSecondaryText: 'Текст другорядної кнопки',
    btnOutlineBorder: 'Колір рамки outline',
    btnRadius: 'Радіус кута кнопки',
    btnBorderRadius: 'Радіус рамки кнопки',
    btnFontSize: 'Розмір шрифту кнопки',
    btnFontWeight: 'Товщина шрифту кнопки',
    btnPaddingX: 'Padding X кнопки',
    btnPaddingY: 'Padding Y кнопки',
    btnBorderWidth: 'Ширина рамки кнопки',
    btnBorderOpacity: 'Непрозорість рамки кнопки (0-100)',
    btnShadowX: 'Тінь кнопки X',
    btnShadowY: 'Тінь кнопки Y',
    btnShadowBlur: 'Розмиття тіні кнопки',
    btnShadowOpacity: 'Непрозорість тіні кнопки (0-1)',
    btnGlossOpacity: 'Непрозорість блиску',
    btnGlossHeight: 'Висота блиску (%)',
    btnGlossAngle: 'Кут блиску (deg)',
    btnGlossColor: 'Колір тонування блиску',
    btnInsetHighlightOpacity: 'Непрозорість внутрішнього підсвічування',
    btnInsetShadowOpacity: 'Непрозорість внутрішньої тіні',
    btnInsetShadowBlur: 'Розмиття внутрішньої тіні',
    btnInsetShadowY: 'Внутрішня тінь Y',
    btnTextShadowOpacity: 'Непрозорість тіні тексту',
    btnTextShadowY: 'Тінь тексту Y',
    btnTextShadowBlur: 'Розмиття тіні тексту',
    btnGlowOpacity: 'Непрозорість сяйва кнопки',
    btnGlowSpread: 'Поширення сяйва кнопки',
    btnGlowColor: 'Перевизначення кольору сяйва',
    containerShadowX: 'Тінь панелі X',
    containerShadowY: 'Тінь панелі Y',
    containerShadowBlur: 'Розмиття тіні панелі',
    containerShadowOpacity: 'Непрозорість тіні панелі',
    cardShadowX: 'Тінь картки X',
    cardShadowY: 'Тінь картки Y',
    cardShadowBlur: 'Розмиття тіні картки',
    cardShadowOpacity: 'Непрозорість тіні картки',
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
  uk: {
    pageTextColor: 'Залиште порожнім, щоб використати колір основного тексту.',
    pageMutedTextColor: 'Залиште порожнім, щоб використати колір приглушеного тексту.',
    cardTextColor: 'Керує кольором тексту всередині мʼяких карток.',
    navTextColor: 'Перевизначає колір тексту верхньої навігації.',
    navActiveTextColor: 'Перевизначає колір активного тексту навігації.',
    navHoverTextColor: 'Перевизначає колір тексту hover у навігації.',
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
  uk: {
    pageTextColor: 'Авто',
    pageMutedTextColor: 'Авто',
    cardTextColor: 'Авто',
    navTextColor: 'Авто',
    navActiveTextColor: 'Авто',
    navHoverTextColor: 'Авто',
    pagePaddingTop: 'Авто',
    pagePaddingBottom: 'Авто',
    panelGradientStart: 'Авто',
    panelGradientEnd: 'Авто',
    navGradientStart: 'Авто',
    navGradientEnd: 'Авто',
    btnPrimaryBg: 'Авто',
    btnSecondaryBg: 'Авто',
    btnGlowColor: 'Авто (тло кнопки)',
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
  uk: {
    lessons: 'Уроки',
    play: 'Грай',
    training: 'Тренування',
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
  uk: {
    TextColor: 'Колір тексту',
    TextActiveColor: 'Колір активного тексту',
    LabelStart: 'Початок градієнта мітки',
    LabelMid: 'Середина градієнта мітки',
    LabelEnd: 'Кінець градієнта мітки',
    LabelStartActive: 'Початок активного градієнта мітки',
    LabelMidActive: 'Середина активного градієнта мітки',
    LabelEndActive: 'Кінець активного градієнта мітки',
    AccentStart: 'Початок градієнта акценту',
    AccentMid: 'Середина градієнта акценту',
    AccentEnd: 'Кінець градієнта акценту',
    UnderlayStart: 'Початок градієнта підкладки',
    UnderlayMid: 'Середина градієнта підкладки',
    UnderlayEnd: 'Кінець градієнта підкладки',
    UnderlayTintStart: 'Початок тонування підкладки',
    UnderlayTintMid: 'Середина тонування підкладки',
    UnderlayTintEnd: 'Кінець тонування підкладки',
    AccentShadowColor: 'Тінь акценту',
    UnderlayShadowColor: 'Тінь підкладки',
    SurfaceShadowColor: 'Тінь поверхні',
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
  uk: {
    breadcrumbs: ['Admin', 'Kangur', 'Налаштування', 'Вигляд'],
    shellTitle: 'Вигляд Kangur',
    shellDescription: 'Зосереджена панель редагування для уроків, тестів і операцій із вмістом.',
    backToSettings: 'Повернутися до налаштувань',
    saveTheme: 'Зберегти тему',
    saving: 'Зберігаю...',
    selectedTheme: 'Вибрана тема',
    selectedThemeAria: 'Вибрана тема',
    unsavedChanges: 'Незбережені зміни',
    assignThemeToSlot: (themeName: string) => `Призначити тему "${themeName}" до слоту`,
    presetReadOnly:
      'Цей пресет Crystal доступний лише для читання, але ви все одно можете призначити його до слоту вище.',
    factoryReadOnly: 'Це фабрична тема Kangur. Вона доступна лише для читання.',
    restoreDefaults: 'Відновити типові',
    statusTitle: 'Статус',
    statusBadges: {
      readOnly: 'Лише читання',
      unsaved: 'Незбережені зміни',
      saved: 'Збережено',
    },
    statusItems: {
      theme: 'Тема',
      type: 'Тип',
      assignedSlots: 'Призначені слоти',
    },
    themeTypes: {
      factory: 'Фабрична',
      preset: 'Пресет',
      builtin: 'Вбудована',
      custom: 'Власна',
    },
    notAssigned: 'Не призначено',
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
  uk: {
    title: 'Стартова система',
    description:
      'Виберіть, яку візуальну систему (світлу чи темну) потрібно завантажувати за замовчуванням під час запуску застосунку.',
    selectAriaLabel: 'Виберіть стартовий режим вигляду',
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
  uk: {
    default: 'Денна тема',
    dawn: 'Світанкова тема',
    sunset: 'Тема заходу',
    dark: 'Нічна тема',
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
  uk: {
    title: 'Імпорт / Експорт',
    description: 'Переносьте конфігурації тем між середовищами за допомогою буфера обміну.',
    exportButton: 'Експортувати в буфер обміну',
    importButton: 'Імпортувати з буфера обміну',
    exportError: 'Не вдалося скопіювати конфігурацію.',
    exportSuccess: 'Конфігурацію теми скопійовано в буфер обміну.',
    importError: 'Неправильний формат даних у буфері обміну.',
    importSuccess: 'Тему завантажено з буфера обміну. Не забудьте зберегти зміни.',
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
  uk: {
    openButton: (count: number) => `Каталог тем (${count})`,
    modalTitle: 'Каталог збережених тем',
    saveCurrentAsNew: 'Зберегти поточну тему як нову',
    themeNamePlaceholder: 'Назва теми...',
    themeNameAria: 'Назва теми',
    save: 'Зберегти',
    filterCatalog: 'Фільтрувати каталог',
    searchPlaceholder: 'Шукати тему за назвою...',
    searchAria: 'Фільтрувати теми в каталозі',
    sortLabel: 'Сортування',
    sortAria: 'Сортування каталогу тем',
    countSummary: (visible: number, total: number) => `Показано ${visible} з ${total} тем`,
    defaultSortHint: 'За замовчуванням: новіші теми зверху',
    savedBadge: 'Збережена',
    createdLabel: 'Створено',
    updatedLabel: 'Оновлено',
    selected: 'Вибрана',
    load: 'Завантажити',
    duplicating: 'Дублюю...',
    duplicate: 'Дублювати',
    deleteAria: 'Видалити тему з каталогу',
    emptyCatalog: 'У каталозі немає збережених тем.',
    emptyFilters: 'Немає тем, що відповідають поточним фільтрам.',
    noDate: 'немає дати',
    createDefaultName: 'Нова тема',
    duplicateSuffix: 'копія',
    createError: 'Не вдалося зберегти тему.',
    createSuccess: 'Нову тему додано до каталогу.',
    duplicateError: 'Не вдалося дублювати тему.',
    duplicateSuccess: 'Тему дубльовано.',
    deleteError: 'Не вдалося видалити тему.',
    deleteSuccess: 'Тему видалено.',
    confirmDelete: 'Ви впевнені, що хочете видалити цю тему з каталогу?',
    sortOptions: [
      { value: 'created-desc', label: 'Найновіші' },
      { value: 'created-asc', label: 'Найстаріші' },
      { value: 'updated-desc', label: 'Нещодавно оновлені' },
      { value: 'name-asc', label: 'Назва A-Z' },
      { value: 'name-desc', label: 'Назва Z-A' },
    ] as const satisfies ReadonlyArray<LabeledOptionDto<AppearanceCatalogSortOption>>,
    dateLocale: 'uk-UA',
    compareLocale: 'uk',
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
  uk: {
    targetLabels: {
      current: 'Перегляд',
      daily: 'День',
      dawn: 'Світанок',
      sunset: 'Захід',
      nightly: 'Ніч',
    },
    groupAriaLabel: 'Перегляд теми',
    sectionLabels: {
      page: 'Сторінка і навігація',
      buttons: 'Кнопки',
      cards: 'Картки і поля',
      colors: 'Кольори і градієнти',
      chat: 'Чат',
      components: 'Компоненти',
    },
    navItems: ['Курси', 'Результати', 'Профіль'],
    homeActions: [
      { id: 'lessons', label: 'Уроки', emoji: '\ud83d\udcda' },
      { id: 'play', label: 'Грай', emoji: '\ud83c\udfae' },
      { id: 'training', label: 'Тренування', emoji: '\ud83c\udfc6' },
      { id: 'kangur', label: 'Kangur', emoji: '\ud83e\udd98' },
    ],
    pageHeading: 'Абетка - 6 років',
    pageSubtext: 'Літери, склади й перші слова.',
    buttonLabels: {
      primary: 'Основна',
      hover: 'Hover',
      secondary: 'Другорядна',
      surface: 'Поверхня',
      warning: 'Попередження',
      success: 'Успіх',
    },
    lessonTitle: 'Урок 3 - Дроби',
    lessonMeta: '12 вправ · 45 хв',
    continueLabel: 'Продовжити',
    resultsLabel: 'Результати',
    searchPlaceholder: 'Шукати вправу...',
    studentOneName: 'Anna Kowalska',
    studentOneMeta: 'Прогрес: 74% · №12 у класі',
    studentTwoName: 'Jan Nowak',
    studentTwoMeta: '1 240 балів',
    profileLabel: 'Профіль',
    dropdownItems: ['Звичайні дроби', 'Десяткові дроби', 'Відсотки'],
    accentGradientsLabel: 'Градієнти акцентів',
    accentGradientNames: ['Індиго', 'Фіолетовий', 'Смарагдовий', 'Небесний', 'Бурштиновий', 'Рожевий', 'Бірюзовий', 'Сланцевий'],
    logoPaletteLabel: 'Палітра лого',
    logoPaletteNames: ['Початок напису', 'Середина напису', 'Кінець напису', 'Початок обвідки', 'Кінець обвідки', 'Початок акценту', 'Кінець акценту'],
    badgesLabel: 'Позначки',
    badges: ['Нове', '-20%', 'Готово', 'Важливо', 'Інфо', 'VIP'],
    assistantName: 'AI-помічник',
    assistantStatus: 'online',
    assistantGreeting: 'Привіт! Чим я можу допомогти сьогодні?',
    assistantHint: 'Підказка: запитайте про дроби',
    userPrompt: 'Поясни мені десяткові дроби',
    successMessage: 'Відповідь успішно згенеровано',
    chatChips: ['Більше', 'Квіз'],
    composerPlaceholder: 'Напишіть повідомлення...',
    elevatedLabel: 'Піднятий',
    subtleLabel: 'Делікатний',
    segmentedLabels: ['День', 'Тиждень', 'Місяць'],
    disabledFieldLabel: 'Вимкнене поле',
    controlLabel: 'Елемент керування',
    previewInputAria: 'поле перегляду',
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
  uk: {
    defaultModeSaveError: 'Не вдалося зберегти стартову тему за замовчуванням.',
    defaultModeSaveSuccess: 'Стартову тему за замовчуванням оновлено.',
    unsavedSwitchConfirm:
      'У поточній темі є незбережені зміни. Ви впевнені, що хочете переключитися?',
    assignError: 'Не вдалося призначити тему.',
    assignSuccess: (slotLabel: string) => `Тему призначено до слоту "${slotLabel}".`,
    unassignError: 'Не вдалося відвʼязати тему.',
    unassignSuccess: (slotLabel: string) => `Слот "${slotLabel}" відновлено до фабричних налаштувань.`,
    saveFactoryError: 'Не можна зберігати зміни у фабричній темі.',
    saveError: 'Не вдалося зберегти тему.',
    saveSuccess: 'Тему збережено.',
  },
} as const;

export const resolveAppearanceAdminLocale = (
  locale: string | null | undefined
): AppearanceAdminLocale => resolveKangurAdminLocale(locale);

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
    uk: {
      daily: 'День',
      dawn: 'Світанок',
      sunset: 'Захід',
      nightly: 'Ніч',
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
  if (id === PRESET_DAILY_CRYSTAL_ID) return PRESET_LABELS[locale].dailyCrystal;
  if (id === PRESET_NIGHTLY_CRYSTAL_ID) return PRESET_LABELS[locale].nightlyCrystal;

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
    uk: {
      [BUILTIN_DAILY_ID]: 'Денна тема (вбудована)',
      [BUILTIN_DAWN_ID]: 'Світанкова тема (вбудована)',
      [BUILTIN_SUNSET_ID]: 'Тема заходу (вбудована)',
      [BUILTIN_NIGHTLY_ID]: 'Нічна тема (вбудована)',
      [FACTORY_DAILY_ID]: 'Денна тема (фабрична)',
      [FACTORY_DAWN_ID]: 'Світанкова тема (фабрична)',
      [FACTORY_SUNSET_ID]: 'Тема заходу (фабрична)',
      [FACTORY_NIGHTLY_ID]: 'Нічна тема (фабрична)',
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
