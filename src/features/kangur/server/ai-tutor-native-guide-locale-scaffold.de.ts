import { action, type GuideEntryOverlay } from './ai-tutor-native-guide-locale-scaffold.shared';

export const GERMAN_KANGUR_AI_TUTOR_NATIVE_GUIDE_COPY: Record<string, GuideEntryOverlay> = {
    'auth-overview': {
      title: 'Anmelde- und Kontoerstellungsseite',
      shortDescription:
        'Diese gemeinsame Einstiegsseite erlaubt dem Lernenden die Anmeldung und dem Elternteil die Anmeldung oder Kontoerstellung.',
      fullDescription:
        'Diese Seite deckt zwei Wege ab: Der Lernende meldet sich mit Nickname und Passwort an, waehrend sich das Elternteil mit E-Mail und Passwort anmeldet oder ein neues Konto erstellt. Der Tutor sollte erklaeren, welcher Weg gerade aktiv ist und wann zwischen Anmeldung und Kontoerstellung gewechselt werden muss.',
      hints: [
        'Pruefe zuerst, ob sich der Lernende oder das Elternteil anmelden moechte.',
        'Wenn das Elternteil noch kein Konto hat, wechsle zur Kontoerstellung statt ein Passwort zu erraten.',
        'Wenn bereits ein Konto vorhanden ist, stelle sicher, dass das Formular im Anmeldemodus ist.',
      ],
      triggerPhrases: ['anmeldeseite', 'wie funktioniert die anmeldung', 'wie erstelle ich ein elternkonto', 'was kann ich hier tun'],
    },
    'auth-login-form': {
      title: 'Kangur-Anmeldeformular',
      shortDescription:
        'Dieses Formular sammelt die Daten, die der Lernende oder das Elternteil fuer den Zugang zur App braucht.',
      fullDescription:
        'Das Anmeldeformular wechselt zwischen normaler Anmeldung und der Erstellung eines Elternkontos. Je nach Modus zeigt es andere Felder und Aktionen, deshalb sollte der Tutor nicht nur erklaeren, wo etwas eingetragen wird, sondern auch welcher Modus gerade aktiv ist.',
      hints: [
        'Wenn das Formular Felder fuer die Kontoerstellung zeigt, sollte das Elternteil E-Mail und ein neues Passwort eingeben statt Lernerdaten.',
        'Wenn sich der Lernende mit einem Nickname anmeldet, muss dieser exakt ohne Leerzeichen eingetragen werden.',
        'Wenn ein Fehler erscheint, pruefe, ob das Formular im richtigen Modus ist: Anmeldung oder Kontoerstellung.',
      ],
      triggerPhrases: ['anmeldeformular', 'login-bereich', 'wie fuelle ich dieses formular aus', 'was bedeutet dieses formular'],
    },
    'auth-login-identifier-field': {
      title: 'Feld fuer die Anmeldekennung',
      shortDescription:
        'Dieses Feld erwartet je nach Person die E-Mail des Elternteils oder den Nickname des Lernenden.',
      fullDescription:
        'Das Kennungsfeld ist der erste Schritt der Anmeldung. Fuer das Elternteil erwartet es eine E-Mail-Adresse, fuer den Lernenden einen Nickname. Der Tutor sollte helfen, diese beiden Faelle zu unterscheiden und daran erinnern, dass die richtige Kennungsart wichtig ist.',
      hints: [
        'Das Elternteil gibt eine vollstaendige E-Mail-Adresse mit @ ein.',
        'Der Lernende gibt den Nickname genau so ein, wie er in Kangur erstellt wurde.',
        'Fuege am Anfang oder Ende keine Leerzeichen oder Zusatzzeichen hinzu.',
      ],
      triggerPhrases: ['anmeldefeld', 'was trage ich hier ein', 'e-mail oder nickname', 'anmeldekennung'],
    },
    'auth-create-account-action': {
      title: 'Aktion zum Konto erstellen',
      shortDescription:
        'Diese Schaltflaeche fuehrt das Elternteil zur Kontoerstellung statt zur normalen Anmeldung.',
      fullDescription:
        'Diese Aktion ist fuer ein Elternteil gedacht, das noch keine Zugangsdaten hat. Nach dem Klick wechselt das Formular zur Registrierung und fuehrt durch die Kontoerstellung und die Bestaetigung der E-Mail-Adresse.',
      hints: [
        'Nutze diese Aktion, wenn das Elternteil zum ersten Mal einsteigt und noch kein Passwort hat.',
        'Nach der Kontoerstellung ist meist eine E-Mail-Bestaetigung noetig, bevor die Anmeldung funktioniert.',
        'Pruefe das Postfach, wenn die Bestaetigung nicht sofort erscheint.',
      ],
      triggerPhrases: ['konto erstellen', 'wie erstelle ich ein konto', 'warum diese schaltflaeche', 'elternkonto erstellen'],
    },
    'auth-login-action': {
      title: 'Anmeldeaktion',
      shortDescription:
        'Diese Schaltflaeche oeffnet den Zugang zu einem bestehenden Lernenden- oder Elternkonto.',
      fullDescription:
        'Die Anmeldeaktion ist fuer Personen gedacht, die bereits Zugangsdaten haben. Der Tutor sollte erklaeren, dass dies der richtige Weg fuer ein bestehendes Konto ist und nicht fuer ein Elternteil, das den ersten Zugang erst erstellt.',
      hints: [
        'Waehle Anmeldung, wenn das Konto bereits existiert und nur die Daten eingegeben werden muessen.',
        'Wenn das Elternteil noch kein Konto hat, nutze stattdessen die Aktion zur Kontoerstellung.',
        'Wenn das Formular noch Registrierungsfelder zeigt, schalte zur Anmeldung zurueck.',
      ],
      triggerPhrases: ['anmelden', 'wie komme ich in mein konto', 'warum diese anmeldeschaltflaeche', 'ich habe schon ein konto'],
    },
    'lesson-overview': {
      title: 'Lektionsbildschirm',
      shortDescription: 'Hier arbeitet sich der Lernende Schritt fuer Schritt durch ein Thema.',
      fullDescription:
        'Der Lektionsbildschirm fuehrt den Lernenden durch ein Mathematik- oder Logikthema. Hier sollte das Thema zuerst verstanden werden, bevor es in schnelles Training oder einen Test geht.',
      hints: [
        'Lies zuerst Titel und Beschreibung der Lektion.',
        'Gehe das Material der Reihe nach durch, statt zwischen Bloecken zu springen.',
        'Wechsle erst dann zur Uebung, wenn die Grundidee klar ist.',
      ],
      relatedGames: ['Schnelles Training', 'Wiederholung nach der Lektion'],
      relatedTests: ['Test nach der Lektion'],
      followUpActions: [
        action('lesson-open-library', 'Lektionen oeffnen', 'Lessons'),
        action('lesson-open-training', 'Zum Spiel gehen', 'Game'),
      ],
      triggerPhrases: ['lektionsbildschirm', 'was kann ich hier tun', 'wie funktioniert diese lektion', 'wofuer ist diese lektion'],
    },
    'lesson-document': {
      title: 'Hauptinhalt der Lektion',
      shortDescription: 'Das ist das Kernmaterial mit Erklaerungen, Bildern und Beispielen.',
      fullDescription:
        'Der Hauptinhalt der Lektion erklaert das Thema mit Beispielen, Abbildungen und Loesungsschritten. Er sollte in Ruhe gelesen werden, bevor der Lernende zu schnelleren Antworten in Spiel oder Test wechselt.',
      hints: [
        'Lies immer nur einen Block und halte nach jedem Beispiel kurz an.',
        'Wenn es eine Zeichnung gibt, verbinde sie mit dem Text daneben.',
        'Versuche nach jedem Abschnitt, die Idee mit eigenen Worten zu erklaeren.',
      ],
      followUpActions: [action('lesson-document-open', 'Weiterlesen', 'Lessons')],
      triggerPhrases: ['hauptinhalt', 'unterrichtsmaterial', 'erklaere diesen abschnitt', 'lektionsdokument'],
    },
    'lesson-library': {
      title: 'Lektionsbibliothek',
      shortDescription: 'Das ist die Themenliste, in der die naechste Lektion gewaehlt wird.',
      fullDescription:
        'Die Lektionsbibliothek sammelt aktive Themen und zeigt, welche gerade am wichtigsten sind. Die Karten helfen dem Lernenden oder dem Elternteil, einen sinnvollen Startpunkt zu waehlen statt zufaellig zu entscheiden.',
      hints: [
        'Beginne mit dem Thema mit der hoechsten Prioritaet oder der schwaechsten Beherrschung.',
        'Waehle eine Lektion, die zu dem passt, was zuletzt geuebt wurde.',
      ],
      followUpActions: [action('lesson-library-open', 'Thema waehlen', 'Lessons')],
      triggerPhrases: ['lektionsbibliothek', 'lektionsliste', 'welche lektion soll ich waehlen', 'lektionskarten'],
    },
    'lesson-empty-state': {
      title: 'Kein Lektionsinhalt verfuegbar',
      shortDescription:
        'Diese Meldung bedeutet, dass an dieser Stelle noch kein aktiver Lektionsinhalt verfuegbar ist.',
      fullDescription:
        'Der leere Lektionszustand bedeutet nicht, dass der Lernende etwas falsch gemacht hat. Er zeigt nur, dass es hier noch keine aktiven Lektionen gibt oder das Dokument noch nicht gespeichert wurde. Der beste naechste Schritt ist dann die Rueckkehr zur Liste oder zu einer anderen Aktivitaet.',
      hints: [
        'Pruefe, ob in der Lektionsliste andere aktive Themen vorhanden sind.',
        'Wenn das Dokument leer ist, gehe zu einer anderen Lektion oder zu einer Uebungsrunde zurueck.',
      ],
      followUpActions: [
        action('lesson-empty-state-open-list', 'Zur Liste zurueck', 'Lessons'),
        action('lesson-empty-state-open-game', 'Zum Spiel gehen', 'Game'),
      ],
      triggerPhrases: ['leere lektion', 'kein lektionsinhalt', 'warum ist hier nichts', 'keine aktiven lektionen'],
    },
    'lesson-navigation': {
      title: 'Lektionsnavigation',
      shortDescription:
        'Dieser Bereich hilft beim Wechsel zur vorherigen oder naechsten Lektion ohne Rueckkehr zur Gesamtliste.',
      fullDescription:
        'Die Lektionsnavigation steuert die Bewegung durch das Material. Sie hilft dabei zu entscheiden, ob der Lernende weitergehen oder noch etwas beim aktuellen Thema bleiben sollte.',
      hints: [
        'Gehe erst weiter, wenn die aktuelle Lektion schon recht klar ist.',
        'Wenn das Thema noch unsicher ist, bleibe bei dieser Lektion oder kehre zum Dokument zurueck.',
      ],
      followUpActions: [action('lesson-navigation-open', 'Lektionen durchsuchen', 'Lessons')],
      triggerPhrases: ['lektionsnavigation', 'vorherige lektion', 'naechste lektion', 'wie gehe ich weiter'],
    },
    'shared-progress': {
      title: 'Fortschritt',
      shortDescription: 'Der Fortschritt zeigt, wie regelmaessig und wie wirksam der Lernende arbeitet.',
      fullDescription:
        'Der Fortschrittsbereich verbindet Regelmaessigkeit, Genauigkeit, Tempo und verdiente Punkte. Sein Hauptwert liegt nicht nur in der Punktzahl, sondern darin, ob der Lernende zum Material zurueckkehrt und einen stabilen Rhythmus aufbaut.',
      hints: [
        'Achte nicht nur auf Punkte, sondern auch auf Regelmaessigkeit.',
        'Wenn der Fortschritt langsamer wird, waehle lieber eine kurze Wiederholung als eine zufaellige neue Aktivitaet.',
        'Kurze regelmaessige Sitzungen bringen oft stabileren Fortschritt als ein einzelner langer Versuch.',
      ],
      followUpActions: [
        action('progress-profile', 'Profil oeffnen', 'LearnerProfile'),
        action('progress-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
      ],
      triggerPhrases: ['fortschritt', 'wie laeuft es', 'was zeigt der fortschritt', 'fortschrittswerte'],
    },
    'shared-leaderboard': {
      title: 'Bestenliste',
      shortDescription: 'Die Bestenliste zeigt Platzierungen und Ergebnisse im Vergleich mit anderen Versuchen.',
      fullDescription:
        'Die Bestenliste kann leicht motivieren, sollte aber nicht zum Hauptziel des Lernens werden. Am nuetzlichsten ist sie, wenn sie dem Lernenden hilft, die eigene Verbesserung zu sehen und nicht nur den Vergleich mit anderen.',
      hints: [
        'Vergleiche zuerst das aktuelle Ergebnis mit deinem eigenen frueheren Fortschritt.',
        'Eine ruhige regelmaessige Serie ist meist hilfreicher als ein einzelner schneller Versuch nur fuer die Platzierung.',
        'Nutze die Rangliste als Signal, nicht als Urteil.',
      ],
      followUpActions: [action('leaderboard-profile', 'Profil ansehen', 'LearnerProfile')],
      triggerPhrases: ['bestenliste', 'rangliste', 'platzierung', 'wie funktioniert die rangliste'],
    },
    'shared-home-actions': {
      title: 'Schnellaktionen',
      shortDescription: 'Das sind Abkuerzungen zu den wichtigsten Aktivitaeten in Kangur.',
      fullDescription:
        'Schnellaktionen fuehren direkt zu Lektionen, Grajmy, Duellen oder Kangur Matematyczny. So koennen Lernende oder Eltern sofort den passenden naechsten Schritt oeffnen, ohne auf dem ganzen Bildschirm zu suchen.',
      hints: [
        'Nutze diesen Bereich, wenn du nicht weisst, womit du beginnen sollst.',
        'Waehle Lektionen fuer Erklaerungen und ein Spiel fuer praktische Uebung.',
        'Wenn es eine Tagesmission oder eine Prioritaetsaufgabe gibt, beginne zuerst damit.',
      ],
      followUpActions: [
        action('home-actions-lessons', 'Zu den Lektionen', 'Lessons'),
        action('home-actions-game', 'Zum Spiel', 'Game'),
      ],
      triggerPhrases: ['schnellaktionen', 'abkuerzungen', 'wo soll ich anfangen', 'was soll ich oeffnen'],
    },
    'shared-home-quest': {
      title: 'Tagesmission',
      shortDescription: 'Die Tagesmission schlaegt ein kleines konkretes Ziel fuer jetzt vor.',
      fullDescription:
        'Die Tagesmission reduziert die Auswahl auf ein sinnvolles Ziel. Statt vieler Optionen bekommt der Lernende eine klare Richtung auf Basis des juengsten Fortschritts und der Aufgaben.',
      hints: [
        'Betrachte die Mission als ein kleines Ziel und nicht als lange Aufgabenliste.',
        'Nach der Mission kannst du den Fortschritt pruefen oder eine leichte Uebungsrunde machen.',
        'Wenn die Mission unklar ist, oeffne sie und pruefe den konkreten Schritt.',
      ],
      followUpActions: [
        action('home-quest-lessons', 'In Lektionen erledigen', 'Lessons'),
        action('home-quest-game', 'Im Spiel erledigen', 'Game'),
      ],
      triggerPhrases: ['tagesmission', 'mission', 'ziel fuer heute', 'was macht diese mission'],
    },
    'shared-priority-assignments': {
      title: 'Prioritaetsaufgaben',
      shortDescription: 'Das sind die wichtigsten Dinge, die jetzt erledigt werden sollten.',
      fullDescription:
        'Prioritaetsaufgaben ordnen, was zuerst erledigt werden soll. Sie kommen oft vom Elternteil oder einer Betreuungsperson, damit der Lernende nicht raten muss, was im Moment am meisten hilft.',
      hints: [
        'Beginne mit der ersten Aufgabe statt mit der scheinbar leichtesten.',
        'Wenn die Aufgabe zu einer Lektion fuehrt, verstehe zuerst das Thema und gehe erst danach ins Spiel.',
        'Wenn die Aufgabe unklar ist, kehre zur Lektionsbeschreibung zurueck oder frage das Elternteil nach dem Ziel.',
      ],
      followUpActions: [action('priority-assignments-open', 'Zu den Lektionen', 'Lessons')],
      triggerPhrases: ['prioritaetsaufgaben', 'prioritaeten', 'was soll ich zuerst machen'],
    },
    'game-overview': {
      title: 'Spielbildschirm',
      shortDescription: 'Das Spiel dient dem schnellen Ueben und Festigen.',
      fullDescription:
        'Der Spielbildschirm ist der Ort fuer aktives Ueben. Hier baut der Lernende Tempo, Genauigkeit und Wiederholung auf. Spiele ersetzen keine Lektionen, sondern festigen bereits Gelerntes.',
      hints: [
        'Achte zuerst auf richtige Antworten und erst danach auf Geschwindigkeit.',
        'Nach ein paar schwaecheren Versuchen kehre zu einer Lektion oder zu einem leichteren Training zurueck.',
        'Kurze regelmaessige Sitzungen helfen meist mehr als ein einziger sehr langer Versuch.',
      ],
      relatedGames: ['Addition', 'Subtraktion', 'Multiplikation', 'Division'],
      relatedTests: ['Kontrolle nach dem Training'],
      followUpActions: [
        action('game-open', 'Spiel starten', 'Game'),
        action('game-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
      ],
      triggerPhrases: ['spielbildschirm', 'wie funktioniert dieses spiel', 'wofuer ist dieses spiel', 'spiel'],
    },
    'game-training-setup': {
      title: 'Training einrichten',
      shortDescription:
        'Hier wird eine Trainingsrunde eingerichtet: Niveau, Kategorien und Anzahl der Fragen.',
      fullDescription:
        'Die Trainingseinrichtung bereitet eine Uebungsrunde vor. Der Lernende waehlt Schwierigkeit, Themenbereich und Anzahl der Fragen, damit die Sitzung zum aktuellen Fokus passt.',
      hints: [
        'Waehle ein Niveau, auf dem noch sauber gearbeitet werden kann.',
        'Begrenze die Kategorien auf das, was jetzt am meisten geuebt werden muss.',
        'Eine kuerzere Serie ist am Anfang oft besser als eine zu lange Runde.',
      ],
      followUpActions: [action('game-training-setup-open', 'Training konfigurieren', 'Game')],
      triggerPhrases: ['training einrichten', 'gemischtes training', 'trainingseinstellungen', 'wie viele fragen'],
    },
    'game-operation-selector': {
      title: 'Spieltyp waehlen',
      shortDescription:
        'Hier waehlt der Lernende die Spielart oder die schnelle Uebung, die am besten zum Ziel passt.',
      fullDescription:
        'Die Spieltyp-Auswahl hilft zu entscheiden, ob als naechstes Rechenuebung, Kalender, Figuren oder eine andere schnelle Aktivitaet sinnvoll ist. Sie soll den Lernenden in die Uebungsart fuehren, die am besten zum aktuellen Thema passt.',
      hints: [
        'Waehle eine Aktivitaet, die zu der zuletzt geuebten Lektion passt.',
        'Wenn Grundwissen wiederholt werden soll, beginne lieber mit einem einfacheren Spiel als mit dem Wettbewerbsmodus.',
        'Bleibe bei einem Uebungsbereich und mische nicht zu viele Themen in einer Sitzung.',
      ],
      followUpActions: [action('game-operation-selector-open', 'Spiel waehlen', 'Game')],
      triggerPhrases: ['spieltyp', 'welches spiel soll ich waehlen', 'spielauswahl', 'operationsauswahl'],
    },
    'game-kangur-setup': {
      title: 'Sitzung fuer Kangur Matematyczny einrichten',
      shortDescription:
        'Hier waehlt der Lernende die Wettbewerbsedition und den Aufgabensatz vor dem Start.',
      fullDescription:
        'Die Einrichtung fuer Kangur Matematyczny bereitet eine wettbewerbsnaehere Sitzung vor. Sie ist sinnvoll, wenn ruhiges Lesen und mehrstufiges Denken geuebt werden sollen.',
      hints: [
        'Waehle den Modus, der zum aktuellen Niveau des Lernenden passt.',
        'Wenn der Lernende gerade erst zu dieser Art Aufgaben zurueckkehrt, beginne mit einem kuerzeren Satz.',
      ],
      followUpActions: [action('game-kangur-setup-open', 'Sitzung vorbereiten', 'Game')],
      triggerPhrases: ['kangur einrichten', 'wettbewerbsedition', 'aufgabensatz', 'kangur matematyczny einrichtung'],
    },
    'game-assignment': {
      title: 'Trainingsaufgabe',
      shortDescription: 'Diese Karte zeigt, welche Uebungsrunde gerade am wichtigsten ist.',
      fullDescription:
        'Eine Trainingsaufgabe verbindet den Lernplan mit einer konkreten Spielrunde. Sie zeigt die naechste nuetzliche Praxis statt einer zufaelligen Auswahl.',
      hints: [
        'Beginne mit der aktiven Aufgabe oder mit der obersten Aufgabe in der Liste.',
        'Wenn die Aufgabe nach mehreren Versuchen schwer bleibt, kehre zur Lektion mit demselben Thema zurueck.',
      ],
      followUpActions: [
        action('game-assignment-open', 'Aufgabe starten', 'Game'),
        action('game-assignment-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
      ],
      triggerPhrases: ['trainingsaufgabe', 'aktive aufgabe', 'zugewiesene aufgabe', 'was soll ich jetzt ueben'],
    },
    'game-question': {
      title: 'Frage im Spiel',
      shortDescription:
        'Das ist die aktuelle Aufgabe, bei der der Denkweg wichtiger ist als reine Geschwindigkeit.',
      fullDescription:
        'Eine Spielfrage zeigt einen aktiven Versuch. Der Lernende sollte zuerst die Aufgabe lesen, die Art der Aufgabe erkennen und erst dann antworten. Der Tutor kann die Aufmerksamkeit lenken, sollte aber nicht die fertige Loesung ersetzen.',
      hints: [
        'Benenne zuerst die Art der Aufgabe: Addition, Subtraktion, Multiplikation oder eine andere Aktivitaet.',
        'Wenn Zeitdruck entsteht, verlangsame kurz und pruefe, was genau gefragt ist.',
        'Erst nach dem Verstehen der Aufgabe sollte gerechnet oder eine Antwort gewaehlt werden.',
      ],
      relatedGames: ['Addition', 'Subtraktion', 'Multiplikation', 'Division'],
      triggerPhrases: ['spielfrage', 'aktuelle frage', 'wie gehe ich an diese frage heran', 'was macht diese frage'],
    },
    'game-review': {
      title: 'Auswertung nach dem Spiel',
      shortDescription:
        'Hier sieht der Lernende, was gut lief und was in der naechsten Runde verbessert werden sollte.',
      fullDescription:
        'Die Spielauswertung hilft, nach einer Runde das Muster zu erkennen: ob das Problem Tempo, Unaufmerksamkeit oder eine bestimmte Aufgabenart war. Statt nur auf Punkte zu schauen, sollte ein klarer Verbesserungsimpuls fuer den naechsten Versuch bleiben.',
      hints: [
        'Beurteile die Runde nicht nur nach einer Zahl. Pruefe, ob sich dieselbe Fehlerart wiederholt.',
        'Nach einer schwaecheren Runde waehle einen konkreten Bereich zur Verbesserung statt alles gleichzeitig zu aendern.',
        'Wenn das Problem Grundwissen ist, kehre zur Lektion oder zu einem leichteren Niveau zurueck.',
      ],
      followUpActions: [
        action('game-review-retry', 'Noch einmal versuchen', 'Game'),
        action('game-review-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
      ],
      triggerPhrases: ['spielauswertung', 'spielergebnis', 'wie geht es nach dem spiel weiter', 'wie lese ich dieses ergebnis'],
    },
    'game-summary': {
      title: 'Spielzusammenfassung',
      shortDescription: 'Die Spielzusammenfassung zeigt, was schon klappt und was noch eine Runde braucht.',
      fullDescription:
        'Die Spielzusammenfassung sammelt Genauigkeit, Tempo und das Gesamtergebnis der Sitzung. Die wichtigste Frage ist, ob sich Fehler wiederholen, ob der Lernende stabiler wird oder ob der naechste Schritt schon sinnvoll ist.',
      hints: [
        'Wenn die Genauigkeit sinkt, verlangsamt zuerst das Tempo.',
        'Wenn das Ergebnis stabil ist, erhoehe erst dann Schwierigkeit oder Geschwindigkeit.',
        'Mache aus einem Befund einen naechsten Schritt: wiederholen oder weitergehen.',
      ],
      followUpActions: [action('game-summary-retry', 'Noch einmal versuchen', 'Game')],
      triggerPhrases: ['spielzusammenfassung', 'spielergebnis', 'was bedeutet dieses ergebnis'],
    },
    'test-overview': {
      title: 'Testbildschirm',
      shortDescription: 'Der Test prueft, was der Lernende bereits selbststaendig kann.',
      fullDescription:
        'Der Testbildschirm prueft das selbststaendige Verstehen und die Bereitschaft, Aufgaben zu loesen. Es geht hier eher um ruhiges Lesen und Denken als um Geschwindigkeit.',
      hints: [
        'Lies zuerst die ganze Aufgabe und alle Antworten.',
        'Versuche die Aufgabe selbst zu loesen, bevor du eine Auswertung oeffnest.',
        'Wenn du feststeckst, gehe zum Aufgabentext zurueck und markiere wichtige Zahlen oder Woerter.',
      ],
      relatedTests: ['Wiederholung nach der Lektion', 'Verstaendniskontrolle zum Thema'],
      triggerPhrases: ['testbildschirm', 'wie funktioniert dieser test', 'wofuer ist dieser test', 'test'],
    },
    'test-empty-state': {
      title: 'Leerer Testsatz',
      shortDescription: 'Dieser Zustand bedeutet, dass der ausgewaehlte Satz noch keine veroeffentlichten Fragen hat.',
      fullDescription:
        'Ein leerer Testsatz erscheint, wenn der Satz existiert, aber noch keine veroeffentlichten Fragen enthaelt. Das ist kein Fehler des Lernenden. Der beste naechste Schritt ist dann die Rueckkehr zu einem anderen Test, einer Lektion oder einem Spiel.',
      hints: [
        'Wenn du hier Fragen erwartet hast, waehle einen anderen Satz oder komme spaeter zurueck.',
        'Das ist ein guter Moment, um zu einer Lektion oder einem kurzen Spiel zu wechseln statt ohne Ziel zu warten.',
      ],
      followUpActions: [
        action('test-empty-state-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
        action('test-empty-state-game', 'Zum Spiel gehen', 'Game'),
      ],
      triggerPhrases: ['leerer test', 'keine fragen im test', 'was bedeutet dieser leere zustand', 'warum ist der test leer'],
    },
    'test-summary': {
      title: 'Testzusammenfassung',
      shortDescription:
        'Die Testzusammenfassung zeigt das Ergebnis, aber vor allem die Richtung fuer den naechsten Schritt.',
      fullDescription:
        'Die Testzusammenfassung verbindet das Ergebnis des gesamten Versuchs mit der Frage, wo der Lernende schon stark ist und wo noch Wiederholung noetig bleibt. Entscheidend ist nicht nur der Endprozentsatz, sondern der sinnvollste naechste Schritt.',
      hints: [
        'Betrachte Fehler als Hinweis auf den naechsten Wiederholungsbereich, nicht als Niederlage.',
        'Nach einem schwaecheren Test ist eine kurze Wiederholung eines konkreten Themas meist der beste Schritt.',
        'Nach einem starken Ergebnis kann ein schwierigerer Bereich oder der naechste Test sinnvoll sein.',
      ],
      followUpActions: [action('test-summary-lessons', 'Zurueck zu den Lektionen', 'Lessons')],
      triggerPhrases: ['testzusammenfassung', 'testergebnis', 'was bedeutet dieses ergebnis'],
    },
    'test-question': {
      title: 'Testfrage',
      shortDescription: 'Hier geht es um ruhiges Lesen und einen selbststaendigen Versuch.',
      fullDescription:
        'Eine Testfrage zeigt eine Aufgabe mit Antworten oder Platz fuer eine Loesung. Der Lernende sollte zuerst ruhig lesen, die Daten erkennen und erst dann eine Antwort oder einen Loesungsweg waehlen.',
      hints: [
        'Lies die Frage noch einmal komplett, bevor du eine Antwort waehlst.',
        'Achte auf Zahlen, Einheiten und Woerter, die die Bedeutung veraendern.',
        'Wenn es Antwortoptionen gibt, streiche zuerst die aus, die sicher nicht passen.',
      ],
      triggerPhrases: ['testfrage', 'wie gehe ich an diese frage heran', 'was macht dieser fragenbereich'],
    },
    'test-selection': {
      title: 'Ausgewaehlte Antwort im Test',
      shortDescription: 'Diese Karte zeigt die aktuell markierte Antwort vor der Ergebnispruefung.',
      fullDescription:
        'Eine ausgewaehlte Antwort im Test ist nur eine vorlaeufige Wahl, bevor das richtige Ergebnis sichtbar wird. Der Tutor sollte helfen zu pruefen, was diese Wahl bedeutet und was vor dem Abschicken noch kontrolliert werden muss.',
      hints: [
        'Lies die Frage noch einmal und vergleiche sie nur mit der markierten Antwort.',
        'Pruefe, ob die gewaehlte Option wirklich auf die gestellte Frage antwortet und nicht nur vertraut aussieht.',
        'Wenn du unsicher bist, vergleiche deine Wahl mit einer Alternative statt sofort zu raten.',
      ],
      triggerPhrases: ['ausgewaehlte antwort', 'markierte antwort', 'was bedeutet meine auswahl', 'verstehe ich diese antwort richtig'],
    },
    'test-review': {
      title: 'Auswertung nach dem Test',
      shortDescription: 'Die Auswertung hilft, den Fehler zu verstehen und einen naechsten Schluss zu ziehen.',
      fullDescription:
        'Die Auswertung nach dem Test erklaert, was funktioniert hat, wo der Fehler lag und welcher eine Schritt den naechsten Versuch verbessern kann. Ihr Wert liegt im Verstehen der Begruendung hinter der richtigen Antwort.',
      hints: [
        'Vergleiche zuerst deinen Denkweg mit der Auswertung.',
        'Merke dir einen konkreten Fehler, den du beim naechsten Mal vermeiden willst.',
        'Wenn die Auswertung auf eine Lektion verweist, oeffne diese Lektion noch einmal und pruefe ein Beispiel.',
      ],
      followUpActions: [action('test-review-lessons', 'Thema wiederholen', 'Lessons')],
      triggerPhrases: ['auswertung', 'antwortauswertung', 'erklaere diesen fehler', 'was zeigt diese auswertung'],
    },
    'profile-overview': {
      title: 'Lernendenprofil',
      shortDescription:
        'Das Lernendenprofil sammelt Fortschritt, Empfehlungen und Arbeitsverlauf an einem Ort.',
      fullDescription:
        'Das Lernendenprofil zeigt das Lernen ueber einen laengeren Zeitraum. Es ist ein Bereich, um Fortschritt zu lesen, naechste Prioritaeten zu waehlen und zu sehen, was staerker wird.',
      hints: [
        'Beginne mit dem Gesamtbild, bevor du in einzelne Karten gehst.',
        'Nutze das Profil, um zu entscheiden, ob eine Wiederholung oder ein weiterer Spielversuch sinnvoller ist.',
        'Waehle eine Karte, handle danach und kehre dann hierher zurueck.',
      ],
      followUpActions: [
        action('profile-overview-lessons', 'Zurueck zu den Lektionen', 'Lessons'),
        action('profile-overview-game', 'Zum Spiel gehen', 'Game'),
      ],
      triggerPhrases: ['lernendenprofil', 'wie lese ich dieses profil', 'was zeigt dieses profil'],
    },
    'profile-recommendations': {
      title: 'Empfehlungen fuer den Lernenden',
      shortDescription:
        'Dieser Bereich schlaegt den naechsten Schritt vor, der am besten zum aktuellen Fortschritt passt.',
      fullDescription:
        'Empfehlungen ordnen die naechsten Schritte: welche Lektion, welches Spiel oder welcher Rueckweg jetzt den groessten Nutzen bringt. Sie sollen auf eine sinnvolle Prioritaet zeigen statt auf viele konkurrierende Optionen.',
      hints: [
        'Waehle eine Empfehlung und bringe sie zu Ende, bevor du eine weitere oeffnest.',
        'Wenn die Empfehlung zu einem juengsten schwachen Ergebnis passt, beginne genau damit.',
        'Kehre danach hierher zurueck und entscheide ueber den naechsten Schritt.',
      ],
      followUpActions: [action('profile-recommendations-open', 'Empfehlungen oeffnen', 'LearnerProfile')],
      triggerPhrases: ['empfehlungen', 'was kommt als naechstes fuer den lernenden', 'welchen naechsten schritt soll ich waehlen'],
    },
    'profile-assignments': {
      title: 'Aufgaben des Lernenden',
      shortDescription:
        'Diese Karte zeigt zugewiesene Arbeit und hilft zu entscheiden, was jetzt erledigt werden sollte.',
      fullDescription:
        'Der Aufgabenbereich im Lernendenprofil sammelt aktive Pflichten und Prioritaeten. Er hilft zu sehen, was zugewiesen wurde, was dringend ist und womit die naechste Sitzung beginnen sollte.',
      hints: [
        'Beginne mit der Aufgabe, die als dringend markiert ist oder mit dem juengsten schwachen Ergebnis zusammenhaengt.',
        'Nach einer erledigten Aufgabe kehre zum Profil zurueck und pruefe, ob sich die Prioritaet geaendert hat.',
      ],
      followUpActions: [action('profile-assignments-open-game', 'Zum Spiel gehen', 'Game')],
      triggerPhrases: ['aufgaben des lernenden', 'was ist zugewiesen', 'prioritaetsaufgaben im profil'],
    },
    'parent-dashboard-overview': {
      title: 'Elterndashboard',
      shortDescription:
        'Das Elterndashboard sammelt den Ueberblick ueber den Lernenden: Fortschritt, Ergebnisse, Aufgaben, Monitoring und Einstellungen.',
      fullDescription:
        'Das Elterndashboard dient dazu, das Lernbild zu lesen und die naechsten Prioritaeten festzulegen, nicht zum Loesen von Aufgaben. Es hilft dem Elternteil zu pruefen, was passiert und welcher Schritt als naechstes sinnvoll ist.',
      hints: [
        'Waehle zuerst den Tab, der zur Frage passt: Ergebnisse, Fortschritt, Aufgaben, Monitoring oder KI-Tutor.',
        'Mache aus einem konkreten Schluss eine konkrete Aktion fuer den Lernenden.',
        'Pruefe vor den Details, ob der richtige Lernende ausgewaehlt ist.',
      ],
      followUpActions: [
        action('parent-dashboard-overview-profile', 'Lernendenprofil ansehen', 'LearnerProfile'),
        action('parent-dashboard-overview-lessons', 'Zu den Lektionen', 'Lessons'),
      ],
      triggerPhrases: ['elterndashboard', 'wie funktioniert dieses dashboard', 'was kann ich hier pruefen'],
    },
    'parent-dashboard-tabs': {
      title: 'Tabs im Elterndashboard',
      shortDescription:
        'Diese Tabs teilen das Elterndashboard in Ergebnisse, Fortschritt, Aufgaben, Monitoring und KI-Tutor-Unterstuetzung auf.',
      fullDescription:
        'Die Tabs ordnen das Elterndashboard nach Zweck. Statt alles auf einmal zu lesen, kann das Elternteil nur die Informationen oeffnen, die im Moment gebraucht werden.',
      hints: [
        'Waehle einen Tab passend zu der Frage, die du beantworten willst.',
        'Vergleiche nach dem Wechseln die Schluesse zwischen den Bereichen, aber mische nicht alles gleichzeitig.',
      ],
      followUpActions: [action('parent-dashboard-tabs-profile', 'Lernendenprofil oeffnen', 'LearnerProfile')],
      triggerPhrases: ['eltern-tabs', 'wie funktionieren diese tabs', 'was ist in diesem tab'],
    },
    'parent-dashboard-assignments': {
      title: 'Aufgaben des Lernenden im Elterndashboard',
      shortDescription:
        'Dieser Tab zeigt die zugewiesenen Aufgaben des Lernenden und hilft bei der Priorisierung.',
      fullDescription:
        'Der Aufgabentab im Elterndashboard dient dazu, die kurzfristige Arbeit des Lernenden zu planen. Er zeigt, was aktiv ist, was bald abgeschlossen werden sollte und welcher Bereich jetzt Vorrang haben sollte.',
      hints: [
        'Halte lieber eine Hauptaufgabe statt vieler paralleler Prioritaeten.',
        'Wenn eine Aufgabe nicht zum aktuellen Niveau passt, pruefe zuerst das Profil des Lernenden.',
        'Nach Abschluss einer Aufgabe kehre hierher zurueck und bestaetige, dass die Prioritaeten noch stimmen.',
      ],
      followUpActions: [action('parent-dashboard-assignments-game', 'Zum Spiel gehen', 'Game')],
      triggerPhrases: ['aufgaben des lernenden im elterndashboard', 'was ist zugewiesen', 'prioritaeten fuer den lernenden'],
    },
    'parent-dashboard-ai-tutor': {
      title: 'KI-Tutor-Tab fuer Eltern',
      shortDescription:
        'Dieser Bereich uebersetzt Lerndaten in einfachere Sprache und hilft bei der Entscheidung ueber den naechsten Schritt.',
      fullDescription:
        'Der KI-Tutor-Tab fuer Eltern ersetzt die Daten nicht, sondern interpretiert sie. Er ist der richtige Ort fuer Fragen zu Fortschritt, Prioritaeten und zur Logik des naechsten Schritts, wenn Zahlen allein nicht reichen.',
      hints: [
        'Beginne mit einer konkreten Frage, auf die du eine Antwort willst.',
        'Die besten Ergebnisse entstehen, wenn dieser Tab mit Fortschritts-, Ergebnis- oder Aufgabendaten kombiniert wird.',
      ],
      followUpActions: [action('parent-dashboard-ai-tutor-profile', 'Lernendenprofil ansehen', 'LearnerProfile')],
      triggerPhrases: ['ki-tutor fuer eltern', 'wie nutze ich diesen tab', 'was kann ich hier fragen'],
    },
};
