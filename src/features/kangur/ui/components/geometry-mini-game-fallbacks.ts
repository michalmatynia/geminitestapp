import type { GeometryShapeId } from '@/features/kangur/ui/services/geometry-drawing';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type GeometryDrawingShapeFallback = {
  label: string;
  hint: string;
};

export type GeometryDrawingMiniGameFallbackCopy = {
  check: string;
  clear: string;
  difficultyChip: string;
  difficultyDefault: string;
  difficultyGroupAria: string;
  drawHere: string;
  inputHelp: string;
  keyboard: {
    boardCleared: string;
    cleared: string;
    difficultyChanged: string;
    finished: string;
    ready: string;
    restarted: string;
    started: string;
  };
  liveRegion: string;
  modeLabel: string;
  progressAriaLabel: string;
  progressValueText: string;
  prompt: string;
  shapes: Record<GeometryShapeId, GeometryDrawingShapeFallback>;
  tooShort: string;
  canvasAria: string;
};

type GeometrySymmetryRoundFallback = {
  hint: string;
  prompt: string;
  title: string;
};

export type GeometrySymmetryMiniGameFallbackCopy = {
  canvasAria: string;
  check: string;
  clear: string;
  inputHelp: string;
  keyboard: {
    boardCleared: string;
    cleared: string;
    finished: string;
    ready: string;
    restarted: string;
    started: string;
  };
  liveRegion: string;
  mirror: {
    ghostHint: string;
    hideHint: string;
    showHint: string;
    zoneHint: string;
  };
  mode: {
    axis: string;
    mirror: string;
  };
  modeLabel: string;
  progressAriaLabel: string;
  progressValueText: string;
  rounds: Record<string, GeometrySymmetryRoundFallback>;
  tooShort: string;
};

const DRAWING_PL: GeometryDrawingMiniGameFallbackCopy = {
  check: 'Sprawdź',
  clear: 'Wyczyść',
  difficultyChip: 'Poziom figur',
  difficultyDefault: 'Podstawowy',
  difficultyGroupAria: 'Poziom trudności figur',
  drawHere: 'Rysuj tutaj',
  inputHelp:
    'Pole rysowania obsługuje mysz, dotyk lub klawiaturę. Enter albo spacja zaczyna i kończy kreskę, strzałki przesuwają kursor, Escape czyści planszę.',
  keyboard: {
    boardCleared: 'Wyczyszczono planszę.',
    cleared: 'Wyczyszczono planszę i ustawiono kursor na środku.',
    difficultyChanged: 'Zmieniono poziom na {difficulty}.',
    finished: 'Zakończono rysowanie klawiaturą.',
    ready: 'Plansza gotowa do rysowania klawiaturą.',
    restarted: 'Rozpoczęto nową rundę figur.',
    started: 'Rozpoczęto rysowanie klawiaturą.',
  },
  liveRegion: 'Runda {current} z {total}. Narysuj figurę {shape}. Poziom {difficulty}.',
  modeLabel: 'Figury • {difficulty}',
  progressAriaLabel: 'Dokładność w treningu figur',
  progressValueText: 'Runda {current} z {total}',
  prompt: 'Narysuj: {shape}',
  shapes: {
    circle: {
      label: 'Koło',
      hint: 'Narysuj jedną płynną, zamkniętą linię.',
    },
    diamond: {
      label: 'Romb',
      hint: '4 rogi, boki wyglądają na ukośne.',
    },
    hexagon: {
      label: 'Sześciokąt',
      hint: '6 rogów i zamknięta linia.',
    },
    oval: {
      label: 'Owal',
      hint: 'Narysuj kształt bez rogów, ale trochę wydłużony.',
    },
    pentagon: {
      label: 'Pięciokąt',
      hint: '5 rogów, zamknięta figura.',
    },
    rectangle: {
      label: 'Prostokąt',
      hint: '4 rogi, dwa boki wyraźnie dłuższe.',
    },
    square: {
      label: 'Kwadrat',
      hint: '4 boki, podobna długość każdego boku.',
    },
    triangle: {
      label: 'Trójkąt',
      hint: 'Postaraj się zrobić 3 wyraźne rogi.',
    },
  },
  tooShort: 'Narysuj figurę trochę dłużej, żeby można było ją ocenić.',
  canvasAria:
    'Plansza do rysowania figury {shape}. Użyj myszy lub dotyku, aby narysować figurę.',
};

const DRAWING_EN: GeometryDrawingMiniGameFallbackCopy = {
  check: 'Check',
  clear: 'Clear',
  difficultyChip: 'Shape level',
  difficultyDefault: 'Basic',
  difficultyGroupAria: 'Shape difficulty level',
  drawHere: 'Draw here',
  inputHelp:
    'The drawing area supports mouse, touch, or keyboard. Enter or Space starts and ends a stroke, the arrow keys move the cursor, and Escape clears the board.',
  keyboard: {
    boardCleared: 'Board cleared.',
    cleared: 'Board cleared and the cursor moved to the center.',
    difficultyChanged: 'Difficulty changed to {difficulty}.',
    finished: 'Finished keyboard drawing.',
    ready: 'Board ready for keyboard drawing.',
    restarted: 'Started a new round of shapes.',
    started: 'Started keyboard drawing.',
  },
  liveRegion: 'Round {current} of {total}. Draw the shape {shape}. Difficulty {difficulty}.',
  modeLabel: 'Shapes • {difficulty}',
  progressAriaLabel: 'Accuracy in shape training',
  progressValueText: 'Round {current} of {total}',
  prompt: 'Draw: {shape}',
  shapes: {
    circle: {
      label: 'Circle',
      hint: 'Draw one smooth, closed line.',
    },
    diamond: {
      label: 'Diamond',
      hint: '4 corners, with slanted-looking sides.',
    },
    hexagon: {
      label: 'Hexagon',
      hint: '6 corners and a closed line.',
    },
    oval: {
      label: 'Oval',
      hint: 'Draw a shape without corners, but a bit longer.',
    },
    pentagon: {
      label: 'Pentagon',
      hint: '5 corners, closed shape.',
    },
    rectangle: {
      label: 'Rectangle',
      hint: '4 corners, with two clearly longer sides.',
    },
    square: {
      label: 'Square',
      hint: '4 sides, with each side about the same length.',
    },
    triangle: {
      label: 'Triangle',
      hint: 'Try to make 3 clear corners.',
    },
  },
  tooShort: 'Draw the shape a bit longer so it can be checked.',
  canvasAria:
    'Drawing board for shape {shape}. Use mouse or touch to draw the shape.',
};

const DRAWING_DE: GeometryDrawingMiniGameFallbackCopy = {
  check: 'Prufen',
  clear: 'Loschen',
  difficultyChip: 'Formenstufe',
  difficultyDefault: 'Basis',
  difficultyGroupAria: 'Schwierigkeitsstufe der Formen',
  drawHere: 'Hier zeichnen',
  inputHelp:
    'Das Zeichenfeld unterstutzt Maus, Beruhrung oder Tastatur. Enter oder Leertaste beginnt und beendet einen Strich, die Pfeiltasten bewegen den Cursor, Escape leert das Feld.',
  keyboard: {
    boardCleared: 'Feld geleert.',
    cleared: 'Feld geleert und Cursor in die Mitte gesetzt.',
    difficultyChanged: 'Schwierigkeitsstufe auf {difficulty} geandert.',
    finished: 'Tastaturzeichnung beendet.',
    ready: 'Feld fur Tastaturzeichnung bereit.',
    restarted: 'Neue Formenrunde gestartet.',
    started: 'Tastaturzeichnung gestartet.',
  },
  liveRegion: 'Runde {current} von {total}. Zeichne die Form {shape}. Stufe {difficulty}.',
  modeLabel: 'Formen • {difficulty}',
  progressAriaLabel: 'Genauigkeit im Formen-Training',
  progressValueText: 'Runde {current} von {total}',
  prompt: 'Zeichne: {shape}',
  shapes: {
    circle: {
      label: 'Kreis',
      hint: 'Zeichne eine glatte, geschlossene Linie.',
    },
    diamond: {
      label: 'Raute',
      hint: '4 Ecken, die Seiten wirken schrag.',
    },
    hexagon: {
      label: 'Sechseck',
      hint: '6 Ecken und eine geschlossene Linie.',
    },
    oval: {
      label: 'Oval',
      hint: 'Zeichne eine Form ohne Ecken, aber etwas langer.',
    },
    pentagon: {
      label: 'Funfeck',
      hint: '5 Ecken, geschlossene Form.',
    },
    rectangle: {
      label: 'Rechteck',
      hint: '4 Ecken, zwei Seiten sind deutlich langer.',
    },
    square: {
      label: 'Quadrat',
      hint: '4 Seiten, jede Seite etwa gleich lang.',
    },
    triangle: {
      label: 'Dreieck',
      hint: 'Versuche, 3 deutliche Ecken zu machen.',
    },
  },
  tooShort: 'Zeichne die Form etwas langer, damit sie gepruft werden kann.',
  canvasAria:
    'Zeichenfeld fur die Form {shape}. Nutze Maus oder Beruhrung, um die Form zu zeichnen.',
};

const SYMMETRY_PL: GeometrySymmetryMiniGameFallbackCopy = {
  canvasAria: 'Plansza do rysowania osi i odbić symetrii.',
  check: 'Sprawdź',
  clear: 'Wyczyść',
  inputHelp:
    'Pole rysowania obsługuje mysz, dotyk lub klawiaturę. Enter albo spacja zaczyna i kończy kreskę, strzałki przesuwają kursor, Escape czyści planszę.',
  keyboard: {
    boardCleared: 'Wyczyszczono planszę.',
    cleared: 'Wyczyszczono planszę i ustawiono kursor na środku.',
    finished: 'Zakończono rysowanie klawiaturą.',
    ready: 'Plansza gotowa do rysowania.',
    restarted: 'Rozpoczęto nową rundę symetrii.',
    started: 'Rozpoczęto rysowanie klawiaturą.',
  },
  liveRegion: 'Runda {current} z {total}. {prompt}',
  mirror: {
    ghostHint: 'Przerywana linia pokazuje brakujące odbicie.',
    hideHint: 'Ukryj podpowiedź',
    showHint: 'Pokaż podpowiedź',
    zoneHint: 'Rysuj tylko w zielonej strefie. Szara strefa jest bez rysowania.',
  },
  mode: {
    axis: 'Oś',
    mirror: 'Odbicie',
  },
  modeLabel: 'Symetria • {mode}',
  progressAriaLabel: 'Dokładność w grze o symetrii',
  progressValueText: 'Runda {current} z {total}',
  rounds: {
    'axis-butterfly': {
      title: 'Oś motyla',
      prompt: 'Narysuj oś symetrii motyla.',
      hint: 'To pionowa linia przechodząca przez środek — kieruj się zielonym pasem.',
    },
    'axis-eye': {
      title: 'Oś oka',
      prompt: 'Narysuj oś symetrii oka.',
      hint: 'To pozioma linia pośrodku — zielony pas wskazuje oś.',
    },
    'axis-square': {
      title: 'Oś kwadratu',
      prompt: 'Narysuj oś symetrii kwadratu.',
      hint: 'To pionowa linia pośrodku kwadratu — zielony pas pokazuje oś.',
    },
    'mirror-heart': {
      title: 'Serce w lustrze',
      prompt: 'Dorysuj brakującą połowę serca.',
      hint: 'Odbij kształt po osi, rysując po zielonej stronie.',
    },
    'mirror-leaf': {
      title: 'Listek',
      prompt: 'Dorysuj dolną połowę listka.',
      hint: 'Symetria względem osi poziomej — rysuj w zielonej strefie.',
    },
    'mirror-zigzag': {
      title: 'Zygzak w lustrze',
      prompt: 'Dorysuj odbicie zygzaka.',
      hint: 'Rysuj tylko w zielonej strefie po prawej stronie osi.',
    },
  },
  tooShort: 'Zrób kilka ruchów, żeby powstała linia do sprawdzenia.',
};

const SYMMETRY_EN: GeometrySymmetryMiniGameFallbackCopy = {
  canvasAria: 'Board for drawing symmetry axes and reflections.',
  check: 'Check',
  clear: 'Clear',
  inputHelp:
    'The drawing area supports mouse, touch, or keyboard. Enter or Space starts and ends a stroke, the arrow keys move the cursor, and Escape clears the board.',
  keyboard: {
    boardCleared: 'Board cleared.',
    cleared: 'Board cleared and the cursor moved to the center.',
    finished: 'Finished keyboard drawing.',
    ready: 'Board ready for drawing.',
    restarted: 'Started a new symmetry round.',
    started: 'Started keyboard drawing.',
  },
  liveRegion: 'Round {current} of {total}. {prompt}',
  mirror: {
    ghostHint: 'The dashed line shows the missing reflection.',
    hideHint: 'Hide hint',
    showHint: 'Show hint',
    zoneHint: 'Draw only in the green zone. The grey zone is off-limits.',
  },
  mode: {
    axis: 'Axis',
    mirror: 'Reflection',
  },
  modeLabel: 'Symmetry • {mode}',
  progressAriaLabel: 'Accuracy in the symmetry game',
  progressValueText: 'Round {current} of {total}',
  rounds: {
    'axis-butterfly': {
      title: 'Butterfly axis',
      prompt: 'Draw the axis of symmetry of the butterfly.',
      hint: 'It is a vertical line through the middle. Follow the green band.',
    },
    'axis-eye': {
      title: 'Eye axis',
      prompt: 'Draw the axis of symmetry of the eye.',
      hint: 'It is a horizontal line through the middle. The green band shows the axis.',
    },
    'axis-square': {
      title: 'Square axis',
      prompt: 'Draw the axis of symmetry of the square.',
      hint: 'It is a vertical line in the middle of the square. The green band shows the axis.',
    },
    'mirror-heart': {
      title: 'Heart in the mirror',
      prompt: 'Draw the missing half of the heart.',
      hint: 'Reflect the shape across the axis and draw on the green side.',
    },
    'mirror-leaf': {
      title: 'Leaf',
      prompt: 'Draw the bottom half of the leaf.',
      hint: 'Symmetry across the horizontal axis. Draw in the green zone.',
    },
    'mirror-zigzag': {
      title: 'Zigzag in the mirror',
      prompt: 'Draw the reflection of the zigzag.',
      hint: 'Draw only in the green zone on the right side of the axis.',
    },
  },
  tooShort: 'Make a few more moves so there is a line to check.',
};

const SYMMETRY_DE: GeometrySymmetryMiniGameFallbackCopy = {
  canvasAria: 'Zeichenfeld fur Symmetrieachsen und Spiegelungen.',
  check: 'Prufen',
  clear: 'Loschen',
  inputHelp:
    'Das Zeichenfeld unterstutzt Maus, Beruhrung oder Tastatur. Enter oder Leertaste beginnt und beendet einen Strich, die Pfeiltasten bewegen den Cursor, Escape leert das Feld.',
  keyboard: {
    boardCleared: 'Feld geleert.',
    cleared: 'Feld geleert und Cursor in die Mitte gesetzt.',
    finished: 'Tastaturzeichnung beendet.',
    ready: 'Feld zum Zeichnen bereit.',
    restarted: 'Neue Symmetrierunde gestartet.',
    started: 'Tastaturzeichnung gestartet.',
  },
  liveRegion: 'Runde {current} von {total}. {prompt}',
  mirror: {
    ghostHint: 'Die gestrichelte Linie zeigt die fehlende Spiegelung.',
    hideHint: 'Hinweis ausblenden',
    showHint: 'Hinweis anzeigen',
    zoneHint: 'Zeichne nur in der grunen Zone. Die graue Zone ist gesperrt.',
  },
  mode: {
    axis: 'Achse',
    mirror: 'Spiegelung',
  },
  modeLabel: 'Symmetrie • {mode}',
  progressAriaLabel: 'Genauigkeit im Symmetriespiel',
  progressValueText: 'Runde {current} von {total}',
  rounds: {
    'axis-butterfly': {
      title: 'Achse des Schmetterlings',
      prompt: 'Zeichne die Symmetrieachse des Schmetterlings.',
      hint: 'Das ist eine senkrechte Linie durch die Mitte. Folge dem grunen Band.',
    },
    'axis-eye': {
      title: 'Achse des Auges',
      prompt: 'Zeichne die Symmetrieachse des Auges.',
      hint: 'Das ist eine waagerechte Linie in der Mitte. Das grune Band zeigt die Achse.',
    },
    'axis-square': {
      title: 'Achse des Quadrats',
      prompt: 'Zeichne die Symmetrieachse des Quadrats.',
      hint: 'Das ist eine senkrechte Linie in der Mitte des Quadrats. Das grune Band zeigt die Achse.',
    },
    'mirror-heart': {
      title: 'Herz im Spiegel',
      prompt: 'Zeichne die fehlende Halfte des Herzens.',
      hint: 'Spiegle die Form an der Achse und zeichne auf der grunen Seite.',
    },
    'mirror-leaf': {
      title: 'Blatt',
      prompt: 'Zeichne die untere Halfte des Blatts.',
      hint: 'Symmetrie an der waagerechten Achse. Zeichne in der grunen Zone.',
    },
    'mirror-zigzag': {
      title: 'Zickzack im Spiegel',
      prompt: 'Zeichne die Spiegelung des Zickzacks.',
      hint: 'Zeichne nur in der grunen Zone rechts von der Achse.',
    },
  },
  tooShort: 'Mache ein paar mehr Bewegungen, damit eine Linie zum Prufen entsteht.',
};

export const getGeometryDrawingMiniGameFallbackCopy = (
  locale: string | null | undefined
): GeometryDrawingMiniGameFallbackCopy => {
  const normalizedLocale = normalizeSiteLocale(locale);

  if (normalizedLocale === 'de') {
    return DRAWING_DE;
  }

  if (normalizedLocale === 'en') {
    return DRAWING_EN;
  }

  return DRAWING_PL;
};

export const getGeometrySymmetryMiniGameFallbackCopy = (
  locale: string | null | undefined
): GeometrySymmetryMiniGameFallbackCopy => {
  const normalizedLocale = normalizeSiteLocale(locale);

  if (normalizedLocale === 'de') {
    return SYMMETRY_DE;
  }

  if (normalizedLocale === 'en') {
    return SYMMETRY_EN;
  }

  return SYMMETRY_PL;
};
