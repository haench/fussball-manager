# UI-/UX-Review – Fussball Manager

Datum: 2026-05-14

## Prüfkontext

- Fokus: Startscreen, Manager-Dashboard, Hauptnavigation, mobile Nutzbarkeit und Orientierung innerhalb der App.
- Der Playwright-E2E-Lauf wurde angestoßen, konnte in dieser Umgebung aber nicht ausgeführt werden, weil die Node-Abhängigkeiten nicht installiert sind und der Registry-/Proxy-Zugriff auf npm mit `403 Forbidden` blockiert wurde. Der vorhandene Playwright-Befehl endet daher mit `playwright: not found`.
- Als Ersatz wurden die vorhandenen Views, Styles und Smoke-Tests geprüft und die Navigation gezielt verbessert.

## Beobachtungen

### Stärken

- Die Startseite erklärt den Datenmodus früh und klar; das reduziert rechtliche und inhaltliche Missverständnisse bei Fantasie- und Importdaten.
- Die Manager-Ansicht bietet viele Schnellzugriffe über Dashboard-Kacheln und bildet die wichtigsten Manager-Aufgaben ab: Kader, Aufstellung, Training, Spieltag, Tabelle, Transfers und Verein.
- Mobile Tabellen- und Kaderansichten sind bereits speziell angepasst, statt nur breite Desktop-Tabellen zu verkleinern.
- Der visuelle Stil ist konsistent: runde Karten, grüne Primärfarbe, klare Pill-Elemente und fußballnahe Dashboard-Optik.

### Risiken und Reibungspunkte

- Die Hauptnavigation ist umfangreich. Auf kleineren Screens kann sie horizontal scrollen; ohne zusätzliche Hinweise oder Sticky-Verhalten verliert man nach längerem Scrollen leicht die Orientierung.
- Der aktive Navigationspunkt war visuell vorhanden, aber semantisch nicht als aktuelle Seite ausgezeichnet. Screenreader- und Tastaturnutzer erhalten dadurch weniger Kontext.
- Fokuszustände waren primär browserabhängig. Bei einer klickstarken Management-App sollten Buttons, Tabs, Imports, Selects und Inputs deutlich sichtbare Fokuszustände haben.
- Es gab keinen Skip-Link zum Hauptinhalt. Tastaturnutzer mussten nach jedem Rendern erneut durch Header und Navigation tabben.
- Der Startscreen nutzt Liga-Tabs visuell wie Tabs, hatte aber noch keine `role="tab"`-/`aria-selected`-Semantik.

## Direkt umgesetzte Verbesserungen

- Die Manager-Navigation bleibt jetzt beim Scrollen als Sticky-Leiste sichtbar, damit zentrale Bereiche schneller erreichbar bleiben.
- Aktive Navigationsbuttons tragen `aria-current="page"` und Liga-Tabs setzen `role="tab"` sowie `aria-selected`.
- Ein Skip-Link führt direkt zum Inhaltsbereich.
- Fokuszustände für Buttons, Links, Importlabel, Selects und Inputs sind deutlicher sichtbar.
- Der Inhaltsbereich hat ein `id`-Ziel und `scroll-margin-top`, damit Anker-/Skip-Navigation nicht unter der Sticky-Navigation verschwindet.

## Bewertung

Gesamteindruck: **solide Basis mit klarer Fußballmanager-Identität**. Die App wirkt funktionsreich und ist auf mobilen Screens schon deutlich besser vorbereitet als eine reine Desktop-Portierung. Der größte Hebel liegt nicht in mehr Features, sondern in Orientierung, Priorisierung und Bedienfeedback.

- UI: **7/10** – konsistent und thematisch passend, aber an manchen Stellen sehr informationsdicht.
- UX: **7/10** – Kernwege sind vorhanden; Feedback und Priorisierung können weiter geschärft werden.
- Navigation: **6.5/10 vor den Änderungen, 7.5/10 nach den Änderungen** – Sticky-Navigation, Semantik und Skip-Link reduzieren Reibung spürbar.

## Weitere Empfehlungen

1. **Onboarding nach Vereinswahl ergänzen**  
   Eine kurze „Nächste beste Aktion“-Box könnte nach dem Start erklären: Aufstellung prüfen → Training planen → Spieltag starten.

2. **Mobile Navigation noch stärker priorisieren**  
   Die aktuelle horizontale Navigation funktioniert, aber ein Bottom-Nav für die vier wichtigsten Bereiche oder ein „Mehr“-Menü könnte Wege verkürzen.

3. **Dashboard-Kacheln stärker als Aufgabenfluss nutzen**  
   Kacheln könnten Status-Badges zeigen, z. B. „Aufstellung unvollständig“, „Training geplant“ oder „Spieltag bereit“.

4. **Aktionen mit unmittelbarem Feedback versehen**  
   Nach Simulation, Transferangebot oder Trainingsautomatik wären Toasts oder kurze Erfolgs-/Warnhinweise hilfreich.

5. **Tabellen auf Desktop scannbarer machen**  
   Sticky Header, kompaktere Spaltenüberschriften und optionales Hervorheben des eigenen Clubs auch beim horizontalen Scrollen würden helfen.

6. **Playwright-Review in CI stabilisieren**  
   Sobald npm-Zugriff verfügbar ist, sollte ein E2E-Test die Kernreise abdecken: Startseite → Club wählen → Dashboard → Navigation zu Spieltag/Training/Aufstellung → Screenshot mobile.
