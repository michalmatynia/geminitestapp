import type {
  KangurGeometryBasicsLessonTemplateContent,
  KangurGeometryShapeRecognitionLessonTemplateContent,
  KangurGeometryShapesLessonTemplateContent,
  KangurGeometrySymmetryLessonTemplateContent,
} from '@/shared/contracts/kangur-lesson-templates';

export const GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT: KangurGeometryBasicsLessonTemplateContent = {
  kind: 'geometry_basics',
  lessonTitle: 'Podstawy geometrii',
  terms: {
    point: 'Punkt',
    segment: 'Odcinek',
  },
  sections: {
    punkt: {
      title: 'Punkt i odcinek',
      description: 'Podstawowe elementy geometrii',
    },
    bok: {
      title: 'Bok i wierzchołek',
      description: 'Części figur wielokątnych',
    },
    kat: {
      title: 'Kąt',
      description: 'Ostry, prosty i rozwarty',
    },
    podsumowanie: {
      title: 'Podsumowanie',
      description: 'Wszystko razem',
    },
    game: {
      title: 'Gra: Geo-misja',
      description: 'Punkt, odcinek, bok i kąt w praktyce',
    },
  },
  slides: {
    punkt: {
      segment: {
        title: 'Punkt i odcinek',
        pointLead: 'to jedno miejsce na kartce.',
        segmentLead: 'łączy dwa punkty.',
        segmentLabel: 'Odcinek AB',
        caption: 'Odcinek ma początek i koniec — to dwa punkty.',
      },
      pointOnSegment: {
        title: 'Punkt na odcinku',
        lead: 'Punkt może leżeć gdziekolwiek na odcinku.',
        caption: 'To wciąż ten sam odcinek, tylko punkt się przesuwa.',
      },
    },
    bok: {
      sideAndVertex: {
        title: 'Bok i wierzchołek',
        lead: 'W figurach wielokątnych mamy boki i wierzchołki (rogi).',
        caption: 'Kwadrat ma 4 boki i 4 wierzchołki.',
        note: 'Boki to odcinki. Wierzchołki to punkty, w których boki się spotykają.',
      },
      countSides: {
        title: 'Policz boki',
        lead: 'Obwiedź figurę i policz każdy bok.',
        caption: 'Każde podświetlenie to jeden bok.',
      },
    },
    kat: {
      whatIsAngle: {
        title: 'Co to jest kąt?',
        lead: 'Kąt powstaje tam, gdzie spotykają się dwa odcinki.',
        rightAngleCaption: 'To kąt prosty (90°).',
        chips: {
          acute: 'Ostry < 90°',
          right: 'Prosty = 90°',
          obtuse: 'Rozwarty > 90°',
        },
      },
      angleTypes: {
        title: 'Rodzaje kątów',
        lead: 'Mały, prosty i rozwarty kąt wyglądają inaczej.',
        caption: 'Porównuj szerokość ramion kąta.',
      },
    },
    podsumowanie: {
      overview: {
        title: 'Podsumowanie',
        items: {
          point: {
            term: 'Punkt',
            definition: 'pojedyncze miejsce',
          },
          segment: {
            term: 'Odcinek',
            definition: 'łączy dwa punkty',
          },
          sideAndVertex: {
            term: 'Bok i wierzchołek',
            definition: 'części figury',
          },
          angle: {
            term: 'Kąt',
            definition: 'miejsce spotkania dwóch odcinków',
          },
        },
      },
      pointAndSegment: {
        title: 'Punkt i odcinek',
        caption: 'Punkt i odcinek.',
      },
      pointOnSegment: {
        title: 'Punkt na odcinku',
        caption: 'Punkt na odcinku.',
      },
      sidesAndVertices: {
        title: 'Boki i wierzchołki',
        caption: 'Boki i wierzchołki.',
      },
      countSides: {
        title: 'Policz boki',
        caption: 'Policz boki.',
      },
      angleTypes: {
        title: 'Rodzaje kątów',
        caption: 'Rodzaje kątów.',
      },
      angleKinds: {
        title: 'Ostry, prosty, rozwarty',
        caption: 'Ostry, prosty, rozwarty.',
      },
    },
  },
  game: {
    gameTitle: 'Geo-misja',
  },
};

export const GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT: KangurGeometryShapesLessonTemplateContent = {
  kind: 'geometry_shapes',
  lessonTitle: 'Figury geometryczne',
  shapeCards: {
    circle: {
      name: 'Koło',
      details: '0 boków i 0 wierzchołków',
    },
    triangle: {
      name: 'Trójkąt',
      details: '3 boki i 3 wierzchołki',
    },
    square: {
      name: 'Kwadrat',
      details: '4 równe boki i 4 wierzchołki',
    },
    rectangle: {
      name: 'Prostokąt',
      details: '4 boki, przeciwległe są równe',
    },
    pentagon: {
      name: 'Pięciokąt',
      details: '5 boków i 5 wierzchołków',
    },
    hexagon: {
      name: 'Sześciokąt',
      details: '6 boków i 6 wierzchołków',
    },
  },
  sections: {
    podstawowe: {
      title: 'Podstawowe kształty',
      description: 'Koło, trójkąt, kwadrat i prostokąt',
    },
    ileBokow: {
      title: 'Ile boków?',
      description: 'Policz boki i rogi figur',
    },
    podsumowanie: {
      title: 'Podsumowanie',
      description: 'Powtórz najważniejsze figury',
    },
    game: {
      title: 'Rysowanie figur',
      description: 'Narysuj figurę i zdobywaj punkty',
    },
  },
  slides: {
    podstawowe: {
      intro: {
        title: 'Poznaj figury',
        orbitCaption: 'Figury mogą się obracać i nadal pozostają tą samą figurą.',
      },
      outline: {
        title: 'Obrys figury',
        caption: 'Obrys to linia dookoła figury.',
      },
      build: {
        title: 'Zbuduj figurę',
        caption: 'Połącz boki, aby zbudować całą figurę.',
      },
    },
    ileBokow: {
      count: {
        title: 'Policz boki i wierzchołki',
      },
      countSides: {
        title: 'Liczenie boków',
        caption: 'Każdy bok liczymy po kolei.',
      },
      corners: {
        title: 'Rogi i wierzchołki',
        caption: 'Wierzchołki to miejsca, gdzie spotykają się boki.',
      },
      segmentSide: {
        title: 'Bok jako odcinek',
        caption: 'Bok figury jest odcinkiem między punktami.',
      },
      drawSide: {
        title: 'Narysuj bok',
        caption: 'Poruszaj punktem, aby zobaczyć, jak powstaje bok.',
      },
    },
    podsumowanie: {
      rotate: {
        title: 'Obracaj figury',
        caption: 'Obrót nie zmienia nazwy figury.',
      },
      sides: {
        title: 'Boki figur',
        caption: 'Każda figura ma określoną liczbę boków.',
      },
      interior: {
        title: 'Wnętrze figury',
        caption: 'Figura ma środek i obrys.',
      },
      build: {
        title: 'Budowanie figury',
        caption: 'Połącz punkty i boki, aby ułożyć figurę.',
      },
    },
  },
  game: {
    gameTitle: 'Rysowanie figur',
  },
};

export const GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT: KangurGeometryShapeRecognitionLessonTemplateContent =
  {
    kind: 'geometry_shape_recognition',
    lessonTitle: 'Geometria',
    sections: {
      intro: {
        title: 'Poznaj kształty',
        description: 'Zobacz najczęstsze kształty.',
      },
      practice: {
        title: 'Ćwiczenia',
        description: 'Nazwij kształt, który widzisz.',
      },
      draw: {
        title: 'Gra: Rysuj kształty',
        description: 'Narysuj koło, trójkąt, kwadrat, prostokąt, owal i romb.',
      },
      summary: {
        title: 'Podsumowanie',
        description: 'Najważniejsze wskazówki.',
      },
    },
    shapes: {
      circle: {
        label: 'Koło',
        clue: 'Okrągłe, bez rogów.',
      },
      square: {
        label: 'Kwadrat',
        clue: '4 równe boki.',
      },
      triangle: {
        label: 'Trójkąt',
        clue: '3 boki i 3 rogi.',
      },
      rectangle: {
        label: 'Prostokąt',
        clue: '2 długie i 2 krótkie boki.',
      },
      oval: {
        label: 'Owal',
        clue: 'Bez rogów, ale wydłużony.',
      },
      diamond: {
        label: 'Romb',
        clue: 'Wygląda jak przechylony kwadrat.',
      },
    },
    clues: {
      title: 'Wskazówki',
      lead: 'Użyj tych wskazówek, aby rozpoznać kształt:',
      chips: {
        corners: 'Rogi',
        sides: 'Boki',
        curves: 'Zaokrąglenia',
        longShortSides: 'Długie i krótkie boki',
      },
      inset: 'Najpierw policz rogi, potem porównaj długości boków.',
    },
    practice: {
      slideTitle: 'Wyzwanie kształtów',
      emptyRounds: 'Brak rund.',
      finished: {
        status: 'Koniec',
        title: 'Wynik: {score}/{total}',
        subtitle: 'Świetnie rozpoznajesz kształty!',
        restart: 'Zagraj ponownie',
      },
      progress: {
        round: 'Runda {current}/{total}',
        score: 'Wynik {score}',
      },
      question: 'Jaki to kształt?',
      feedback: {
        correct: 'Brawo!',
        incorrect: 'Prawie! To {shape}.',
      },
      actions: {
        next: 'Dalej',
        finish: 'Zakończ',
      },
    },
    intro: {
      title: 'Poznaj kształty',
      lead: 'Szukaj rogów, boków i zaokrągleń.',
    },
    summary: {
      title: 'Świetna robota!',
      status: 'Gotowe na więcej',
      lead: 'Teraz potrafisz nazwać kształty wokół siebie.',
      caption: 'Poszukaj kół, kwadratów, trójkątów, prostokątów, owali i rombów w domu.',
    },
    draw: {
      gameTitle: 'Gra: Rysuj kształty',
      difficultyLabel: 'Podstawowe',
      finishLabel: 'Wróć do tematów',
    },
  };

export const GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT: KangurGeometrySymmetryLessonTemplateContent =
  {
    kind: 'geometry_symmetry',
    lessonTitle: 'Symetria',
    sections: {
      intro: {
        title: 'Co to jest symetria?',
        description: 'Definicja i przykłady',
      },
      os: {
        title: 'Oś symetrii',
        description: 'Linia podziału figury',
      },
      figury: {
        title: 'Figury symetryczne',
        description: 'Które figury mają symetrię?',
      },
      podsumowanie: {
        title: 'Podsumowanie',
        description: 'Wszystko razem',
      },
      game: {
        title: 'Lustra symetrii',
        description: 'Narysuj oś i dorysuj odbicie',
      },
    },
    slides: {
      intro: {
        whatIsSymmetry: {
          title: 'Co to jest symetria?',
          lead: 'Figura jest symetryczna, gdy po złożeniu na pół obie strony pasują do siebie.',
          callout: 'Motyl jest prawie symetryczny.',
          note: 'Symetria to reguła: lewa strona = prawa strona (lub góra = dół).',
        },
        mirrorSymmetry: {
          title: 'Symetria lustrzana',
          lead: 'Oś działa jak lustro: prawa strona odbija lewą.',
          caption: 'Po złożeniu obie części są takie same.',
        },
      },
      os: {
        axisOfSymmetry: {
          title: 'Oś symetrii',
          lead: 'Oś symetrii to linia, po której dzielimy figurę na dwie pasujące części.',
          caption: 'Pionowa kreska to oś symetrii.',
          note: 'Figura może mieć więcej niż jedną oś symetrii!',
        },
        axisInPractice: {
          title: 'Oś w praktyce',
          lead: 'Linia osi pokazuje, gdzie figura się zgina.',
          caption: 'Oś dzieli figurę na dwie równe części.',
        },
      },
      figury: {
        symmetricShapes: {
          title: 'Które figury są symetryczne?',
          circleNote: 'Koło ma nieskończoną liczbę osi symetrii!',
          cards: {
            square: 'Kwadrat',
            rectangle: 'Prostokąt',
            circle: 'Koło',
            isoscelesTriangle: 'Trójkąt równoramienny',
            zigzag: 'Dowolny zygzak',
            irregularPolygon: 'Nieregularny wielokąt',
          },
        },
        symmetricOrNot: {
          title: 'Symetryczne czy nie?',
          caption: 'Symetryczne figury mają pasujące połówki.',
        },
        rotational: {
          title: 'Symetria obrotowa',
          caption: 'Obrót nie zmienia wyglądu figury.',
        },
      },
      podsumowanie: {
        overview: {
          title: 'Podsumowanie',
          items: {
            item1: 'Symetria oznacza, że dwie strony są takie same.',
            item2: 'Oś symetrii to linia dzieląca figurę na dwie pasujące części.',
            item3: 'Wiele figur ma więcej niż jedną oś symetrii.',
            item4: 'Koło ma nieskończoną liczbę osi symetrii.',
          },
        },
        axis: {
          title: 'Podsumowanie: oś symetrii',
          caption: 'Złóż figurę wzdłuż osi.',
        },
        manyAxes: {
          title: 'Podsumowanie: wiele osi',
          caption: 'Symetria to zgodność po obu stronach osi.',
        },
        mirror: {
          title: 'Podsumowanie: odbicie lustrzane',
          caption: 'Odbicie lustrzane po osi.',
        },
        rotation: {
          title: 'Podsumowanie: symetria obrotowa',
          caption: 'Symetria obrotowa.',
        },
      },
    },
    game: {
      gameTitle: 'Lustra symetrii',
    },
  };
