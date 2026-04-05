import type { KangurLessonComponentId } from '@kangur/contracts/kangur-lesson-constants';

import type { KangurPortableLessonBody } from './lesson-content';

export const GERMAN_PORTABLE_LESSON_BODIES_MATH: Partial<Record<KangurLessonComponentId, KangurPortableLessonBody>> = {
  "clock": {
    "introduction": "Die Uhrenlektion besteht aus drei Schritten: Stunden, Minuten und dem Zusammenspiel beider Zeiger. Auf mobile bringen wir diese Lernreihenfolge ohne die interaktive Uhrenuebung mit.",
    "sections": [
      {
        "id": "hours",
        "title": "Stunden und der kurze Zeiger",
        "description": "Lerne zuerst, nur den kurzen Zeiger zu lesen. Er zeigt die Stunde an.",
        "example": {
          "label": "Beispiel",
          "equation": "9:00",
          "explanation": "Wenn der kurze Zeiger auf 9 steht und du die Minuten ignorierst, liest du die volle Stunde neun Uhr ab."
        },
        "reminders": [
          "Der kurze Zeiger ist fuer die Stunden da.",
          "Bei vollen Stunden schaust du zuerst nur auf ihn."
        ]
      },
      {
        "id": "minutes",
        "title": "Minuten und der lange Zeiger",
        "description": "Der lange Zeiger zeigt die Minuten. Jede naechste Zahl auf dem Zifferblatt steht fuer weitere 5 Minuten.",
        "example": {
          "label": "Beispiel",
          "equation": "7 × 5 = 35 Minuten",
          "explanation": "Wenn der lange Zeiger auf 7 steht, liest du 35 Minuten."
        },
        "reminders": [
          "3 bedeutet 15 Minuten, 6 bedeutet 30 Minuten und 9 bedeutet 45 Minuten.",
          "Die Zahlen springen immer in 5-Minuten-Schritten."
        ]
      },
      {
        "id": "combined",
        "title": "Stunden und Minuten zusammen",
        "description": "Am Ende verbindest du die Stunde vom kurzen Zeiger mit den Minuten vom langen Zeiger.",
        "example": {
          "label": "Beispiel",
          "equation": "8:30",
          "explanation": "Der kurze Zeiger zeigt 8 und der lange 30 Minuten, also liest du 8:30."
        },
        "reminders": [
          "Lies zuerst die Stunde und dann die Minuten.",
          "5:15 ist Viertel nach 5 und 5:45 ist Viertel vor 6."
        ]
      }
    ],
    "practiceNote": "Die interaktive Uhrenuebung wird spaeter angeschlossen. In diesem Stadium bildet der mobile Screen aber schon die komplette Lernreihenfolge fuer die Uebung ab."
  },
  "calendar": {
    "introduction": "Ein Kalender hilft dabei, Zeit zu ordnen: Wochentage, Monate, Daten und Jahreszeiten. Auf mobile bringen wir die Hauptstruktur der Lektion ohne das interaktive Spiel mit.",
    "sections": [
      {
        "id": "intro",
        "title": "Was ein Kalender ist",
        "description": "Ein Kalender ist eine Art, Zeit in Tagen, Wochen, Monaten und Jahren aufzuschreiben und zu lesen.",
        "example": {
          "label": "Beispiel",
          "equation": "1 Woche = 7 Tage",
          "explanation": "Jede Woche hat dieselben 7 Tage, und Monate und Jahre ordnen sie zu einem groesseren Zeitplan."
        },
        "reminders": [
          "Ein Jahr hat 12 Monate.",
          "Eine Woche hat 7 Tage."
        ]
      },
      {
        "id": "days",
        "title": "Wochentage",
        "description": "Es hilft, die Reihenfolge der Tage zu kennen. So weisst du leichter, was gestern war, was heute ist und was morgen kommt.",
        "example": {
          "label": "Beispiel",
          "equation": "Montag -> Dienstag -> Mittwoch",
          "explanation": "Wenn heute Dienstag ist, dann war gestern Montag und morgen ist Mittwoch."
        },
        "reminders": [
          "Auf Freitag folgt Samstag, und auf Samstag folgt Sonntag.",
          "Samstag und Sonntag sind meistens das Wochenende."
        ]
      },
      {
        "id": "months",
        "title": "Monate und Jahreszeiten",
        "description": "Jeder Monat hat einen eigenen Namen und eine bestimmte Anzahl von Tagen. Monate lassen sich auch zu vier Jahreszeiten ordnen.",
        "example": {
          "label": "Beispiel",
          "equation": "Maerz, April, Mai = Fruehling",
          "explanation": "Monate lassen sich nicht nur nach Reihenfolge, sondern auch nach Jahreszeiten gruppieren. Das macht sie leichter merkbar."
        },
        "reminders": [
          "Die meisten Monate haben 30 oder 31 Tage.",
          "Der Februar hat normalerweise 28 Tage."
        ]
      },
      {
        "id": "date",
        "title": "Wie man ein Datum liest",
        "description": "Ein Datum schreibst du in der Reihenfolge Tag, Monat, Jahr. Es ist gut, es sowohl gesprochen als auch in Ziffern lesen zu koennen.",
        "example": {
          "label": "Beispiel",
          "equation": "15/03/2025",
          "explanation": "Du kannst es auch so lesen: der fuenfzehnte Maerz zweitausendfuenfundzwanzig."
        },
        "reminders": [
          "Lies zuerst den Tag, dann den Monat und am Ende das Jahr.",
          "Die Zahlenschreibweise und die gesprochene Form muessen dasselbe Datum meinen."
        ]
      }
    ],
    "practiceNote": "Das interaktive Kalenderspiel bleibt noch auf der Web-Seite. Auf mobile hast du aber schon den vollen Satz an Grundlagen fuer spaetere Uebung."
  },
  "adding": {
    "introduction": "Addition bedeutet, zwei Gruppen zusammenzufuehren, um zu sehen, wie viele es insgesamt sind. In der mobilen App bringen wir den echten Lektionstext schon mit, nur noch ohne Spiele.",
    "sections": [
      {
        "id": "basics",
        "title": "Grundlagen der Addition",
        "description": "Beginne mit dem einfachen Zusammenlegen von Gruppen. Eine gute Gewohnheit ist es, mit der groesseren Zahl zu starten und dann weiterzuzuzaehlen.",
        "example": {
          "label": "Beispiel",
          "equation": "2 + 3 = 5",
          "explanation": "Du hast 2 Aepfel, legst 3 dazu und siehst dann insgesamt 5."
        },
        "reminders": [
          "Addition beantwortet die Frage: Wie viel ist zusammen da?",
          "Bei kleinen Zahlen kannst du an den Fingern oder im Kopf zaehlen."
        ]
      },
      {
        "id": "cross-ten",
        "title": "Ueber 10 hinaus",
        "description": "Wenn die Summe ueber 10 geht, ist es am einfachsten, zuerst bis 10 zu ergaenzen und dann den Rest dazuzurechnen.",
        "example": {
          "label": "Beispiel",
          "equation": "7 + 5 = 12",
          "explanation": "Zuerst 7 + 3 = 10, dann addierst du die restlichen 2 und bekommst 12."
        },
        "reminders": [
          "Suche nach Paaren, die zusammen 10 ergeben.",
          "Teile die zweite Zahl in zwei Teile, wenn das die Rechnung leichter macht."
        ]
      },
      {
        "id": "two-digit",
        "title": "Zweistellige Addition",
        "description": "Bei zweistelligen Zahlen trennst du Zehner und Einer. Das ist eine stabile Methode statt zu raten.",
        "example": {
          "label": "Beispiel",
          "equation": "24 + 13 = 37",
          "explanation": "20 + 10 = 30 und 4 + 3 = 7. Am Ende verbindest du 30 und 7."
        },
        "reminders": [
          "Trenne Zehner von Einern.",
          "Fuehre die Teile am Ende zu einem Ergebnis zusammen."
        ]
      },
      {
        "id": "remember",
        "title": "Merke dir",
        "description": "Ein paar Regeln beschleunigen das Rechnen und helfen dir, Fehler in den naechsten Aufgaben zu vermeiden.",
        "reminders": [
          "Die Reihenfolge spielt keine Rolle: 3 + 5 = 5 + 3.",
          "Null veraendert nichts: 7 + 0 = 7.",
          "Wenn du ueber 10 gehst, ergaenze zuerst zum vollen Zehner."
        ]
      }
    ],
    "practiceNote": "Die interaktiven Additionsspiele bleiben vorerst noch auf der Web-Seite. Dieser mobile Screen bringt aber schon den Lernfluss und den Lektionstext mit."
  },
  "subtracting": {
    "introduction": "Subtraktion bedeutet, einen Teil aus einer Gruppe wegzunehmen und zu pruefen, wie viel uebrig bleibt. Die mobile Version enthaelt schon den Hauptteil der Lektion, aber noch nicht das Spiel.",
    "sections": [
      {
        "id": "basics",
        "title": "Grundlagen der Subtraktion",
        "description": "Beim Subtrahieren gehst du von der Startzahl rueckwaerts oder pruefst, wie viel bis zum Ergebnis fehlt.",
        "example": {
          "label": "Beispiel",
          "equation": "5 - 2 = 3",
          "explanation": "Du hast 5 Aepfel, nimmst 2 weg und es bleiben 3."
        },
        "reminders": [
          "Subtraktion beantwortet die Frage: Wie viel bleibt uebrig?",
          "Du kannst auf einer Zahlengeraden rueckwaerts zaehlen."
        ]
      },
      {
        "id": "cross-ten",
        "title": "Ueber 10 zurueck",
        "description": "Wenn du ueber 10 zurueckgehen musst, teile die abzuziehende Zahl in zwei Teile: erst bis 10, dann den Rest.",
        "example": {
          "label": "Beispiel",
          "equation": "13 - 5 = 8",
          "explanation": "Zuerst 13 - 3 = 10, danach 10 - 2 = 8."
        },
        "reminders": [
          "Teile die 5 in 3 und 2, wenn du so zuerst den vollen Zehner erreichst.",
          "Der Schritt bis 10 macht den zweiten Teil leichter."
        ]
      },
      {
        "id": "two-digit",
        "title": "Zweistellige Subtraktion",
        "description": "Genauso wie bei der Addition hilft es, Zehner und Einer getrennt zu betrachten.",
        "example": {
          "label": "Beispiel",
          "equation": "47 - 23 = 24",
          "explanation": "40 - 20 = 20 und 7 - 3 = 4. Am Ende verbindest du 20 und 4."
        },
        "reminders": [
          "Rechne zuerst die Zehner.",
          "Danach subtrahierst du die Einer und setzt das Ergebnis zusammen."
        ]
      },
      {
        "id": "remember",
        "title": "Merke dir",
        "description": "Bei der Subtraktion gibt es einige Regeln, die man leicht mit der Addition verwechselt. Deshalb lohnt sich bewusstes Ueben.",
        "reminders": [
          "Subtraktion ist nicht vertauschbar: 7 - 3 ist nicht dasselbe wie 3 - 7.",
          "Null wegnehmen veraendert nichts: 8 - 0 = 8.",
          "Du kannst das Ergebnis mit Addition pruefen: 5 + 3 = 8, also 8 - 3 = 5."
        ]
      }
    ],
    "practiceNote": "Das Subtraktionsspiel wird spaeter angeschlossen. In diesem Stadium gibt der mobile Screen aber schon die richtige Folge von Erklaerungen und Beispielen."
  },
  "multiplication": {
    "introduction": "Multiplikation ist eine schnellere Schreibweise fuer wiederholte Addition. In der mobilen Version bringen wir zuerst den Sinn der Operation, die wichtigsten Reihen des Einmaleins und die noetigen Tricks vor der Uebung mit.",
    "sections": [
      {
        "id": "intro",
        "title": "Was Multiplizieren bedeutet",
        "description": "Multiplikation zeigt, wie viel insgesamt da ist, wenn mehrere Gruppen gleich viele Elemente enthalten.",
        "example": {
          "label": "Beispiel",
          "equation": "3 × 4 = 12",
          "explanation": "Du hast 3 Gruppen mit je 4 Elementen, also 4 + 4 + 4. Zusammen ergibt das 12."
        },
        "reminders": [
          "Multiplikation ist die Kurzform fuer das wiederholte Addieren derselben Zahl.",
          "Die erste Zahl kann die Anzahl der Gruppen bedeuten, die zweite die Anzahl der Elemente pro Gruppe."
        ]
      },
      {
        "id": "table-23",
        "title": "Einmaleins × 2 und × 3",
        "description": "Uebe zuerst die einfachsten Reihen. Diese beiden tauchen in spaeteren Aufgaben sehr oft wieder auf.",
        "example": {
          "label": "Beispiel",
          "equation": "6 × 2 = 12 und 5 × 3 = 15",
          "explanation": "Bei × 2 verdoppelst du die Zahl, und bei × 3 addierst du dieselbe Zahl dreimal."
        },
        "reminders": [
          "Mit 2 multiplizieren heisst verdoppeln.",
          "Bei × 3 kannst du erst verdoppeln und dann noch eine gleiche Gruppe addieren."
        ]
      },
      {
        "id": "table-45",
        "title": "Einmaleins × 4 und × 5",
        "description": "Es hilft, × 4 und × 5 mit einfachen Beobachtungen ueber gerade Zahlen und Endziffern zu verbinden.",
        "example": {
          "label": "Beispiel",
          "equation": "7 × 5 = 35",
          "explanation": "Ergebnisse von × 5 enden auf 0 oder 5, und 4 × eine Zahl bedeutet doppeln und noch einmal doppeln."
        },
        "reminders": [
          "Mit 4 multiplizieren sind zwei Verdopplungen hintereinander.",
          "Mit 5 multiplizieren fuehrt zu Ergebnissen mit 0 oder 5 am Ende."
        ]
      },
      {
        "id": "remember",
        "title": "Merke dir",
        "description": "Ein paar Regeln machen die Multiplikation schneller und helfen dir zu pruefen, ob ein Ergebnis sinnvoll ist.",
        "reminders": [
          "Mit 1 multiplizieren laesst die Zahl unveraendert.",
          "Mit 10 multiplizieren haengt eine Null an.",
          "Die Reihenfolge spielt keine Rolle: 3 × 4 = 4 × 3."
        ]
      }
    ],
    "practiceNote": "Zu diesem Thema gibt es bereits das erste mobile Training. Nach der Lektion kannst du direkt in die Multiplikationsuebung wechseln."
  },
  "division": {
    "introduction": "Division bedeutet gleichmaessiges Verteilen in Gruppen. In der mobilen Version bringen wir zuerst den Hauptteil der Lektion mit: den Sinn der Division, die Verbindung zur Multiplikation und den Rest.",
    "sections": [
      {
        "id": "intro",
        "title": "Was Dividieren bedeutet",
        "description": "Bei der Division fragst du, wie viele Elemente in jede Gruppe kommen, wenn die Aufteilung gleich sein soll.",
        "example": {
          "label": "Beispiel",
          "equation": "6 ÷ 2 = 3",
          "explanation": "Du hast 6 Kekse und teilst sie gleichmaessig auf 2 Personen auf, also bekommt jede 3."
        },
        "reminders": [
          "Division bedeutet gleichmaessiges Verteilen.",
          "Das Ergebnis sagt dir, wie viele Elemente in eine Gruppe kommen."
        ]
      },
      {
        "id": "inverse",
        "title": "Division und Multiplikation",
        "description": "Multiplikation und Division sind Umkehroperationen. Deshalb hilft das Einmaleins sehr beim Dividieren.",
        "example": {
          "label": "Beispiel",
          "equation": "12 ÷ 4 = 3",
          "explanation": "Weil 4 × 3 = 12 gilt, muss 12 ÷ 4 gleich 3 sein."
        },
        "reminders": [
          "Wenn du 4 × 3 = 12 kennst, kennst du auch 12 ÷ 4 = 3 und 12 ÷ 3 = 4.",
          "Bei schwierigeren Divisionen erinnere dich zuerst an die passende Multiplikation."
        ]
      },
      {
        "id": "remainder",
        "title": "Rest bei der Division",
        "description": "Nicht jede Division geht ohne Rest auf. Dann bleiben einige Elemente ausserhalb der gleich grossen Gruppen uebrig.",
        "example": {
          "label": "Beispiel",
          "equation": "7 ÷ 2 = 3 Rest 1",
          "explanation": "Du kannst 2 Gruppen je 3 geben, und 1 Element bleibt uebrig."
        },
        "reminders": [
          "Der Rest ist immer kleiner als der Divisor.",
          "Pruefe das Ergebnis: Quotient × Divisor + Rest = Ausgangszahl."
        ]
      },
      {
        "id": "remember",
        "title": "Merke dir",
        "description": "Ein paar einfache Regeln helfen dir schnell zu pruefen, ob ein Divisionsergebnis sinnvoll ist.",
        "reminders": [
          "Jede Zahl geteilt durch 1 bleibt gleich.",
          "Eine Zahl geteilt durch sich selbst ergibt 1.",
          "Null geteilt durch eine von null verschiedene Zahl ergibt 0."
        ]
      }
    ],
    "practiceNote": "Das Divisionsspiel bleibt noch auf der Web-Seite. Der mobile Screen gibt dir aber schon das vollstaendige Lern-Geruest vor der Uebung."
  },
  "geometry_basics": {
    "introduction": "Die Grundlagen der Geometrie lehren dich, Figuren als Kombination von Punkten, Strecken, Seiten und Winkeln zu sehen. In der mobilen App bringen wir die wichtigsten Begriffe und Beobachtungen vor interaktiveren Uebungen mit.",
    "sections": [
      {
        "id": "intro",
        "title": "Womit sich Geometrie beschaeftigt",
        "description": "Geometrie beschreibt Formen, Lage und Groesse. Statt nur ein Ergebnis zu berechnen, schaust du darauf, wie eine Figur aufgebaut ist und aus welchen Elementen sie besteht.",
        "example": {
          "label": "Beispiel",
          "equation": "Punkt A, Strecke AB, Dreieck ABC",
          "explanation": "Das sind drei verschiedene geometrische Objekte: ein einzelner Punkt, ein Teil einer Linie und eine ganze Figur aus mehreren Elementen."
        },
        "reminders": [
          "Geometrie hilft dir, Figuren zu benennen und zu vergleichen.",
          "Eine Figur kann aus mehreren einfacheren Elementen bestehen."
        ]
      },
      {
        "id": "point-line-segment",
        "title": "Punkt, Gerade und Strecke",
        "description": "Ein Punkt markiert eine genaue Stelle. Eine Gerade kann in beide Richtungen unbegrenzt weiterlaufen, waehrend eine Strecke zwei Enden hat und gemessen werden kann.",
        "example": {
          "label": "Beispiel",
          "equation": "A •      A-----B",
          "explanation": "Punkt A zeigt nur einen Ort, waehrend die Strecke AB einen Anfang, ein Ende und eine konkrete Laenge hat."
        },
        "reminders": [
          "Ein Punkt hat keine Laenge und keine Breite.",
          "Eine Strecke ist der Teil einer Geraden zwischen zwei Punkten."
        ]
      },
      {
        "id": "sides-angles",
        "title": "Seiten und Winkel",
        "description": "Eine Seite ist ein gerader Teil einer Figur, und ein Winkel entsteht dort, wo zwei Seiten zusammenkommen. Damit kannst du beschreiben, wie eine Figur gebaut ist.",
        "example": {
          "label": "Beispiel",
          "equation": "Ein Dreieck hat 3 Seiten und 3 Winkel",
          "explanation": "Jede Ecke des Dreiecks bildet einen Winkel, und die Strecken zwischen den Ecken sind die Seiten."
        },
        "reminders": [
          "Die Anzahl der Seiten hilft oft beim Erkennen einer Figur.",
          "Winkel zeigen, wie die Seiten zueinander stehen."
        ]
      },
      {
        "id": "remember",
        "title": "Merke dir",
        "description": "Diese Grundideen kommen in fast jeder spaeteren Geometriestunde wieder vor, deshalb lohnt es sich, sie frueh zu festigen.",
        "reminders": [
          "Ein Punkt markiert eine Stelle.",
          "Eine Strecke hat zwei Enden und kann gemessen werden.",
          "Seiten und Winkel helfen dir, eine Figur zu beschreiben."
        ]
      }
    ],
    "practiceNote": "Interaktivere Geometrie-Workshops bleiben noch auf der Web-Seite. Auf mobile hast du aber schon den Wortschatz und die Reihenfolge der Ideen fuer die weitere Uebung."
  },
  "geometry_shapes": {
    "introduction": "Geometrische Formen unterscheiden sich durch die Anzahl ihrer Seiten, die Anzahl ihrer Winkel und dadurch, ob ihre Raender gerade oder rund sind. Diese Lektion ordnet die wichtigsten Formen und ihre Merkmale.",
    "sections": [
      {
        "id": "basic-shapes",
        "title": "Hauefige Formen",
        "description": "Zu Beginn solltest du die wichtigsten Formen erkennen: Dreieck, Quadrat, Rechteck und Kreis. Jede davon hat gut sichtbare Merkmale.",
        "example": {
          "label": "Beispiel",
          "equation": "Dreieck / Quadrat / Rechteck / Kreis",
          "explanation": "Ein Dreieck hat 3 Seiten, Quadrat und Rechteck haben 4 Seiten, und ein Kreis hat weder Seiten noch Ecken."
        },
        "reminders": [
          "Zaehle zuerst die Seiten oder erkenne, dass die Figur rund ist.",
          "Ecken helfen dir, Figuren mit geraden Raendern zu unterscheiden."
        ]
      },
      {
        "id": "quadrilaterals",
        "title": "Quadrat und Rechteck",
        "description": "Quadrat und Rechteck gehoeren beide zur Familie der Vierecke, sind aber nicht identisch. Beide haben vier rechte Winkel, doch beim Quadrat sind alle Seiten gleich lang.",
        "example": {
          "label": "Beispiel",
          "equation": "Quadrat: 4 gleich lange Seiten / Rechteck: 2 Paare gleich langer Seiten",
          "explanation": "Wenn alle Seiten gleich lang sind, ist es ein Quadrat. Wenn nur gegenueberliegende Seiten gleich lang sind, ist es ein Rechteck."
        },
        "reminders": [
          "Ein Quadrat ist eine besondere Art von Rechteck.",
          "Seitenlaengen helfen dir, aehnliche Figuren zu unterscheiden."
        ]
      },
      {
        "id": "curved-shapes",
        "title": "Kreis, Oval und andere Formen",
        "description": "Nicht jede Figur hat gerade Raender. Kreis und Oval erkennst du an der glatten Linie, und eine Raute an ihren vier Seiten und der schraegen Form.",
        "example": {
          "label": "Beispiel",
          "equation": "Kreis ≠ Oval",
          "explanation": "Ein Kreis ist in jede Richtung gleich, waehrend ein Oval laenger gezogen ist. Beide Figuren haben keine Ecken."
        },
        "reminders": [
          "Keine Ecken ist ein wichtiges Merkmal bei Kreis und Oval.",
          "Eine Raute hat 4 gleich lange Seiten, aber keine rechten Winkel noetig."
        ]
      },
      {
        "id": "remember",
        "title": "Merke dir",
        "description": "Beim Erkennen von Formen ist es am besten, mehrere Merkmale gleichzeitig zu vergleichen statt nur auf den Namen oder den ersten Eindruck zu schauen.",
        "reminders": [
          "Zaehle Seiten und Ecken.",
          "Pruefe, ob Seiten gleich lang sind und ob rechte Winkel vorkommen.",
          "Achte darauf, ob die Figur gerade oder runde Raender hat."
        ]
      }
    ],
    "practiceNote": "Das Zeichenspiel fuer Formen bleibt noch auf der Web-Seite. Die mobile Lektion gibt dir aber schon die Struktur zum Erkennen und Vergleichen von Formen."
  },
  "geometry_symmetry": {
    "introduction": "Symmetrie hilft dir zu erkennen, wann eine Figur aus zwei passenden Haelften besteht. Das ist wichtig, wenn du Formen betrachtest und wenn du sie selbst zeichnest.",
    "sections": [
      {
        "id": "intro",
        "title": "Was Symmetrie ist",
        "description": "Eine Figur ist symmetrisch, wenn du sie so teilen kannst, dass eine Haelfte zur anderen wie ein Spiegelbild passt.",
        "example": {
          "label": "Beispiel",
          "equation": "🦋",
          "explanation": "Die Schmetterlingsfluegel links und rechts sehen aehnlich aus, deshalb ist die Symmetrie leicht zu erkennen."
        },
        "reminders": [
          "Symmetrie bedeutet nicht, dass alles von jeder Seite gleich aussieht.",
          "Du suchst zwei Haelften, die nach Falten oder Spiegeln zusammenpassen."
        ]
      },
      {
        "id": "axis",
        "title": "Symmetrieachse",
        "description": "Eine Symmetrieachse teilt eine Figur in zwei passende Teile. Manchmal ist sie senkrecht, manchmal waagerecht und manchmal diagonal.",
        "example": {
          "label": "Beispiel",
          "equation": "Quadrat: 4 Symmetrieachsen",
          "explanation": "Ein Quadrat hat eine senkrechte, eine waagerechte und zwei diagonale Achsen, weil jede davon die Figur in passende Haelften teilt."
        },
        "reminders": [
          "Nicht jede Figur hat nur eine Symmetrieachse.",
          "Wenn die Haelften nach dem Falten nicht passen, ist die Linie keine Symmetrieachse."
        ]
      },
      {
        "id": "mirror",
        "title": "Spiegelung",
        "description": "Bei einer Spiegelung hat jeder Punkt auf der einen Seite der Achse einen passenden Punkt auf der anderen Seite im gleichen Abstand.",
        "example": {
          "label": "Beispiel",
          "equation": "● | ●",
          "explanation": "Zwei Punkte auf beiden Seiten der Achse sind symmetrisch, wenn ihr Abstand zur Spiegelachse gleich ist."
        },
        "reminders": [
          "Eine Spiegelung verschiebt die Figur nicht zufaellig, sondern kippt sie an der Achse um.",
          "Der Abstand zur Achse muss auf beiden Seiten gleich sein."
        ]
      },
      {
        "id": "remember",
        "title": "Merke dir",
        "description": "Am besten pruefst du Symmetrie, indem du eine moegliche Achse suchst und passende Punkte oder Seiten vergleichst.",
        "reminders": [
          "Markiere zuerst eine moegliche Symmetrieachse.",
          "Vergleiche dann die linke und rechte oder obere und untere Haelfte.",
          "Wenn eine Seite nicht passt, gibt es keine Symmetrie zu dieser Achse."
        ]
      }
    ],
    "practiceNote": "Interaktive Spiegelaufgaben bleiben noch auf der Web-Seite. Auf mobile kannst du aber schon die Denkweise zum Finden von Symmetrieachsen ueben."
  },
  "geometry_perimeter": {
    "introduction": "Der Umfang ist die gesamte Strecke rund um eine Figur. Diese Lektion zeigt dir, wie du Seitenlaengen Schritt fuer Schritt addierst und pruefst, ob das Ergebnis sinnvoll ist.",
    "sections": [
      {
        "id": "intro",
        "title": "Was Umfang ist",
        "description": "Den Umfang einer Figur bekommst du, indem du die Laengen aller Seiten addierst. Das ist so, als wuerdest du einmal ganz um die Figur herumgehen und die ganze Strecke messen.",
        "example": {
          "label": "Beispiel",
          "equation": "3 cm + 2 cm + 3 cm + 2 cm = 10 cm",
          "explanation": "Du addierst jede Seite des Rechtecks und erhaeltst die gesamte Randlaenge der Figur."
        },
        "reminders": [
          "Der Umfang ist die Summe aller Seiten.",
          "Das Ergebnis sollte dieselbe Einheit wie die Seitenlaengen haben."
        ]
      },
      {
        "id": "rectangles",
        "title": "Rechtecke und Quadrate",
        "description": "Beim Rechteck sind gegenueberliegende Seiten gleich lang, beim Quadrat sind alle Seiten gleich lang. Das macht das Addieren einfacher planbar.",
        "example": {
          "label": "Beispiel",
          "equation": "Quadrat 4 cm + 4 cm + 4 cm + 4 cm = 16 cm",
          "explanation": "Wenn alle Seiten gleich lang sind, kannst du dieselbe Zahl wiederholen, statt jedes Mal einen neuen Wert zu suchen."
        },
        "reminders": [
          "Ein Rechteck hat oft zwei Paare gleich langer Seiten.",
          "Ein Quadrat hat auf allen vier Seiten dieselbe Laenge."
        ]
      },
      {
        "id": "step-by-step",
        "title": "Schritt fuer Schritt rechnen",
        "description": "Am sichersten ist es, alle Seitenlaengen in der richtigen Reihenfolge aufzuschreiben und erst danach zu addieren. So sinkt das Risiko, eine Seite zu vergessen.",
        "example": {
          "label": "Beispiel",
          "equation": "5 cm + 1 cm + 2 cm + 1 cm + 5 cm + 2 cm",
          "explanation": "Bei einer komplexeren Figur gehst du den Rand Seite fuer Seite ab, bis du wieder am Startpunkt ankommst."
        },
        "reminders": [
          "Lass keine Seite aus.",
          "Beginne an einer Stelle und gehe in einer festen Richtung um die Figur herum."
        ]
      },
      {
        "id": "remember",
        "title": "Merke dir",
        "description": "Der Umfang ist leicht zu berechnen, wenn du jede Seite genau einmal beachtest und auf die Einheiten achtest.",
        "reminders": [
          "Addiere jede Seite genau einmal.",
          "Pruefe, ob das Ergebnis die richtige Einheit hat.",
          "Bei Figuren mit gleichen Seiten kannst du die wiederholte Laenge nutzen."
        ]
      }
    ],
    "practiceNote": "Die mobile Lektion ordnet bereits den Weg zum Rechnen des Umfangs, aber reichere Zeichenaufgaben bleiben noch auf der Web-Seite."
  }
};

