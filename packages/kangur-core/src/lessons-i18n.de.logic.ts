import type { KangurLessonComponentId } from '@kangur/contracts';

import type { KangurPortableLessonBody } from './lesson-content';

export const GERMAN_PORTABLE_LESSON_BODIES_LOGIC: Partial<Record<KangurLessonComponentId, KangurPortableLessonBody>> = {
  "logical_thinking": {
    "introduction": "Logisches Denken hilft dir, Informationen zu ordnen, Regeln zu finden und Schritt fuer Schritt Schlussfolgerungen zu ziehen. Es ist eine gemeinsame Grundlage fuer Raetsel, Mathematik und alltaegliches Problemlosen.",
    "sections": [
      {
        "id": "intro",
        "title": "Was logisches Denken ist",
        "description": "Es ist die Faehigkeit, nach Ordnung zu suchen und zu pruefen, ob eine Antwort wirklich aus den Angaben folgt und nicht nur aus Zufall.",
        "example": {
          "label": "Beispiel",
          "equation": "Wenn alle Katzen vier Beine haben und Minka eine Katze ist...",
          "explanation": "...dann kannst du schliessen, dass Minka vier Beine hat. Die Schlussfolgerung folgt aus den gegebenen Informationen."
        },
        "reminders": [
          "Suche nach der Regel, nicht nur nach einem einzelnen Beispiel.",
          "Eine gute Antwort sollte sich begruenden lassen."
        ]
      },
      {
        "id": "patterns",
        "title": "Muster und Folgen",
        "description": "Logisches Denken beginnt oft damit, eine Wiederholung oder eine konstante Veraenderung zu erkennen.",
        "example": {
          "label": "Beispiel",
          "equation": "2, 4, 6, 8, ?",
          "explanation": "Jeder Schritt erhoeht die Zahl um 2, also ist das naechste Element 10."
        },
        "reminders": [
          "Suche nach einer festen Differenz oder einer sich wiederholenden Gruppe von Elementen.",
          "Ein Muster kann Zahlen, Farben, Formen oder alles zusammen betreffen."
        ]
      },
      {
        "id": "classification",
        "title": "Klassifikation und Ausreisser",
        "description": "Manchmal musst du Elemente nach einer gemeinsamen Eigenschaft gruppieren, und manchmal das eine Element finden, das nicht passt.",
        "example": {
          "label": "Beispiel",
          "equation": "🍎 🍌 🥕 🍇",
          "explanation": "Der Ausreisser ist 🥕, weil die anderen Elemente Obst sind und dies ein Gemuese ist."
        },
        "reminders": [
          "Benenne zuerst die gemeinsame Eigenschaft der Gruppe.",
          "Das unpassende Element verletzt dieselbe Regel, die den Rest verbindet."
        ]
      },
      {
        "id": "reasoning",
        "title": "Wenn... dann...",
        "description": "Schlussfolgern bedeutet, bekannte Fakten zu verbinden und zu pruefen, was daraus folgt.",
        "example": {
          "label": "Beispiel",
          "equation": "Wenn eine Zahl gerade ist, ist sie durch 2 teilbar. Ist 6 gerade?",
          "explanation": "Ja. Weil 6 gerade ist, sagt die Regel, dass sie durch 2 teilbar ist."
        },
        "reminders": [
          "Bestimme zuerst die Bedingung und pruefe dann, ob sie auf den Fall passt.",
          "Rate nicht. Zeige, aus welchem Schritt die Antwort folgt."
        ]
      }
    ],
    "practiceNote": "Diese Lektionen bereiten auf die naechsten logischen Aufgaben vor. Auf mobile beginnen wir mit gemeinsamen Regeln und Beispielen, waehrend interaktivere Uebungen spaeter folgen."
  },
  "logical_patterns": {
    "introduction": "Muster und Folgen lehren dich, den naechsten Schritt aus einer Regel vorherzusagen. Das ist eine der wichtigsten Faehigkeiten in logischen und mathematischen Aufgaben.",
    "sections": [
      {
        "id": "visual-patterns",
        "title": "Farb- und Formmuster",
        "description": "Die einfachsten Muster beruhen auf einer wiederholten Gruppe von Symbolen, Farben oder Formen.",
        "example": {
          "label": "Beispiel",
          "equation": "🔴 🔵 🔴 🔵 🔴 ?",
          "explanation": "Das rot-blaue Muster wiederholt sich, also ist das fehlende Element 🔵."
        },
        "reminders": [
          "Finde den kleinsten Teil, der sich wiederholt.",
          "Pruefe, ob dieselbe Regel vom Anfang bis zum Ende gilt."
        ]
      },
      {
        "id": "arithmetic-sequences",
        "title": "Folgen mit fester Differenz",
        "description": "In arithmetischen Folgen veraendert sich jedes naechste Element um denselben Wert.",
        "example": {
          "label": "Beispiel",
          "equation": "5, 10, 15, 20, ?",
          "explanation": "Jeder Schritt addiert 5, also ist das naechste Element 25."
        },
        "reminders": [
          "Subtrahiere benachbarte Zahlen und pruefe, ob die Differenz gleich bleibt.",
          "Wenn die Differenz nicht passt, suche nach einer anderen Regelart."
        ]
      },
      {
        "id": "geometric-sequences",
        "title": "Folgen mit festem Verhaeltnis",
        "description": "Manche Folgen addieren nicht immer dieselbe Zahl, sondern multiplizieren jedes Mal mit demselben Wert.",
        "example": {
          "label": "Beispiel",
          "equation": "1, 2, 4, 8, 16, ?",
          "explanation": "Jedes Element ist doppelt so gross wie das vorige, also ist das naechste 32."
        },
        "reminders": [
          "Teile ein Glied durch das vorige und pruefe, ob sich das Verhaeltnis wiederholt.",
          "Schnelles Wachstum bedeutet oft Multiplikation und nicht Addition."
        ]
      },
      {
        "id": "strategy",
        "title": "Wie man die Regel sucht",
        "description": "Wenn das Muster nicht sofort klar ist, hilft eine kurze Checkliste besser als Raten.",
        "example": {
          "label": "Beispiel",
          "equation": "3, 6, 12, 24, ?",
          "explanation": "Pruefe zuerst Differenzen und dann Verhaeltnisse. Hier wird in jedem Schritt mit 2 multipliziert, also ist die Antwort 48."
        },
        "reminders": [
          "Pruefe zuerst Differenzen, dann Verhaeltnisse und erst danach Beziehungen mehrerer frueherer Elemente.",
          "Bestaetige die Regel an allen bekannten Elementen, nicht nur an den ersten beiden."
        ]
      }
    ],
    "practiceNote": "Der mobile Screen gibt dir bereits eine echte Einfuehrung in Muster und Folgen. Die naechsten Logikthemen koennen auf derselben Denkweise aufbauen."
  },
  "logical_classification": {
    "introduction": "Klassifikation bedeutet, Elemente nach einer gemeinsamen Eigenschaft zu gruppieren. Das ist eine der einfachsten und wichtigsten Methoden, Informationen zu ordnen.",
    "sections": [
      {
        "id": "intro",
        "title": "Was Klassifikation ist",
        "description": "Um richtig zu klassifizieren, musst du zuerst die Eigenschaft benennen, die die Elemente in einer Gruppe verbindet.",
        "example": {
          "label": "Beispiel",
          "equation": "🍎 🍌 🍇 🍓",
          "explanation": "Diese Elemente koennen zu einer Obstgruppe gehoeren, weil sie dieselbe Kategorie teilen."
        },
        "reminders": [
          "Du kannst nach Farbe, Form, Groesse, Kategorie oder einer Zahleneigenschaft gruppieren.",
          "Lege zuerst die Eigenschaft fest und bilde dann die Gruppen."
        ]
      },
      {
        "id": "many-features",
        "title": "Mehrere Eigenschaften zugleich",
        "description": "Manchmal reicht eine Eigenschaft nicht aus, und du musst gleichzeitig auf Farbe, Groesse oder eine weitere Eigenschaft achten.",
        "example": {
          "label": "Beispiel",
          "equation": "gross rot / gross blau / klein rot / klein blau",
          "explanation": "Hier entsteht jede Gruppe aus der Kombination zweier Eigenschaften: Groesse und Farbe."
        },
        "reminders": [
          "Jede zusaetzliche Eigenschaft vergroessert die Zahl moeglicher Gruppen.",
          "Beschreibe Gruppen genau, damit du keine Kriterien vermischst."
        ]
      },
      {
        "id": "intruder",
        "title": "Finde den Ausreisser",
        "description": "Aufgaben mit einem Ausreisser pruefen, ob du die Gruppenregel verstehst und auf das Element zeigen kannst, das sie bricht.",
        "example": {
          "label": "Beispiel",
          "equation": "2, 4, 7, 8, 10",
          "explanation": "Der Ausreisser ist 7, weil die anderen Zahlen gerade sind und 7 ungerade ist."
        },
        "reminders": [
          "Bestimme zuerst die gemeinsame Eigenschaft der meisten Elemente.",
          "Der Ausreisser passt nicht zur Regel, und du solltest erklaeren koennen, warum."
        ]
      },
      {
        "id": "venn",
        "title": "Venn-Diagramm und Zusammenfassung",
        "description": "Ein Venn-Diagramm zeigt, was zu einer Gruppe, zu einer anderen Gruppe oder zu beiden zugleich gehoert.",
        "example": {
          "label": "Beispiel",
          "equation": "Sport / Musik / beides",
          "explanation": "Die Ueberlappung zeigt die Elemente, die zu zwei Kategorien zugleich passen."
        },
        "reminders": [
          "Die Ueberlappung ist die Schnittmenge zweier Mengen.",
          "Klassifikation ordnet Informationen und erleichtert spaeteres Schlussfolgern."
        ]
      }
    ],
    "practiceNote": "Die mobile Version gibt dir bereits die ganze Denkspur fuer Klassifikationsaufgaben, auch wenn reichere Interaktionen noch auf der Web-Seite bleiben."
  },
  "logical_reasoning": {
    "introduction": "Logisches Schlussfolgern bedeutet, von bekannten Fakten zu neuen Ergebnissen zu gelangen. Statt zu raten, stuetzt du dich auf Regeln und pruefst, was daraus folgt.",
    "sections": [
      {
        "id": "intro",
        "title": "Was Schlussfolgern ist",
        "description": "Schlussfolgern kann von der allgemeinen Regel zum Einzelfall gehen oder von vielen Beobachtungen zu einer allgemeineren Vermutung.",
        "example": {
          "label": "Beispiel",
          "equation": "Alle Hunde bellen. Rex ist ein Hund.",
          "explanation": "Aus diesen beiden Informationen folgt, dass Rex bellt."
        },
        "reminders": [
          "Deduktion geht von einer allgemeinen Regel zu einem konkreten Fall.",
          "Eine gute Schlussfolgerung muss sich auf das stuetzen, was du wirklich weisst."
        ]
      },
      {
        "id": "if-then",
        "title": "Wenn... dann...",
        "description": "Bedingungssaetze verbinden eine Bedingung mit einer Folge und sind ein grundlegendes Werkzeug des logischen Denkens.",
        "example": {
          "label": "Beispiel",
          "equation": "Wenn eine Zahl gerade ist, ist sie durch 2 teilbar.",
          "explanation": "Weil 8 gerade ist, sagt die Regel, dass 8 durch 2 teilbar ist."
        },
        "reminders": [
          "Verwechsle eine Regel nicht mit ihrer Umkehrung.",
          "Pruefe zuerst, ob die Bedingung erfuellt ist."
        ]
      },
      {
        "id": "quantifiers",
        "title": "Alle, einige, keine",
        "description": "Quantoren zeigen, wie weit eine Aussage gilt und worauf du beim Ziehen von Schlussfolgerungen achten musst.",
        "example": {
          "label": "Beispiel",
          "equation": "Einige Katzen sind rot.",
          "explanation": "Das bedeutet nicht, dass jede Katze rot ist. Die Aussage betrifft nur einen Teil der Katzen."
        },
        "reminders": [
          "Alle bedeutet jeder Fall.",
          "Einige bedeutet nur ein Teil der Faelle.",
          "Keine bedeutet, dass es ueberhaupt keine Ausnahme gibt."
        ]
      },
      {
        "id": "puzzles",
        "title": "Raetsel Schritt fuer Schritt",
        "description": "Bei komplexeren Aufgaben musst du mehrere Hinweise verbinden, unmoegliche Optionen streichen und immer wieder pruefen, ob die Loesung noch passt.",
        "example": {
          "label": "Beispiel",
          "equation": "Es gibt drei Haeuser: rot, blau, gruen...",
          "explanation": "Ein Raetsel loest du, indem du sichere Fakten notierst und systematisch ausschliesst, was unmoeglich ist."
        },
        "reminders": [
          "Beginne mit direkten Fakten.",
          "Das Ausschliessen falscher Optionen fuehrt oft zur richtigen Antwort."
        ]
      }
    ],
    "practiceNote": "Dieses Thema bereitet dich auf schwierigere Logikraetsel vor. Auf mobile bringen wir zuerst die Denkweise selbst und die Struktur zum Loesen von Problemen mit."
  },
  "logical_analogies": {
    "introduction": "Eine Analogie bedeutet, dieselbe Beziehung in zwei verschiedenen Paaren zu finden. Es geht nicht um aeuessere Aehnlichkeit, sondern um dieselbe Art von Verbindung.",
    "sections": [
      {
        "id": "intro",
        "title": "Was eine Analogie ist",
        "description": "Bei einer Analogie fragst du: Welche Beziehung verbindet das erste Paar, und wie uebertrage ich sie auf das zweite Paar?",
        "example": {
          "label": "Beispiel",
          "equation": "Vogel : fliegen = Fisch : ?",
          "explanation": "Die Beziehung ist Lebewesen und Fortbewegungsart, also lautet die Antwort schwimmen."
        },
        "reminders": [
          "Benenne zuerst die Beziehung im ersten Paar.",
          "Suche erst danach das Element, das dieselbe Beziehung wiederherstellt."
        ]
      },
      {
        "id": "verbal",
        "title": "Wortanalogien",
        "description": "Wortanalogien koennen auf Gegensaetzen, Funktionen, Teil und Ganzem oder einer typischen Handlung beruhen.",
        "example": {
          "label": "Beispiel",
          "equation": "Schere : schneiden = Bleistift : ?",
          "explanation": "Das ist eine Werkzeug -> Funktion-Beziehung, also lautet die Antwort schreiben."
        },
        "reminders": [
          "Die Art der Beziehung ist wichtiger als die Woerter selbst.",
          "Gegensatz und Funktion sind zwei sehr haeufige Analogiearten."
        ]
      },
      {
        "id": "numbers-shapes",
        "title": "Zahlen- und Formanalogien",
        "description": "Bei Zahlen- oder Bildanalogien veraendert dieselbe Operation Zahlen, Richtungen, Farben oder die Anzahl der Elemente.",
        "example": {
          "label": "Beispiel",
          "equation": "2 : 4 = 5 : ?",
          "explanation": "Die Beziehung ist Multiplikation mit 2, also ist die fehlende Antwort 10."
        },
        "reminders": [
          "Bei Zahlen pruefst du Addition, Subtraktion, Multiplikation und Division.",
          "Bei Formen achtest du auf Drehung, Groesse, Farbe und Anzahl der Elemente."
        ]
      },
      {
        "id": "cause-whole",
        "title": "Teil-Ganzes und Ursache-Wirkung",
        "description": "Viele Analogien beruhen darauf, dass ein Element zu einem anderen gehoert oder etwas eine bestimmte Wirkung ausloest.",
        "example": {
          "label": "Beispiel",
          "equation": "Seite : Buch = Ziegel : ?",
          "explanation": "Das ist eine Teil -> Ganzes-Beziehung, also lautet die Antwort Mauer oder Gebaeude."
        },
        "reminders": [
          "Teil-Ganzes ist ein sehr haeufiges Muster in Analogieaufgaben.",
          "Ursache-Wirkung fragt danach, was ein bestimmtes Ergebnis ausloest."
        ]
      }
    ],
    "practiceNote": "Analogien lehren dich, eine Regel in einen neuen Kontext zu uebertragen. Das macht sie zu einer guten Bruecke zwischen einfachen Mustern und schwierigeren Schlussfolgerungen."
  }
};

