export interface QuickActionItem {
  id: string;
  label: string;
  prompt: string;
  icon: string;
}

export interface ActionCategory {
  id: string;
  name: string;
  icon: string;
  items: QuickActionItem[];
}

export const QUICK_ACTIONS_CATEGORIES: ActionCategory[] = [
  {
    id: 'calendar',
    name: 'Kalender & Termine',
    icon: 'Calendar',
    items: [
      { id: 'tagesbriefing', label: 'Tagesbriefing', prompt: 'Gib mir mein Tagesbriefing für heute.', icon: 'ClipboardText' },
      { id: 'abendabschluss', label: 'Abendabschluss', prompt: 'Lass uns den Abendabschluss für heute machen.', icon: 'CheckSquare' },
      { id: 'wochenplaner', label: 'Wochenplaner-Tipps', prompt: 'Wie kann ich meinen Wochenplaner optimal strukturieren?', icon: 'CalendarDays' },
      { id: 'lueckenfueller', label: 'Lückenfüller', prompt: 'Finde freie Zeiten im Planer für diese Woche.', icon: 'Search' },
      { id: 'luecken-schueler', label: 'Nächster Schüler für Lücke', prompt: 'Finde den nächsten besten Schüler, um meine Planungslücken zu füllen.', icon: 'UserPlus' },
      { id: 'pausenschutz', label: 'Pausen-Schutz', prompt: 'Prüfe meinen Pausen-Schutz für diese Woche.', icon: 'Clock' },
      { id: 'nachtfahrt', label: 'Nachtfahrt-Fenster', prompt: 'Finde freie Termine im perfekten Zeitfenster für Nachtfahrten.', icon: 'Moon' },
      { id: 'autobahn', label: 'Autobahn-Planung', prompt: 'Welche Schüler sollten als nächstes Autobahnfahrten machen?', icon: 'Milestone' },
      { id: 'ueberland', label: 'Überland-Planung', prompt: 'Plane die Überlandfahrten für meine Schüler.', icon: 'Compass' },
      { id: 'ferien', label: 'Schulferien-Check', prompt: 'Welche Schüler haben in den nächsten Schulferien Zeit?', icon: 'Sun' },
      { id: 'feiertag', label: 'Feiertagswarnung', prompt: 'Habe ich Fahrstunden an anstehenden Feiertagen?', icon: 'AlertTriangle' },
      { id: 'absage', label: 'Absage-Assistent', prompt: 'Hilf mir, auf eine kurzfristige Terminabsage zu reagieren.', icon: 'UserX' },
      { id: 'noshow', label: 'No-Show-Erfassung', prompt: 'Erfasse eine nicht wahrgenommene Fahrstunde (No-Show).', icon: 'FileX' },
      { id: 'prioritaet', label: 'Termin-Priorität', prompt: 'Nach welchen Regeln soll ich meine Termine priorisieren?', icon: 'TrendingUp' },
      { id: 'nachbereitung', label: 'Termin-Nachbereitung', prompt: 'Lass uns die letzte Fahrstunde nachbereiten.', icon: 'Check' }
    ]
  },
  {
    id: 'students',
    name: 'Schüler & Ausbildung',
    icon: 'Users',
    items: [
      { id: 'risikoampel', label: 'Schüler-Risikoampel', prompt: 'Zeige mir das Risiko-Ranking meiner Schüler (Risikoampel).', icon: 'AlertCircle' },
      { id: 'pruefungsreife', label: 'Prüfungsreife-Check', prompt: 'Wer ist bereit für die praktische Prüfung?', icon: 'Award' },
      { id: 'dokumente', label: 'Dokumenten-Check', prompt: 'Welchen Schülern fehlen noch Ausbildungsunterlagen oder Anträge?', icon: 'FileText' },
      { id: 'schlaefer', label: 'Schläfer-Reaktivierung', prompt: 'Welche Schüler sind inaktiv und sollten reaktiviert werden?', icon: 'ZapOff' },
      { id: 'fristenwaechter', label: 'Antrags-Fristenwächter', prompt: 'Bei welchen Schülern laufen demnächst behördliche Anträge ab?', icon: 'Hourglass' },
      { id: 'geburtstag', label: 'Geburtstags-Assistent', prompt: 'Wer hat Geburtstag und wie gratuliere ich am besten?', icon: 'Cake' },
      { id: 'timeline', label: 'Schüler-Timeline', prompt: 'Zeige mir den zeitlichen Verlauf der Ausbildung für einen Schüler.', icon: 'GitCommit' },
      { id: 'ziel', label: 'Ausbildungsziel pro Schüler', prompt: 'Was ist das nächste Ausbildungsziel für meine Schüler?', icon: 'Target' },
      { id: 'pruefungsplan', label: 'Prüfungsvorbereitungsplan', prompt: 'Erstelle einen Vorbereitungsplan für die praktische Prüfung.', icon: 'Map' },
      { id: 'theorieliste', label: 'Theorie-Nachfassliste', prompt: 'Welche Schüler müssen dringend für die Theorieprüfung nachgefasst werden?', icon: 'BookOpen' },
      { id: 'fehler', label: 'Wiederholungsfehler-Erkennung', prompt: 'Welche Fehler wiederholen sich bei meinen Schülern am häufigsten?', icon: 'RefreshCw' },
      { id: 'lernkarten', label: 'Lernkarten pro Schüler', prompt: 'Welche Theoriethemen sollte ich mit den Schülern wiederholen?', icon: 'Layers' },
      { id: 'vorbereitung', label: 'Fahrstunde vorbereiten', prompt: 'Hilf mir, die nächste Fahrstunde didaktisch vorzubereiten.', icon: 'BookOpen' },
      { id: 'fortschritt', label: 'Fortschritt buchen', prompt: 'Lass uns den Fortschritt der letzten Fahrstunde eintragen.', icon: 'CheckCircle' },
      { id: 'stimmung', label: 'Stimmungsnotiz', prompt: 'Erfasse eine Stimmungsnotiz zur heutigen Fahrstunde.', icon: 'Smile' },
      { id: 'suchmodus', label: 'Schüler-Suchmodus', prompt: 'Suche nach einem bestimmten Schüler und zeige seine Details.', icon: 'Search' },
      { id: 'eltern', label: 'Elternkontakt-Hinweise', prompt: 'Wie formuliere ich ein Feedback für die Eltern eines Schülers?', icon: 'MessageCircle' },
      { id: 'kommstil', label: 'Kommunikationsstil', prompt: 'Welche Kommunikationsstile haben meine Schüler?', icon: 'MessageSquare' }
    ]
  },
  {
    id: 'fleet',
    name: 'Fuhrpark & Fahrzeuge',
    icon: 'Car',
    items: [
      { id: 'tuev', label: 'TÜV-Termine', prompt: 'Wann müssen meine Fahrzeuge zum TÜV?', icon: 'AlertTriangle' },
      { id: 'wartung', label: 'Wartungs-Check', prompt: 'Gibt es offene Fehlermeldungen oder anstehende Inspektionen?', icon: 'Wrench' },
      { id: 'kmstand', label: 'Kilometerstände', prompt: 'Erinnere mich daran, die Kilometerstände zu prüfen.', icon: 'Gauge' },
      { id: 'reifen', label: 'Reifenwechsel', prompt: 'Wann steht der nächste Reifenwechsel an?', icon: 'Disc' },
      { id: 'auslastung', label: 'Fahrzeug-Auslastung', prompt: 'Welches Auto wird diese Woche am meisten genutzt?', icon: 'TrendingUp' }
    ]
  },
  {
    id: 'finance',
    name: 'Finanzen & Kasse',
    icon: 'Coins',
    items: [
      { id: 'zahlungen', label: 'Zahlungs-Erinnerungen', prompt: 'Welche Zahlungen sind noch ausstehend?', icon: 'DollarSign' },
      { id: 'rechnung', label: 'Rechnungs-Vorbereitung', prompt: 'Bereite die Rechnungen für meine Schüler vor.', icon: 'FileText' },
      { id: 'tagesabschluss', label: 'Kassen-Tagesabschluss', prompt: 'Hilf mir beim Kassen-Tagesabschluss.', icon: 'CheckSquare' }
    ]
  },
  {
    id: 'law',
    name: 'Fahrschul-Recht & Coach',
    icon: 'Scale',
    items: [
      { id: 'gesetz', label: 'Fahrschul-Wissen', prompt: 'Erkläre mir eine Regelung aus dem Fahrlehrergesetz (FahrlG).', icon: 'Book' },
      { id: 'coach', label: 'Selbstständigkeits-Coach', prompt: 'Gib mir Tipps zur Selbstständigkeit als Fahrlehrer.', icon: 'HelpCircle' },
      { id: 'marketing', label: 'Marketing-Ideen', prompt: 'Welche Marketing-Ideen gibt es für meine Fahrschule?', icon: 'Megaphone' },
      { id: 'bewertung', label: 'Bewertungs-Anfrage', prompt: 'Wie frage ich einen Schüler nach einer Google-Bewertung?', icon: 'Star' },
      { id: 'erfolg', label: 'Erfolgsarchiv', prompt: 'Zeige mir meine Ausbildungs-Erfolge und bestandene Prüfungen.', icon: 'FolderHeart' },
      { id: 'monat', label: 'Monatsrückblick', prompt: 'Lass uns einen Monatsrückblick für meine Fahrschule erstellen.', icon: 'FileBarChart' },
      { id: 'service', label: 'Kundenservice-Modus', prompt: 'Aktiviere den Kundenservice-Modus für Schüleranfragen.', icon: 'MessageCircle' },
      { id: 'behoerden', label: 'Behörden-Modus', prompt: 'Hilf mir beim Ausfüllen von Formularen für das Straßenverkehrsamt.', icon: 'FileSignature' }
    ]
  },
  {
    id: 'control',
    name: 'Copilot-Steuerung & Modi',
    icon: 'Sliders',
    items: [
      { id: 'aufgaben', label: 'Agent-Aufgabenmodus', prompt: 'Aktiviere den Aufgabenmodus für strukturierte To-Dos.', icon: 'ListTodo' },
      { id: 'plan', label: 'Plan-vor-Ausführung', prompt: 'Aktiviere Plan-vor-Ausführung für komplexe Abläufe.', icon: 'ClipboardList' },
      { id: 'konflikt', label: 'Konflikt-Erklärung', prompt: 'Erkläre mir den gefundenen Terminkonflikt im Detail.', icon: 'AlertCircle' },
      { id: 'bestaetigung', label: 'Bestätigungszentrale', prompt: 'Zeige mir alle offenen Aktionen, die auf meine Bestätigung warten.', icon: 'CheckSquare' },
      { id: 'modi', label: 'Agent-Modi', prompt: 'Welche Betriebsmodi stehen mir für den Copiloten zur Verfügung?', icon: 'Sliders' },
      { id: 'zentrum', label: 'Agent-Kontrollzentrum', prompt: 'Öffne das Agent-Kontrollzentrum für Einstellungen und Logs.', icon: 'ShieldAlert' },
      { id: 'naechstes', label: '„Was ist als Nächstes?“', prompt: 'Was steht als nächstes auf meiner To-Do-Liste?', icon: 'Play' },
      { id: 'aufgaben-sammler', label: 'Offene-Aufgaben-Sammler', prompt: 'Fasse alle meine offenen Aufgaben und Erinnerungen zusammen.', icon: 'FolderArchive' },
      { id: 'erinnerungen', label: 'Erinnerungs-Vorschläge', prompt: 'Schlage mir automatische Erinnerungen vor.', icon: 'BellPlus' },
      { id: 'lernkontrolle', label: 'Agent-Lernkontrolle', prompt: 'Was hast du über mich und meine Präferenzen gelernt?', icon: 'BrainCircuit' },
      { id: 'kurz', label: '„Mach’s kurz“-Schalter', prompt: 'Antworte mir ab jetzt besonders kurz und konkret.', icon: 'ToggleLeft' },
      { id: 'profil', label: 'Lernprofil verbessern', prompt: 'Wie kann ich mein Profil und meine Lehrmethoden verbessern?', icon: 'UserCog' }
    ]
  },
  {
    id: 'system',
    name: 'System & Utilities',
    icon: 'Settings',
    items: [
      { id: 'diktat', label: 'Diktat ohne Build', prompt: 'Erkläre mir, wie ich das Sprach-Diktat ohne Rebuild verbessern kann.', icon: 'Mic' },
      { id: 'kurzantwort', label: 'Antworten kürzer/konkreter', prompt: 'Bitte formuliere deine Antworten ab jetzt kürzer und konkreter.', icon: 'MessageSquareText' },
      { id: 'internet', label: 'Internet nur bei Bedarf', prompt: 'Nutze Websuchen ab jetzt nur noch bei expliziter Nachfrage.', icon: 'Globe' },
      { id: 'wetter', label: 'Wetter nur auf Wunsch', prompt: 'Gib mir Wetter-Hinweise nur noch, wenn ich danach frage.', icon: 'CloudSun' },
      { id: 'filter', label: 'Smarte Filter im Chat', prompt: 'Wie kann ich meine Chat-Nachrichten filtern?', icon: 'Filter' },
      { id: 'pipeline', label: 'Pipeline-Erklärung', prompt: 'Erkläre mir, wie die Daten-Pipeline im Hintergrund arbeitet.', icon: 'Info' },
      { id: 'whatsapp', label: 'WhatsApp-Entwürfe', prompt: 'Bereite einen WhatsApp-Entwurf vor.', icon: 'Share2' },
      { id: 'route', label: 'Prüfungsroute-Notizen', prompt: 'Speichere eine neue Notiz zu einer Prüfungsroute ab.', icon: 'MapPin' }
    ]
  }
];
