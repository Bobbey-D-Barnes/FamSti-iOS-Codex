# FamSti iOS – Fahren mit Stil

> **Dein Fahrschul-Companion als native iOS-App für iPhone und iPad**

---

## 📋 Übersicht

FamSti ist eine professionelle Fahrlehrer-App zur Verwaltung von Fahrschülern, Fahrstunden, und der gesamten Fahrausbildung. Die App unterstützt KI-gestützte Analyse (Google Gemini), automatische Stundenplanung, und Echtzeit-Session-Tracking.

**Letzte Aktualisierung:** 2026-05-16  
**Version:** 1.0.0  
**Minimum iOS:** 16.0  
**Target iOS:** 26 (Liquid Glass Design)

---

## 🏗 Technologie-Stack

| Bereich | Technologie | Version |
|---------|-------------|---------|
| Framework | React Native | 0.81.5 |
| Plattform | Expo SDK | 54 |
| Sprache | TypeScript | 5.9 |
| Navigation | Expo Router | 6 |
| State/Data | @tanstack/react-query | 5 |
| Styling | NativeWind (Tailwind) | 4 |
| Storage | AsyncStorage + Supabase | - |
| AI | Google Gemini 3 Flash | via @google/genai |
| Icons | lucide-react-native | - |
| Animationen | Reanimated | 4.1 |
| Effekte | expo-blur, expo-haptics | - |
| Gradienten | expo-linear-gradient | - |

---

## 📁 Projektstruktur

```
FamSti-iOS/
├── app/                          # Expo Router – Screens
│   ├── _layout.tsx               # Root Layout (Providers, Stack)
│   ├── (tabs)/                   # Tab Navigation
│   │   ├── _layout.tsx           # Tab Bar Konfiguration
│   │   ├── index.tsx             # 📊 Dashboard
│   │   ├── schueler.tsx          # 👥 Schüler-Liste
│   │   ├── planer.tsx            # 📅 Wochenplaner
│   │   ├── erinnerungen.tsx      # 🔔 Erinnerungen
│   │   ├── pruefungen.tsx        # 🎓 Prüfungen
│   │   └── einstellungen.tsx     # ⚙️ Einstellungen
│   ├── schueler/
│   │   └── [id].tsx              # ✏️ Schüler bearbeiten/neu
│   └── session/
│       └── live.tsx              # 🚗 Live Fahrstunde
├── src/
│   ├── types.ts                  # TypeScript Interfaces
│   ├── constants.ts              # Pipeline, Curriculum, Demo-Daten
│   ├── components/
│   │   └── ui.tsx                # UI Komponentenbibliothek
│   ├── lib/
│   │   ├── storage.ts            # CRUD (AsyncStorage + Supabase)
│   │   ├── scheduler.ts          # Smart-Scheduler Algorithmus
│   │   ├── utils.ts              # Hilfsfunktionen
│   │   └── supabase.ts           # Supabase Client
│   └── services/
│       └── geminiService.ts      # Google Gemini AI Integration
├── assets/                       # Icons, Splash Screen
├── app.json                      # Expo Konfiguration
├── tailwind.config.js            # NativeWind Config
├── metro.config.js               # Metro Bundler Config
├── tsconfig.json                 # TypeScript Config
└── package.json                  # Dependencies
```

---

## 🖥 Screens

### 1. Dashboard (`app/(tabs)/index.tsx`)
- Tagesbegrüßung mit Datum
- Nächste-Fahrt Hero Card (Gradient, Play-Button)
- KPI-Cards (Aktive Schüler, Wochenstunden, Prüfungsreife)
- Heutige Fahrten
- Offene Aufgaben
- Fehlende Unterlagen Widget
- "Planung notwendig" Carousel (Sleepers)
- Quick Actions Grid

### 2. Schüler-Liste (`app/(tabs)/schueler.tsx`)
- Suchleiste mit Echtzeit-Filter
- Zone-Filter Chips (Rosenheim, Haidholzen, Prutting)
- FlatList mit Avatar, Fortschrittsbalken, Zone-Badge
- Pull-to-Refresh
- Plus-Button für neuen Schüler

### 3. Schüler-Editor (`app/schueler/[id].tsx`)
- Persönliche Daten (Name, Telefon, Email, Adresse)
- Zone Selector (3 Optionen)
- Dokumenten-Checkliste (Antrag, Passbild, Sehtest, Erste Hilfe)
- Ausbildungs-Tag Stepper (Tag 1-19)
- Max Fahrten/Woche Stepper
- Notizen (Multiline)
- Speichern / Löschen

### 4. Planer (`app/(tabs)/planer.tsx`)
- Wochennavigation (Vor/Zurück)
- Tages-Selector mit Aktivitätspunkten
- Auto-Plan Button (KI-Scheduler)
- Session-Cards mit Bestätigen/Löschen
- Unterstützt manuelle und automatische Planung

### 5. Live Session (`app/session/live.tsx`)
- Echtzeit-Timer (MM:SS)
- Student Info Header (Name, Tag, Zeit)
- Quick Actions: Navigation, Notizen, Eingriff-Zähler
- Stage Info Card mit Nacht/Autobahn-Badges
- KI-Coaching Tipp (Gemini)
- Curriculum Tracker (4 Kategorien, 23 Kompetenzen)
- Fahrt-Abschluss Modal (Buchen oder Stornieren)

### 6. Erinnerungen (`app/(tabs)/erinnerungen.tsx`)
- Aufgabenliste mit Check/Uncheck
- Überfällig-Markierung
- Neue Erinnerung erstellen (Modal)
- Löschen mit Bestätigung

### 7. Prüfungen (`app/(tabs)/pruefungen.tsx`)
- Stats: Prüfungsreife + Bestanden Zähler
- Prüfungsreife Schüler-Liste
- Anstehende Prüfungstermine
- Bestanden-Liste

### 8. Einstellungen (`app/(tabs)/einstellungen.tsx`)
- App Version Info
- Regeln (Pausenzeit, Nachtfahrt, Joker)
- Arbeitszeiten (Mo-Sa)
- Dashboard Widget Konfiguration
- Daten zurücksetzen (Danger Zone)

---

## 🧠 Business-Logik

### Scheduler (`src/lib/scheduler.ts`)
- **Prioritäts-Algorithmus**: Berechnet Score basierend auf Stufe, Notizen-Keywords, Prüfungsnähe
- **Kollisionsprüfung**: Verhindert Überschneidungen mit Gap-Zeit
- **planDay()**: Plant einen einzelnen Tag
- **planWeek()**: Plant Mo-Sa
- **projectMasterPlan()**: Projiziert 12 Wochen voraus mit virtuellem Fortschritt

### Storage (`src/lib/storage.ts`)
- **Dual-Storage**: AsyncStorage (lokal) + Supabase (optional cloud)
- **CRUD**: Students, Sessions, Rules, Reminders, Shortcuts
- **Auto-Init**: Demo-Daten bei erstem Start
- **Cascade Delete**: Löscht zugehörige Sessions bei Schüler-Löschung

### Gemini AI (`src/services/geminiService.ts`)
- **analyzeStudentProgress()**: KI-Analyse des Schülerfortschritts
- **getLiveCoachingTip()**: Echtzeit-Coaching-Tipps für den Fahrlehrer
- **getDashboardInsights()**: Dashboard Action Items

---

## 🎨 Datenmodell

### Student (30+ Felder)
- Persönlich: Name, Telefon, Email, Geburtsdatum, Geschlecht
- Ausbildung: Zone, Abholort, Stufe (1-18), Verfügbarkeiten
- Dokumente: Antrag, Passbild, Sehtest, Erste Hilfe
- Prüfungen: Theorie-Datum, Praxis-Datum, geplante Termine
- Training: Fortschritt pro Kompetenz (23 Items)

### Session
- Student-Referenz, Zone, Stufe, Datum, Start/Ende
- Bestätigt, Stornierungsgrund, Notizen, Eingriffe

### Rules
- Pausenzeit, Nachtfahrt-Start, Tag-11-Joker
- Arbeitszeiten (Mo-Sa mit Start/Ende/Max)
- Dashboard Widget Konfiguration
- Pipeline (18 Ausbildungsstufen)

### Curriculum (4 Kategorien)
1. **Grundstufe** (7 Items): Einweisung, Sitz, Motor, Anfahren...
2. **Grundfahraufgaben** (5 Items): Rückwärts, Einparken...
3. **Aufbaustufe** (7 Items): Blicktechnik, Vorfahrt...
4. **Leistungsstufe** (4 Items): Autobahn, Überland, Nacht...

---

## 🚀 App starten

### Voraussetzungen
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Xcode 16+ (für iOS Simulator)
- Apple Developer Account (für echtes Gerät / App Store)

### Entwicklung starten
```bash
cd FamSti-iOS
npm install
npx expo start
```

### Auf iPhone testen
1. Expo Go App aus dem App Store installieren
2. QR-Code scannen (vom Terminal)
3. App öffnet sich automatisch

### Für App Store bauen
```bash
# EAS CLI installieren
npm install -g eas-cli

# Einloggen
eas login

# iOS Build erstellen
eas build --platform ios

# In den App Store hochladen
eas submit --platform ios
```

---

## 🔧 Umgebungsvariablen

Erstelle eine `.env` Datei im Projektroot:

```env
EXPO_PUBLIC_GEMINI_API_KEY=dein-gemini-api-key
EXPO_PUBLIC_SUPABASE_URL=deine-supabase-url      # Optional
EXPO_PUBLIC_SUPABASE_KEY=dein-supabase-key        # Optional
```

---

## 📝 Changelog

### v1.0.0 (2026-05-16)
- Initiale iOS-App basierend auf FamSti PWA v0.5
- 8 Screens portiert (Dashboard, Schüler, Planer, Live Session, etc.)
- Nativer UI-Komponenten-Satz (Button, Card, Badge, Modal, etc.)
- AsyncStorage für lokale Datenpersistenz
- Gemini AI Integration (Coaching, Analyse, Insights)
- Smart-Scheduler mit Prioritäts-Algorithmus
- Haptic Feedback auf allen interaktiven Elementen
- Dark Mode Unterstützung
- iPad Unterstützung

---

## 🗺 Roadmap / Geplante Features

- [ ] iPad Split View (Sidebar + Detail)
- [ ] WidgetKit Integration (Nächste Fahrt Widget)
- [ ] Push Notifications (Background-Service)
- [ ] Sprachnotizen (expo-speech)
- [ ] Kalender-Sync (iOS Calendar)
- [ ] Export-Funktion (PDF/CSV)
- [ ] Offline-First mit Supabase Sync
- [ ] App Store Veröffentlichung

---

*Dieses Dokument wird als "Gedächtnis" der App gepflegt und bei jeder Änderung aktualisiert.*
