import { AgentKnowledgeCard } from './types';
import { agentMemoryStore } from './memoryStore';

const KNOWLEDGE_BASE: AgentKnowledgeCard[] = [
  {
    id: 'app-dashboard',
    title: 'Dashboard nutzen',
    category: 'app',
    keywords: ['dashboard', 'übersicht', 'heute', 'start', 'widgets', 'quick', 'schnell'],
    content:
      'Das Dashboard ist der Tagesstart: nächste Fahrt, offene Aufgaben, Prüfungen, Geburtstage, fehlende Dokumente, Schläfer und Schnellzugriffe. Widgets und Shortcut-Reihenfolge werden in Einstellungen gesteuert.',
  },
  {
    id: 'app-students',
    title: 'Schülerverwaltung',
    category: 'app',
    keywords: ['schüler', 'schueler', 'akte', 'kontakt', 'scan', 'dokument', 'verfügbarkeit', 'adk'],
    content:
      'In Schüler werden Stammdaten, Dokumente, Verfügbarkeiten, Theorie, Praxisfortschritt, Prüfungen und Kontakte gepflegt. Scan-Import kann Schülerdaten vorbereiten, muss aber fachlich geprüft werden.',
  },
  {
    id: 'app-planner',
    title: 'Planer und Termine',
    category: 'app',
    keywords: ['planer', 'termin', 'kalender', 'fahrt', 'woche', 'monat', 'planung', 'umbuchen'],
    content:
      'Der Planer erstellt und prüft Fahrstunden mit Arbeitszeiten, Pausen, Schülerverfügbarkeit, Stufenlänge und Wochenlimit. Änderungen, Stornos und Bestätigungen sollen vor Ausführung bestätigt werden.',
  },
  {
    id: 'app-settings',
    title: 'Agent und Einstellungen',
    category: 'app',
    keywords: ['einstellung', 'setup', 'api', 'key', 'gemini', 'provider', 'agent', 'theme', 'modus'],
    content:
      'In Einstellungen werden Regeln, Arbeitszeiten, Pipeline, Dashboard, KI-Provider, Agent-Persönlichkeit, Ausführungsmodus und proaktive Optionen gesteuert. API-Keys gehören nicht in Chats.',
  },
  {
    id: 'fahrschulrecht-lenkzeiten',
    title: 'Lenkzeiten und Pausen (FahrlG)',
    category: 'fahrschule',
    keywords: ['lenkzeit', 'arbeitszeit', 'pause', 'arbeitsgesetz', 'fahrzeit', 'ruhezeit'],
    content:
      'Nach dem Fahrlehrergesetz (FahrlG) darf die tägliche reine Lenkzeit (Unterrichtszeit am Steuer) 495 Minuten (11 Fahrstunden à 45 Min) nicht überschreiten. Gesetzliche Pausen: Mindestens 30 Minuten Pause bei einer Arbeitszeit von 6 bis 9 Stunden, 45 Minuten Pause bei mehr als 9 Stunden Arbeit. Die Pausen können in Blöcke von je 15 Minuten aufgeteilt werden.',
  },
  {
    id: 'fahrschulrecht-b197',
    title: 'B197 Automatikregelung',
    category: 'fahrschule',
    keywords: ['b197', 'schaltwagen', 'automatik', 'testfahrt', 'nachweis', 'schalt'],
    content:
      'Die B197-Regelung erlaubt das Fahren von Schaltwagen trotz praktischer Prüfung auf einem Automatikfahrzeug. Bedingungen: Mindestens 10 Fahrstunden (à 45 Minuten) auf einem Schaltwagen der Klasse B und eine anschließende 15-minütige Testfahrt durch den Fahrlehrer (kein externer Prüfer erforderlich) zum Nachweis der sicheren Fahrzeugbeherrschung auf Schaltwagen.',
  },
  {
    id: 'fahrschulrecht-bf17',
    title: 'Begleitetes Fahren ab 17 (BF17)',
    category: 'fahrschule',
    keywords: ['bf17', 'begleitetes', 'begleiter', 'siebzehn', 'begleitperson'],
    content:
      'Das Begleitete Fahren ab 17 (BF17) ermöglicht die Ausbildung ab 16,5 Jahren. Auflagen für Begleitpersonen: Müssen mindestens 30 Jahre alt sein, seit mindestens 5 Jahren ununterbrochen die Fahrerlaubnis Klasse B besitzen, dürfen maximal 1 Punkt im Fahreignungsregister (Flensburg) zum Zeitpunkt der Beantragung aufweisen und müssen namentlich in der Prüfungsbescheinigung eingetragen sein.',
  },
  {
    id: 'training-flow',
    title: 'Fahrschul-Ausbildungslogik',
    category: 'fahrschule',
    keywords: ['ausbildung', 'praxis', 'theorie', 'sonderfahrt', 'nachtfahrt', 'autobahn', 'überland', 'prüfung'],
    content:
      'Typische Ausbildung besteht aus Antrag/Dokumenten, Theorievorbereitung, Praxisstufen, Sonderfahrten und Prüfungsreife. Bei Klasse B sind Sonderfahrten klassisch 5 Überland, 4 Autobahn und 3 Nachtfahrten.',
  },
  {
    id: 'exam-readiness',
    title: 'Prüfungsreife einschätzen',
    category: 'fahrschule',
    keywords: ['prüfungsreife', 'prüfung', 'prüfungsnah', 'praktische', 'theorie', 'reif'],
    content:
      'Prüfungsreife sollte aus bestätigten Fahrstunden, stabilem Verhalten, wenig Eingriffen, bestandener Theorie, vollständigen Dokumenten, Sonderfahrten und sicherem Umgang mit schwierigen Situationen abgeleitet werden.',
  },
  {
    id: 'student-followup',
    title: 'Schläfer und Nachfassen',
    category: 'fahrschule',
    keywords: ['schläfer', 'nachfassen', 'kontakt', 'keine termine', 'inaktiv'],
    content:
      'Schüler ohne künftige Termine sollten regelmäßig priorisiert werden. Gute Nachfasslogik berücksichtigt Prüfungsnähe, offene Dokumente, Ablaufdaten, letzte Aktivität und bevorzugten Kontaktkanal.',
  },
  {
    id: 'selbststaendigkeit-steuern',
    title: 'Umsatzsteuer und Einnahmen (EÜR)',
    category: 'selbststaendigkeit',
    keywords: ['steuern', 'umsatzsteuer', 'eür', 'finanzamt', 'voranmeldung', 'einnahmen', 'ausgaben'],
    content:
      'Selbstständige Fahrlehrer ermitteln ihren Gewinn meist über die Einnahmen-Überschuss-Rechnung (EÜR). Umsatzsteuer-Voranmeldungen müssen je nach Vorjahressteuer monatlich oder vierteljährlich übermittelt werden. Die reguläre Umsatzsteuer beträgt 19%. Einnahmen müssen lückenlos belegt werden.',
  },
  {
    id: 'selbststaendigkeit-fahrzeug',
    title: 'Abschreibung (AfA) und Fahrtenbuch',
    category: 'selbststaendigkeit',
    keywords: ['abschreibung', 'afa', 'fahrtenbuch', 'wartung', 'tüv', 'betriebskosten'],
    content:
      'Fahrschulautos werden steuerlich als abnutzbare Anlagegüter über die Absetzung für Abnutzung (AfA) gewöhnlich über 5 bis 6 Jahre abgeschrieben. Ein ordnungsgemäßes Fahrtenbuch ist zwingend nötig, um private Fahrten von den Betriebsausgaben abzugrenzen. Für Fahrschulautos gilt eine jährliche TÜV-Pflicht sowie jährliche UVV-Prüfung.',
  },
  {
    id: 'selbststaendigkeit-kalkulation',
    title: 'Kalkulation der Fahrstundenpreise',
    category: 'selbststaendigkeit',
    keywords: ['kalkulation', 'preis', 'fahrstunde', 'kosten', 'auslastung', 'gewinn'],
    content:
      'Der Preis einer Fahrstunde muss Kraftstoff, Fahrzeugabnutzung, Versicherungen (Haftpflicht & Vollkasko für Fahrschulbetrieb), Miete für Büroräume, Verbandsbeiträge, eigene Sozialabgaben und den Unternehmerlohn decken. Bei der Preiskalkulation wird eine durchschnittliche Auslastung von 70-80% der Arbeitszeit angenommen.',
  },
  {
    id: 'vehicle-ops',
    title: 'Fahrzeug und Betrieb',
    category: 'selbststaendigkeit',
    keywords: ['fahrzeug', 'tüv', 'tuv', 'wartung', 'reifen', 'tank', 'kilometer', 'fuhrpark'],
    content:
      'Fahrzeuge brauchen Übersicht zu TÜV, Wartung, Reifen, Kilometerstand, Tankkosten, Schäden und Prüfungsfahrzeug-Tauglichkeit. Warnungen sollten früh genug vor Fristen erscheinen.',
  },
  {
    id: 'agent-safety',
    title: 'Agent-Sicherheit und Modi',
    category: 'agent',
    keywords: ['löschen', 'speichern', 'whatsapp', 'senden', 'aktion', 'bestätigung', 'sicherheit', 'modus'],
    content:
      'Der Agent arbeitet in drei Sicherheitsstufen: Beraten (Consult), Vorschlagen (Aktionskarte zur Bestätigung) und direkt Ausführen (nur Navigation). Kritische Datenmanipulationen (Löschen, WhatsApp versenden) erfordern immer eine manuelle Freigabe.',
  },
  {
    id: 'agent-learning',
    title: 'Lernprofil',
    category: 'agent',
    keywords: ['lernen', 'merken', 'gedächtnis', 'profil', 'präferenz', 'arbeitsweise'],
    content:
      'Das Lernprofil speichert Arbeitsstil, Planungspräferenzen, App-Vorlieben, wiederkehrende Themen und wichtige Hinweise. Es soll nur nützliche, nicht übergriffige Fakten behalten.',
  },
];

const scoreCard = (card: AgentKnowledgeCard, query: string, currentPath: string) => {
  const haystack = `${query} ${currentPath}`.toLowerCase();
  let score = 0;
  for (const keyword of card.keywords) {
    if (haystack.includes(keyword.toLowerCase())) score += 3;
  }
  if (currentPath.includes('schueler') && card.id.includes('student')) score += 4;
  if (currentPath.includes('planer') || currentPath.includes('termine')) {
    if (card.id === 'app-planner' || card.id === 'training-flow') score += 4;
  }
  if (currentPath.includes('einstellungen') && card.id === 'app-settings') score += 5;
  if (currentPath.includes('finanzen') && card.category === 'selbststaendigkeit') score += 4;
  if (currentPath.includes('fahrzeug') && card.id === 'vehicle-ops') score += 5;
  return score;
};

export async function retrieveKnowledgeCards(query: string, currentPath: string, limit = 5): Promise<AgentKnowledgeCard[]> {
  // Load dynamic knowledge cards
  const dynamicCards = await agentMemoryStore.getDynamicKnowledgeCards();
  const allCards = [...KNOWLEDGE_BASE, ...dynamicCards];

  const ranked = allCards
    .map((card) => ({ card, score: scoreCard(card, query, currentPath) }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .map((item) => item.card);

  const essentials = allCards.filter((card) => card.id === 'agent-safety' || card.id === 'agent-learning');
  const merged = [...ranked, ...essentials].filter(
    (card, index, arr) => arr.findIndex((item) => item.id === card.id) === index
  );

  return merged.slice(0, limit);
}
