# Implementierungsplan – Fußballmanager für Kinder

Ziel: Ein einfacher, kindgerechter Fußballmanager, der nach jedem Implementierungsschritt lauffähig bleibt. Jeder Schritt erweitert das Spiel um genau einen nutzbaren Game Loop oder eine klar abgegrenzte Funktion.

Grundprinzipien:

- Jeder Schritt muss eine spielbare Version ergeben.
- Neue Eigenschaften werden erst eingeführt, wenn sie für den jeweiligen Loop benötigt werden.
- Alle Balancing-Werte sollen später über JSON-/Text-Konfigurationen änderbar sein, nicht hart im Code stehen.
- Das Spiel bleibt bewusst einfach, aber langfristig motivierend.
- Zielgruppe: Kinder, ungefähr 10 Jahre.
- Bedienung: wenige klare Entscheidungen, schnelle Rückmeldung, kurze Spielrunden.

---

# 0. Technische Grundlage

## Ziel dieses Schritts

Eine minimale Browser-App bereitstellen, auf der alle späteren Loops aufbauen.

## Tech Stack

Empfohlen:

- HTML
- CSS
- JavaScript
- optional später: Vue, wenn die UI komplexer wird

Für den Start reicht Plain HTML/CSS/JavaScript.

## Grundstruktur

Benötigte Bildschirme am Anfang:

1. Startbildschirm
2. Hauptbildschirm / Vereinszentrale
3. Spielbildschirm
4. Ergebnisbildschirm

## Minimale Dateien

Beispielstruktur:

```text
/index.html
/src/main.js
/src/state.js
/src/config.js
/src/gameLoop.js
/src/matchSimulation.js
/src/styles.css
/data/config.json
```

## Globaler Spielzustand

Zu Beginn minimal:

```js
const gameState = {
  currentDay: 1,
  money: 50000,
  clubName: "Felix FC",
  managerName: "Felix",
  currentScreen: "home"
};
```

## Akzeptanzkriterien

- App startet im Browser.
- Startbildschirm wird angezeigt.
- Button „Spiel starten“ führt zur Vereinszentrale.
- Vereinszentrale zeigt Vereinsname, Managername, Spieltag und Kontostand.

---

# 1. Main Game Loop – erstes lauffähiges Kernspiel

## Ziel dieses Schritts

Der Spieler kann ein Fußballspiel starten, eine kurze Live-Simulation sehen und danach ein Ergebnis erhalten.

Dies ist der wichtigste Loop des gesamten Spiels.

## Spielerlebnis

1. Spieler sieht die Vereinszentrale.
2. Spieler klickt auf „Nächstes Spiel“.
3. Spielbildschirm öffnet sich.
4. Spiel läuft live ca. 90 Sekunden.
5. Ergebnis wird angezeigt.
6. Spieler klickt „Weiter“.
7. Spieltag erhöht sich.
8. Spieler ist zurück in der Vereinszentrale.

## Neu benötigte Daten: Team und Spieler

Jetzt werden erstmals Spieler benötigt.

### Spieler

Minimal:

```js
const player = {
  id: "p1",
  name: "Max Müller",
  strength: 35,
  isStarter: true
};
```

### Bedeutung

- `strength`: Spielerstärke von 1 bis 100.
- `isStarter`: Gibt an, ob der Spieler in der Startelf steht.

Weitere Eigenschaften wie Alter, Müdigkeit, Gehalt, Vertrag etc. werden hier noch nicht eingeführt.

## Team

```js
const team = {
  id: "felix-fc",
  name: "Felix FC",
  players: []
};
```

## Startaufstellung

Regel:

- Es müssen genau 11 Spieler in der Startelf sein.
- Weitere Spieler können auf der Bank sein.

Für die erste Version kann die Startelf automatisch gesetzt sein.

## Gegner

Für das erste Spiel reicht ein einfacher Gegner:

```js
const opponent = {
  name: "SV Neustadt",
  averageStrength: 32
};
```

Später wird daraus ein echter Verein mit eigenem Kader.

## Teamstärke berechnen

```js
function calculateTeamStrength(team) {
  const starters = team.players.filter(p => p.isStarter);
  const sum = starters.reduce((total, p) => total + p.strength, 0);
  return sum / starters.length;
}
```

## Match-Simulation

### Dauer

- 90 Spielminuten
- 1 Spielminute = ca. 1 echte Sekunde
- Gesamtdauer: ca. 90 Sekunden

Für Testzwecke kann später ein schneller Modus eingebaut werden.

### Anzeige

Oben:

- Heimteam vs. Auswärtsteam
- Spielstand
- aktuelle Spielminute

Darunter:

- Live-Ticker mit den letzten 2 Ereignissen

Hauptbereich:

- Fußballfeld von oben
- 11 Kreise für eigenes Team
- 11 Kreise für Gegner
- Ball als kleiner Kreis
- Kreise bewegen sich sichtbar über das Spielfeld

Unten:

- Taktikbuttons, zunächst sichtbar, aber erst in Schritt 2 aktiv:
  - Aggressiv
  - Normal
  - Defensiv

## Vereinfachte Wahrscheinlichkeit für Tore

Die stärkere Mannschaft soll häufiger gewinnen, aber Außenseiter-Siege müssen möglich bleiben.

### Grundidee

Pro Spielminute wird berechnet, ob eine Torchance entsteht.

Beispiel:

```js
const ownStrength = calculateTeamStrength(ownTeam);
const opponentStrength = opponent.averageStrength;
const strengthDiff = ownStrength - opponentStrength;
```

### Basiswahrscheinlichkeit

```js
ownGoalChancePerMinute = 0.015;
opponentGoalChancePerMinute = 0.015;
```

### Stärkeeinfluss

```js
ownGoalChancePerMinute += strengthDiff * 0.0005;
opponentGoalChancePerMinute -= strengthDiff * 0.0005;
```

### Grenzen

Damit Underdogs immer Chancen haben:

```js
ownGoalChancePerMinute = clamp(ownGoalChancePerMinute, 0.004, 0.05);
opponentGoalChancePerMinute = clamp(opponentGoalChancePerMinute, 0.004, 0.05);
```

## Ereignisse im Live-Ticker

Mögliche Events:

- „12. Minute: Felix FC greift über links an.“
- „25. Minute: Große Chance für SV Neustadt.“
- „31. Minute: TOR für Felix FC!“
- „63. Minute: Starker Schuss, aber gehalten.“

## Ergebnisbildschirm

Nach 90 Minuten:

- Paarung
- Endstand
- große Bewertung:
  - Sieg
  - Unentschieden
  - Niederlage
- Button „Weiter“

## Akzeptanzkriterien

- Spieler kann ein Spiel starten.
- 90-Minuten-Simulation läuft sichtbar.
- Spielstand verändert sich durch Wahrscheinlichkeiten.
- Live-Ticker zeigt Ereignisse.
- Ergebnisbildschirm erscheint.
- Nach „Weiter“ steigt der Spieltag um 1.
- App bleibt danach weiter spielbar.

---

# 2. Main Game Loop Erweiterung – Taktik während des Spiels

## Ziel dieses Schritts

Der Spieler kann während der laufenden Simulation aktiv eingreifen.

## Neue Eigenschaft: Match-Taktik

Im Spielzustand:

```js
currentTactic: "normal"
```

Mögliche Werte:

- `aggressive`
- `normal`
- `defensive`

## UI

Am unteren Bildschirmrand drei Buttons:

1. Aggressiv
2. Normal
3. Defensiv

Der aktive Button wird hervorgehoben.

## Wirkung

### Normal

Standardwerte. Keine Änderung.

```js
ownAttackModifier = 1.0;
ownDefenseModifier = 1.0;
```

### Aggressiv

Mehr eigene Tore, aber mehr Gegentore.

```js
ownAttackModifier = 1.35;
opponentAttackModifier = 1.25;
```

Einsatz:

- sinnvoll bei Rückstand

### Defensiv

Weniger Gegentore, aber auch weniger eigene Tore.

```js
ownAttackModifier = 0.75;
opponentAttackModifier = 0.65;
```

Einsatz:

- sinnvoll bei Führung

## Integration in Wahrscheinlichkeiten

```js
ownGoalChancePerMinute *= ownAttackModifier;
opponentGoalChancePerMinute *= opponentAttackModifier;
```

## Akzeptanzkriterien

- Spieler kann während des Spiels zwischen drei Taktiken wechseln.
- Aktive Taktik ist sichtbar.
- Taktik beeinflusst Torwahrscheinlichkeiten sofort.
- Aggressiv fühlt sich riskanter an.
- Defensiv fühlt sich sicherer, aber offensiv schwächer an.

---

# 3. Kader-Management Loop – Startelf und Bank

## Ziel dieses Schritts

Der Spieler kann seinen Kader ansehen und bestimmen, welche 11 Spieler starten.

## Neue Ansicht: Kaderbildschirm

UI:

- Tabelle mit Spielern
- oben Startelf
- darunter Bank / übrige Spieler
- Spalten:
  - Name
  - Stärke
  - Status: Startelf / Bank

## Bestehende Spielereigenschaften

Weiterhin nur:

```js
{
  id,
  name,
  strength,
  isStarter
}
```

## Regeln

- Genau 11 Spieler müssen Startspieler sein.
- Spieler kann Startelf ändern.
- Wenn bereits 11 Startspieler gesetzt sind und ein Bankspieler ausgewählt wird, muss ein anderer Spieler auf die Bank.

Für eine kindgerechte Bedienung empfohlen:

- Button „In Startelf“
- Button „Auf Bank“
- Warnung, wenn weniger oder mehr als 11 Spieler gewählt wurden
- Button „Beste 11 automatisch aufstellen“

## Wirkung auf Match

Die Match-Stärke berechnet sich nur aus der Startelf.

## Akzeptanzkriterien

- Kaderbildschirm ist erreichbar.
- Spieler sieht Startelf und Bank.
- Spieler kann Startelf ändern.
- Spiel kann nur mit gültiger Startelf gestartet werden.
- Geänderte Startelf beeinflusst Match-Ergebnis.

---

# 4. Trainingsanlagen & Spielerentwicklung Loop

## Ziel dieses Schritts

Spieler können langfristig stärker werden, aber nur wenn die Trainingsanlage gut genug ist.

## Neue Eigenschaft: Trainingsanlage

Im Verein:

```js
trainingFacility: {
  level: 20,
  upgradeInProgress: null
}
```

Level:

- 0 bis 100
- Startwert: 20

## Neue Spielereigenschaft: Alter

Jetzt wird Alter benötigt, weil es die Entwicklung beeinflusst.

```js
age: 19
```

## Entwicklungsregel

Ein Spieler kann sich nur verbessern, wenn:

```text
trainingFacility.level > player.strength
```

Beispiel:

- Spieler Stärke 35
- Trainingsanlage 20
- keine Verbesserung möglich

- Spieler Stärke 18
- Trainingsanlage 20
- Verbesserung möglich

## Altersabhängige Entwicklung

Beispielwerte:

| Alter | Entwicklung |
|---|---|
| 17–22 | schnell |
| 23–28 | normal |
| 29–32 | langsam |
| 33+ | kaum / keine Verbesserung |

## Umsetzung pro Spieltag

Nach jedem Spieltag wird geprüft, ob Spieler sich verbessern.

Beispiel:

```js
function getDevelopmentChance(player) {
  if (player.age <= 22) return 0.25;
  if (player.age <= 28) return 0.12;
  if (player.age <= 32) return 0.05;
  return 0.01;
}
```

Wenn Entwicklung gelingt:

```js
player.strength += 1;
```

Maximal:

```js
player.strength <= trainingFacility.level
```

## Ausbau der Trainingsanlage

Spieler kann Geld ausgeben, um die Anlage zu verbessern.

Beispiel:

```js
upgradeTrainingFacility({
  targetLevel: currentLevel + 5,
  cost: 25000,
  durationDays: 5
});
```

Während Ausbau:

- Geld wird sofort abgezogen.
- Ausbau läuft über mehrere Spieltage.
- Nach Ablauf steigt Level.

## UI

Trainingsbildschirm:

- aktueller Trainingslevel
- Erklärung: „Spieler können nur bis zur Stärke deiner Trainingsanlage wachsen.“
- Button „Trainingsanlage verbessern“
- Kosten
- Bauzeit
- Fortschritt, falls Ausbau läuft

## Akzeptanzkriterien

- Trainingsanlage wird angezeigt.
- Spieler kann Anlage verbessern.
- Ausbau kostet Geld und dauert mehrere Spieltage.
- Spieler entwickeln sich nach Spielen abhängig von Alter und Anlage.
- Entwicklung wird als Nachricht angezeigt, z. B. „Tom ist stärker geworden: 34 → 35“.

---

# 5. Sondertraining & Erholung Loop

## Ziel dieses Schritts

Der Spieler bekommt kurzfristige Entscheidungen vor einem Spiel: Mannschaft pushen oder erholen lassen.

## Neue Spielereigenschaft: Müdigkeit

```js
fatigue: 0
```

Wert:

- 0 bis 100
- 0 = frisch
- 100 = völlig erschöpft

## Effektive Stärke

Ab jetzt wird im Match nicht mehr nur `strength` genutzt, sondern:

```js
effectiveStrength = strength + temporaryBonus - fatiguePenalty
```

Beispiel:

```js
fatiguePenalty = Math.floor(player.fatigue / 20);
```

Fatigue 40 bedeutet also etwa -2 Stärke.

## Sondertraining

Vor dem Spiel möglich.

Kosten:

- Geldbetrag pro Nutzung

Wirkung:

- kurzfristig +1 Stärke für das nächste Spiel
- Müdigkeit steigt

Beispiel:

```js
specialTraining: {
  cost: 5000,
  strengthBonus: 1,
  fatigueIncrease: 10
}
```

## Erholung / Freizeit

Alternative Aktion.

Beispiele:

- freier Tag
- Mannschaftsausflug
- Regeneration

Wirkung:

- Müdigkeit sinkt
- kein kurzfristiger Stärkebonus

Beispiel:

```js
recoveryActivity: {
  cost: 3000,
  fatigueReduction: 15
}
```

## Entscheidungsbildschirm vor dem Spiel

Optionen:

1. Normal vorbereiten
2. Sondertraining durchführen
3. Erholung / Freizeit

## Balancing-Idee

- Sondertraining vor wichtigen Spielen hilfreich.
- Dauerhaftes Sondertraining macht Spieler müde.
- Erholung wird notwendig.

## Akzeptanzkriterien

- Spieler kann vor dem Spiel Sondertraining wählen.
- Sondertraining kostet Geld.
- Sondertraining erhöht kurzfristig Stärke.
- Sondertraining erhöht Müdigkeit.
- Müdigkeit senkt effektive Stärke.
- Spieler kann Erholung wählen, um Müdigkeit zu senken.

---

# 6. Stadion & Zuschauer Loop

## Ziel dieses Schritts

Der Spieler verdient Geld über Zuschauer und kann das Stadion ausbauen.

## Neue Vereinseigenschaft: Stadion

```js
stadium: {
  stands: {
    north: { capacity: 100, upgradeInProgress: null },
    south: { capacity: 100, upgradeInProgress: null },
    east: { capacity: 200, upgradeInProgress: null },
    west: { capacity: 200, upgradeInProgress: null }
  }
}
```

## Gesamtkapazität

```js
capacity = north + south + east + west
```

Startbeispiel:

- Nord: 100
- Süd: 100
- Ost: 200
- West: 200
- Gesamt: 600

## Neue Einstellung: Ticketpreis

```js
ticketPriceLevel: "medium"
```

Optionen:

- niedrig
- mittel
- hoch

Beispielwerte zunächst:

| Preisstufe | Preis |
|---|---|
| niedrig | 4 € |
| mittel | 6 € |
| hoch | 8 € |

Ligaabhängige Werte kommen später im Langzeitloop.

## Zuschauerberechnung

Einflussfaktoren:

1. Stadionkapazität
2. Ticketpreis
3. sportliche Form der letzten Spiele

## Neue Eigenschaft: Ergebnis-Historie

Jetzt benötigt:

```js
lastResults: ["W", "D", "L"]
```

Maximal z. B. letzte 5 Spiele speichern.
Achtung: Ist bereits implementiert.

## Formfaktor

Beispiel:

```js
W = +0.10
D = 0
L = -0.10
```

Letzte 5 Spiele ergeben einen Formwert.

## Ticketpreisfaktor

```js
low: 1.10
medium: 1.00
high: 0.85
```

## Zuschauerformel

```js
baseDemand = stadiumCapacity * 0.75;
demand = baseDemand * formFactor * ticketPriceFactor;
attendance = clamp(Math.round(demand), 0, stadiumCapacity);
```

## Einnahmen

```js
revenue = attendance * ticketPrice;
```

## Stadionausbau

Jede Tribüne kann einzeln erweitert werden.

Beispiel:

```js
upgradeStand("north", {
  addCapacity: 100,
  cost: 30000,
  durationDays: 5
});
```

Regeln:

- Ausbau kostet Geld.
- Ausbau dauert z. B. 5 Spieltage.
- Während der Bauphase kann die Tribüne optional reduzierte Kapazität haben.
- Nach Fertigstellung steigt Kapazität.

## Anzeige im Spielbildschirm

Während des Spiels anzeigen im oberen Bereich neben der aktuellen Spielzeit anzeigen:

```text
520 (Zuschauersymbol)
```

Zuschauersymbol soll nicht ausgeschrieben sein, sondern ein Symbol sein das Zuschauer repräsentiert.
## Akzeptanzkriterien

- Stadionbildschirm zeigt vier Tribünen.
- Gesamtkapazität wird berechnet.
- Spieler kann Ticketpreis wählen.
- Zuschauerzahl wird pro Heimspiel berechnet.
- Einnahmen werden gutgeschrieben.
- Stadionausbau kostet Geld und dauert mehrere Spieltage.
- Gute Ergebnisse führen zu mehr Zuschauern.
- Hohe Preise reduzieren Zuschauerzahl.

---

# 7. Finanzen & Gehälter Loop

## Ziel dieses Schritts

Der Verein bekommt laufende Kosten. Der Spieler muss wirtschaftlich planen.

## Neue Spielereigenschaft: Gehalt

```js
salaryPerMatchDay: 1000
```

Bedeutung:

- Gehalt wird pro Spieltag bezahlt.

## Finanzabrechnung pro Spieltag

Nach jedem Spiel:

Einnahmen:

- Zuschauererlöse

Ausgaben:

- Spielergehälter

```js
salaryCosts = players.reduce((sum, p) => sum + p.salaryPerMatchDay, 0);
gameState.money += ticketRevenue;
gameState.money -= salaryCosts;
```

## UI

Nach Spiel oder im Ergebnisbildschirm:

```text
Zuschauereinnahmen: +3.120 €
Gehälter: -18.000 €
Neuer Kontostand: 45.120 €
```

## Akzeptanzkriterien

- Jeder Spieler hat Gehalt.
- Nach jedem Spieltag werden Gehälter abgezogen.
- Ergebnisbildschirm zeigt Einnahmen und Ausgaben.
- Kontostand verändert sich nachvollziehbar.

---

# 8. Jugendarbeit Loop

## Ziel dieses Schritts

Der Verein kann junge Spieler entwickeln und langfristig günstige Talente erhalten.

## Neue Vereinseigenschaft: Jugendzentrum

```js
youthAcademy: {
  level: 20,
  upgradeInProgress: null
}
```

Level:

- 0 bis 100

## Ausbau

Wie Trainingsanlage:

- kostet Geld
- dauert mehrere Spieltage
- erhöht Level

## Jugendspieler-Angebote

Etwa 2x pro Saison erscheint ein Jugendspieler.

Für die erste Umsetzung:

- alle 17 Spieltage prüfen
- oder zufällig mit begrenzter Häufigkeit

## Neue Jugendspieler-Eigenschaften

Der erzeugte Jugendspieler nutzt bereits bekannte Eigenschaften:

```js
{
  id,
  name,
  strength,
  age,
  fatigue: 0,
  salaryPerMatchDay,
  isStarter: false
}
```

## Stärke des Jugendspielers

Orientiert sich am Jugendzentrum.

Beispiel:

```js
minStrength = Math.max(10, youthAcademy.level - 20);
maxStrength = youthAcademy.level;
```

Bei Jugendzentrum 60:

- Spieler etwa Stärke 40–60

## Gehalt

Jugendspieler starten mit niedrigem Gehalt.

## UI-Ereignis

```text
Neuer Jugendspieler entdeckt!
Leon Schmidt, 17 Jahre, Stärke 42.
In den Kader übernehmen?
```

Optionen:

- übernehmen
- ablehnen

## Akzeptanzkriterien

- Jugendzentrum wird angezeigt.
- Spieler kann Jugendzentrum verbessern.
- Gelegentlich erscheint Jugendspieler.
- Stärke hängt vom Jugendzentrum ab.
- Jugendspieler kann in den Kader übernommen werden.

---

# 9. Verträge & Vertragsverlängerungen Loop

## Ziel dieses Schritts

Spieler bleiben nicht automatisch für immer. Der Spieler muss Verträge verlängern und Gehälter verhandeln.

## Neue Spielereigenschaft: Vertragslaufzeit

```js
contractDaysRemaining: 34
```

Bedeutung:

- Anzahl Spieltage bis Vertragsende

## Ablauf pro Spieltag

Nach jedem Spieltag:

```js
player.contractDaysRemaining -= 1;
```

## Warnungen

Wenn Vertrag bald ausläuft:

```text
Der Vertrag von Max Müller läuft in 5 Spieltagen aus.
```

## Vertragsverlängerung

Spieler kann Gehalt anbieten.

Optionen kindgerecht:

- niedriges Angebot
- faires Angebot
- hohes Angebot

## Gehaltsforderung

Hängt ab von:

- Stärke
- Alter
- Entwicklung der letzten Spieltage
- aktuelles Gehalt

## Neue Eigenschaft: Entwicklungs-Historie

Nur falls benötigt, einfach halten:

```js
strengthGainedThisSeason: 0
```

Wird erhöht, wenn Spieler stärker wird.

## Beispiel-Forderung

```js
baseDemand = player.strength * 100;
if (player.strengthGainedThisSeason >= 3) baseDemand *= 1.25;
if (player.age <= 22) baseDemand *= 1.10;
```

## Annahmewahrscheinlichkeit

```js
if offeredSalary >= demand: high chance
if offeredSalary slightly below demand: medium chance
if offeredSalary far below demand: low chance
```

Beispiel:

- hohes Angebot: 95 % Annahme
- faires Angebot: 75 % Annahme
- niedriges Angebot: 35 % Annahme

## Wenn abgelehnt

Spieler sagt:

```text
Das ist mir zu wenig. Ich möchte mehr Gehalt.
```

Der Spieler kann später erneut verhandeln.

## Wenn Vertrag ausläuft

Einfache erste Regel:

- Spieler verlässt den Verein.

## Akzeptanzkriterien

- Spieler haben Vertragslaufzeit.
- Verträge laufen pro Spieltag herunter.
- Warnungen erscheinen rechtzeitig.
- Spieler kann Gehaltsangebote machen.
- Spieler akzeptiert oder lehnt ab.
- Stärkere und stark verbesserte Spieler verlangen mehr.

---

# 10. Transfermarkt Loop

## Ziel dieses Schritts

Der Spieler kann neue Spieler kaufen und eigene Spieler verkaufen.

## Neue Transferdaten

Für Spieler:

```js
marketValue: 50000
isOnTransferList: false
```

## Marktwert

Abhängig von:

- Stärke
- Alter

Einfache Formel:

```js
marketValue = strength * strength * 100;
```

Später ligaabhängig.

## Kaufen

Transfermarkt zeigt Liste verfügbarer Spieler.

Spalten:

- Name
- Alter
- Stärke
- Ablöse

Aktion:

- „Kaufen“

Bei Kauf:

- Ablöse wird abgezogen.
- Spieler kommt in den Kader.

## Verkaufen

Eigene Spieler können auf Transferliste gesetzt werden.

Ereignis:

- anderer Verein macht Angebot

```text
Der SV Grün-Weiß bietet 80.000 € für Tim Becker.
```

Optionen:

- annehmen
- ablehnen

## Externe Kaufangebote

Auch ohne Transferliste können selten Angebote kommen.

## UI

Neue Kachel für Transfermarkt.

## Akzeptanzkriterien

- Transfermarkt ist erreichbar.
- Spieler kann andere Spieler kaufen.
- Geld wird korrekt abgezogen.
- Spieler wird dem Kader hinzugefügt.
- Eigene Spieler können verkauft werden.
- Geld wird gutgeschrieben.
- Verkaufter Spieler wird entfernt.

---

# 11. Sponsoren Loop

## Ziel dieses Schritts

Der Verein bekommt regelmäßige Einnahmen pro Spieltag und kann bessere Sponsoren gewinnen.

## Neue Vereinseigenschaft: Sponsor

```js
sponsor: {
  name: "Müller Getränke",
  paymentPerMatchDay: 5000,
  trustPenalty: 0
}
```

## Zahlung

Nach jedem Spieltag:

```js
gameState.money += sponsor.paymentPerMatchDay;
```

## Neue Angebote

Der Spieler kann im Sponsorenbildschirm nach Angeboten schauen.

Angebote hängen ab von:

- Liga
- Tabellenleistung / Form
- Häufigkeit von Sponsorwechseln

## Zu häufiges Wechseln

Neue Eigenschaft:

```js
sponsorChangesThisSeason: 0
```

Jeder Wechsel erhöht den Wert.

Je höher der Wert:

- desto schlechter neue Angebote
- Sponsoren vertrauen dem Verein weniger

## Gute Leistung

Gute Ergebnisse verbessern Angebote.

## Schlechte Leistung

Schlechte Ergebnisse verschlechtern Angebote.

## Akzeptanzkriterien

- Sponsor zahlt pro Spieltag Geld.
- Sponsorenbildschirm zeigt aktuellen Sponsor.
- Neue Angebote können erscheinen.
- Spieler kann Sponsor wechseln.
- Häufige Wechsel verschlechtern spätere Angebote.
- Gute sportliche Leistung verbessert Angebote.

---

# 12. Saisonziele Loop

## Ziel dieses Schritts

Der Spieler bekommt ein klares Ziel pro Saison und bei Erfolg einen Bonus.

## Neue Saison-Eigenschaft

```js
seasonGoal: {
  type: "top6",
  bonus: 100000,
  achieved: false
}
```

## Zielauswahl zu Saisonbeginn

Optionen:

- Klassenerhalt / Top 15: kleiner Bonus
- Top 10: mittlerer Bonus
- Top 6: hoher Bonus
- Aufstieg: sehr hoher Bonus

## Schwierigkeit vs. Belohnung

Je ambitionierter das Ziel:

- desto höher der Bonus

## Saisonende

Wenn Ziel erreicht:

```js
gameState.money += seasonGoal.bonus;
```

Nachricht:

```text
Saisonziel erreicht! Du erhältst 100.000 € Bonus.
```

Wenn nicht erreicht:

```text
Saisonziel verpasst. Nächste Saison klappt es bestimmt!
```

## Akzeptanzkriterien

- Zu Saisonbeginn kann Ziel gewählt werden.
- Ziel wird in Vereinszentrale angezeigt.
- Am Saisonende wird Ziel geprüft.
- Bei Erfolg gibt es Bonusgeld.

---
# 13. Team-, Liga-, Tabellen- und Saison-Loop

## Ziel dieses Schritts

Das Spiel erhält echte Spielstrukturen mit Vereinen, Kadern, Ligen, Tabellen, Spieltagen, Saisons sowie Aufstieg und Abstieg.

Bisher sind Teams noch nicht vollständig im Spiel implementiert. Dieses Feature führt daher zuerst eine belastbare Team- und Liga-Datenstruktur ein. Als Basis dient die Datei:

`fussball_manager_1_2_3_liga_fiktiv_anonymisiert.json`

Diese Datei enthält fiktive/anonymisierte Vereine und Spieler aus drei Ligen und soll beim Spielstart geladen oder in die Anwendung eingebunden werden.

---

# 13.1 Team- und Kader-Implementierung

## Ziel

Die Vereine aus der JSON-Datei werden als spielbare Teams in den Spielzustand übernommen.

Jeder Verein besitzt:

- eindeutige ID
- Name
- Liga-Zuordnung
- Kader
- Teamstärke
- Startelf
- Bank / Ersatzspieler
- Taktik / Formation
- Saisonwerte
- Tabellenwerte

## Neue Struktur: Team

```js
team: {
  id: "team_001",
  name: "FC Beispielstadt",
  leagueId: "liga1",

  players: [],

  formation: "4-3-3",

  strength: 72,

  finances: {
    balance: 500000,
    weeklyWages: 0
  },

  season: {
    goalsFor: 0,
    goalsAgainst: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0
  }
}
````

## Neue Struktur: Player

Die Spieler werden aus der JSON-Datei übernommen. Fehlende Werte wurden bereits in der anonymisierten JSON ergänzt.

```js
player: {
  id: "player_001",
  name: "Lukas Beispiel",
  number: 10,
  position: "MF",
  age: 24,
  strength: 71,
  potential: 78,
  fitness: 100,
  morale: 70,
  nationalities: ["Deutschland"],
  isStarter: false
}
```

## Teamstärke

Die Teamstärke wird initial aus den Spielern berechnet.

Für die erste Umsetzung:

```js
team.strength = averageStrengthOfBestEleven(team.players)
```

Optional später:

- Formation berücksichtigen
    
- Fitness berücksichtigen
    
- Moral berücksichtigen
    
- Heimvorteil berücksichtigen
    
- Positionsabdeckung berücksichtigen
    

## Startelf

Beim Laden der Teams soll automatisch eine Startelf erzeugt werden.

Regeln:

- genau 11 Startspieler
    
- bevorzugt stärkste Spieler
    
- später positionsabhängig anhand Formation
    
- übrige Spieler sind Bank / Reserve
    

Für erste Umsetzung reicht:

```js
autoPickBestEleven(team.players)
```

Später soll die bestehende Kader-Management-Logik verwendet werden.

---

# 13.2 JSON-Datenquelle

## Basisdatei

Die Datei `fussball_manager_1_2_3_liga_fiktiv_anonymisiert.json` ist die zentrale Datenquelle für initiale Vereine und Spieler.

Beim Spielstart wird daraus der initiale Spielzustand erzeugt.

## Erwartete Daten

Die Datei enthält:

- 3 Ligen
    
- 56 fiktive Vereine
    
- 1528 fiktive Spieler
    

Für den ersten Liga-Loop werden pro Liga 18 Vereine benötigt.

## Umgang mit 56 Vereinen

Da das Liga-System zunächst mit 18 Vereinen pro Liga arbeitet, müssen die Teams beim Import normalisiert werden.

Regel für erste Umsetzung:

- Liga 1: 18 Vereine
    
- Liga 2: 18 Vereine
    
- Liga 3: 18 Vereine
    
- übrige Vereine werden ignoriert oder als Reserve gespeichert
    

Empfohlene Struktur:

```js
database: {
  leagues: [],
  teams: [],
  players: [],
  reserveTeams: []
}
```

Falls eine Liga mehr als 18 Vereine enthält, werden nur die ersten 18 verwendet.

Falls eine Liga weniger als 18 Vereine enthält, soll die Initialisierung mit einer klaren Fehlermeldung abbrechen.

---

# 13.3 Liga-Struktur

## Ziel

Das Spiel läuft über echte Saisons mit Ligen, Tabellen, Aufstieg und Abstieg.

## Neue Struktur: League

```js
league: {
  id: "liga3",
  name: "3. Liga",
  level: 3,

  teamIds: [],

  matchDay: 1,
  totalMatchDays: 34,

  schedule: [],
  standings: []
}
```

## Ligagröße

Jede Liga hat:

- 18 Vereine
    
- 34 Spieltage
    
- Hin- und Rückrunde
    

## Ligen

Für die erste Umsetzung:

```js
leagues: [
  {
    id: "liga1",
    name: "1. Liga",
    level: 1
  },
  {
    id: "liga2",
    name: "2. Liga",
    level: 2
  },
  {
    id: "liga3",
    name: "3. Liga",
    level: 3
  }
]
```

Die echten Namen aus der Quelle sind bereits anonymisiert. Die Ligen dürfen generisch benannt werden oder die Namen aus der JSON übernehmen.

---

# 13.4 Tabelle

## Ziel

Jede Liga besitzt eine Tabelle, die nach jedem Spieltag aktualisiert wird.

## Struktur: Standing

Pro Team:

```js
standing: {
  teamId: "team_001",

  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,

  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,

  points: 0
}
```

## Punkte

- Sieg: 3 Punkte
    
- Unentschieden: 1 Punkt
    
- Niederlage: 0 Punkte
    

## Sortierung der Tabelle

Die Tabelle wird sortiert nach:

1. Punkte
    
2. Tordifferenz
    
3. Geschossene Tore
    
4. Siege
    
5. Teamname
    

---

# 13.5 Spielplan

## Ziel

Für jede Liga wird ein vollständiger Spielplan erzeugt.

## Anforderungen

- 18 Teams pro Liga
    
- 34 Spieltage
    
- jedes Team spielt pro Spieltag genau ein Spiel
    
- jedes Team spielt gegen jedes andere Team zweimal
    
- einmal zuhause
    
- einmal auswärts
    

## Struktur: Match

```js
match: {
  id: "match_liga3_001",
  leagueId: "liga3",
  matchDay: 1,

  homeTeamId: "team_001",
  awayTeamId: "team_002",

  homeGoals: null,
  awayGoals: null,

  played: false,
  isUserMatch: false
}
```

## Spielplan-Generierung

Für die erste Umsetzung kann eine einfache Rundengenerierung verwendet werden.

Akzeptiert ist:

- Round-Robin-Verfahren
    
- Hinrunde mit 17 Spieltagen
    
- Rückrunde mit getauschtem Heimrecht
    
- insgesamt 34 Spieltage
    

Wichtig:

- Der Spieler hat pro Spieltag genau ein Spiel.
    
- Andere Spiele werden im Hintergrund simuliert.
    
- Ein Spieltag gilt erst als abgeschlossen, wenn alle Spiele des Spieltags gespielt oder simuliert wurden.
    

---

# 13.6 Spieltags-Loop

## Ziel

Der Spieler spielt sein eigenes Spiel live. Alle anderen Spiele desselben Spieltags werden automatisch im Hintergrund simuliert.

## Ablauf eines Spieltags

1. Nächstes Spiel des Spielervereins bestimmen
    
2. Spielsimulation für das Spieler-Spiel öffnen
    
3. Ergebnis des Spieler-Spiels übernehmen
    
4. Tabelle aktualisieren
    
5. Restliche Spiele des Spieltags simulieren
    
6. Tabelle erneut aktualisieren
    
7. Spieltag erhöhen
    
8. Zurück zur Steuerzentrale
    

## Hintergrundsimulation

Für andere Teams:

- keine Live-Simulation nötig
    
- Ergebnis wird über Teamstärken berechnet
    
- zufällige Streuung erlaubt
    
- Heimvorteil optional
    

Beispiel:

```js
simulateBackgroundMatch(homeTeam, awayTeam)
```

Ergebnis soll plausibel sein:

- häufige Ergebnisse: 0:0, 1:0, 1:1, 2:1, 2:0
    
- selten hohe Ergebnisse
    
- stärkere Teams gewinnen wahrscheinlicher
    
- Unentschieden bleibt möglich
    

---

# 13.7 Verbindung zur bestehenden Spielsimulation

## Ziel

Die bestehende Live-Spielsimulation wird in den Liga-Loop integriert.

Wenn der Spieler auf „Nächstes Spiel“ klickt:

- Gegner wird aus dem Spielplan gelesen
    
- Heim-/Auswärtsstatus wird angezeigt
    
- Teamnamen kommen aus den importierten Teams
    
- Teamstärken kommen aus den importierten Kadern
    
- Taktik/Formation des Spielervereins wird verwendet
    
- Ergebnis wird nach Spielende in den Ligastand übernommen
    

## Anforderungen an die Spielsimulation

Die bestehende Simulation darf weiterverwendet werden, muss aber ihr Ergebnis an den Liga-Loop zurückgeben.

Beispiel:

```js
finishMatch({
  matchId,
  homeGoals,
  awayGoals
})
```

Danach:

- Match als gespielt markieren
    
- Tabelle aktualisieren
    
- andere Spiele des Spieltags simulieren
    
- Spieltag abschließen
    

---

# 13.8 Saisonende

## Ziel

Nach 34 Spieltagen endet die Saison.

## Ablauf

Nach Spieltag 34:

1. Tabellen finalisieren
    
2. Saisonziele prüfen
    
3. Aufstieg / Abstieg anwenden
    
4. neue Saison vorbereiten
    
5. neuen Spielplan erzeugen
    
6. Tabellen zurücksetzen
    
7. Saisonnummer erhöhen
    
8. neue Saison starten
    

## Struktur: Season

```js
season: {
  year: 2026,
  currentMatchDay: 1,
  isFinished: false
}
```

---

# 13.9 Aufstieg und Abstieg

## Ziel

Zwischen den Ligen findet ein einfaches Auf- und Abstiegsmodell statt.

## Einfaches Modell

- Top 2 aus Liga 2 steigen in Liga 1 auf
    
- Bottom 2 aus Liga 1 steigen in Liga 2 ab
    
- Top 2 aus Liga 3 steigen in Liga 2 auf
    
- Bottom 2 aus Liga 2 steigen in Liga 3 ab
    

## Keine Liga unter Liga 3

Für die erste Umsetzung:

- Bottom 2 aus Liga 3 bleiben in Liga 3
    
- keine Regionalliga
    
- kein zusätzlicher Abstieg aus Liga 3
    

Optional später:

- Regionalliga hinzufügen
    
- Relegation hinzufügen
    
- konfigurierbare Auf-/Abstiegsregeln
    

## Umsetzung

Nach Saisonende werden die `leagueId` der betroffenen Teams angepasst.

Danach werden die Teams pro Liga neu sortiert und neue Spielpläne erzeugt.

---

# 13.10 Neuer Spielstand / Initialisierung

## Ziel

Beim Start eines neuen Spiels werden Teams, Spieler, Ligen, Tabellen und Spielpläne initialisiert.

## Ablauf

```js
createNewGame()
```

muss künftig:

1. JSON-Daten laden
    
2. Teams erzeugen
    
3. Spieler zu Teams zuordnen
    
4. Ligen erzeugen
    
5. Teams auf Ligen verteilen
    
6. Startelf pro Team automatisch wählen
    
7. Teamstärken berechnen
    
8. Tabellen initialisieren
    
9. Spielpläne erzeugen
    
10. Spielerverein auswählen oder setzen
    
11. Spieltag 1 starten
    

## Beispiel GameState

```js
gameState: {
  managerName: "Felix",
  selectedTeamId: "team_001",

  season: {
    year: 2026,
    currentMatchDay: 1,
    isFinished: false
  },

  leagues: [],
  teams: [],
  players: [],

  currentScreen: "dashboard"
}
```

---

# 13.11 Anforderungen an die UI

## Steuerzentrale

Die Kachel "Spieltag" soll erweitert werden um 

- aktuelle Liga
- Tabellenplatz 
- Punkte 
-
Kachel nächstes Spiel wird verändert:
- Heim/Auswärts signalisieren durch position im "nächstes Spiel" container - Mannschaft links ist Heimmannschaft )

## Neuer Tabellenbildschirm

Ein neuer Bildschirm zeigt die Tabelle der aktuellen Liga, wird geöffnet durch drücken der "Spieltag" Kachel

Spalten:

- Platz
    
- Verein
    
- Spiele
    
- Siege
    
- Unentschieden
    
- Niederlagen
    
- Tore
    
- Tordifferenz
    
- Punkte
    
   

---

# 13.12 Akzeptanzkriterien

## Team-Import

- Die Datei `fussball_manager_1_2_3_liga_fiktiv_anonymisiert.json` wird als Datenbasis verwendet.
    
- Vereine werden aus der JSON-Datei importiert.
    
- Spieler werden aus der JSON-Datei importiert.
    
- Jeder Spieler gehört genau zu einem Team.
    
- Jedes Team besitzt einen Kader.
    
- Jedes Team besitzt eine berechnete Teamstärke.
    
- Jedes Team besitzt automatisch genau 11 Startspieler.
    
- Fehlende Werte werden entweder aus der JSON übernommen oder beim Import sinnvoll ergänzt.
    

## Liga

- Es gibt 3 Ligen.
    
- Jede Liga hat 18 Vereine.
    
- Jede Liga hat 34 Spieltage.
    
- Jede Liga besitzt eine Tabelle.
    
- Jede Liga besitzt einen vollständigen Spielplan.
    

## Spieltag

- Der Spieler hat pro Spieltag genau ein Spiel.
    
- Andere Spiele desselben Spieltags werden automatisch simuliert.
    
- Nach jedem Spiel wird die Tabelle aktualisiert.
    
- Ein Spieltag wird erst abgeschlossen, wenn alle Spiele des Spieltags gespielt wurden.
    

## Tabelle

- Sieg gibt 3 Punkte.
    
- Unentschieden gibt 1 Punkt.
    
- Niederlage gibt 0 Punkte.
    
- Tordifferenz wird berechnet.
    
- Tabelle wird korrekt sortiert.
    

## Saison

- Nach 34 Spieltagen endet die Saison.
    
- Aufstieg und Abstieg werden angewendet.
    
- Neue Saison startet automatisch.
    
- Tabellen werden zurückgesetzt.
    
- Neue Spielpläne werden erzeugt.
    

## Aufstieg / Abstieg

- Top 2 aus Liga 2 steigen in Liga 1 auf.
    
- Bottom 2 aus Liga 1 steigen in Liga 2 ab.
    
- Top 2 aus Liga 3 steigen in Liga 2 auf.
    
- Bottom 2 aus Liga 2 steigen in Liga 3 ab.
    
- Liga-Zuordnung der Teams wird korrekt aktualisiert.
    

---

# 13.13 Technische Hinweise für Codex

## Wichtig

Dieses Feature ist größer als ein reiner Liga-Loop. Es soll zuerst die fehlende Team-Datenbasis sauber einführen.

Die Implementierung sollte daher in dieser Reihenfolge erfolgen:

1. Datenimport aus JSON
    
2. Team- und Spielerstruktur normalisieren
    
3. Ligen erzeugen
    
4. Teams den Ligen zuordnen
    
5. Startelf und Teamstärke berechnen
    
6. Tabellen erzeugen
    
7. Spielpläne erzeugen
    
8. Spieltags-Loop implementieren
    
9. Hintergrundsimulation implementieren
    
10. Saisonende und Aufstieg/Abstieg implementieren
    
11. UI ergänzen
    

## Nicht sofort nötig

Für diese erste Umsetzung nicht erforderlich:

- Transfermarkt
    
- Verträge
    
- Gehälter im Detail
    
- Verletzungen
    
- Jugendspieler
    
- Relegation
    
- Pokal
    
- internationale Wettbewerbe
    
- echte Vereinsdaten
    
- echte Spielernamen
    

## Wichtig für bestehende App

Die bestehende Kader-, Taktik- und Spielsimulationslogik soll nicht ersetzt, sondern an die neue Team-/Liga-Struktur angeschlossen werden.

Bestehende Funktionen wie:

```js
autoPickBestEleven()
setFormation()
calculateTeamStrength()
startMatch()
continueAfterMatch()
```

sollen möglichst weiterverwendet oder nur minimal angepasst werden.

---

# 14. Langzeit-Progression über mehrere Ligen

## Ziel dieses Schritts

Das Spiel skaliert über mehrere Saisons. Höhere Ligen bringen stärkere Gegner, höhere Kosten und höhere Einnahmen.

## Ligen

Mindestens:

1. 3. Liga
2. 2. Liga
3. 1. Liga

## Ligaabhängige Spielerstärken

Beispiel:

| Liga | Typische Spielerstärken |
|---|---|
| 3. Liga | 20–40 |
| 2. Liga | 40–70 |
| 1. Liga | 70–90 |

## Ligaabhängige Ticketpreise

Beispiel:

| Liga | Niedrig | Mittel | Hoch |
|---|---:|---:|---:|
| 3. Liga | 4 € | 6 € | 8 € |
| 2. Liga | 10 € | 12 € | 15 € |
| 1. Liga | 18 € | 20 € | 25 € |

## Ligaabhängige Gehälter

Höhere Liga bedeutet:

- Spieler verlangen mehr Gehalt.
- Stars werden deutlich teurer.
- Finanzplanung wird wichtiger.

## Ligaabhängige Sponsoren

Höhere Liga bedeutet:

- bessere Sponsoren
- höhere Zahlungen pro Spieltag
- größere Bonusmöglichkeiten

## Ligaabhängige Transfers

Höhere Liga bedeutet:

- stärkere Spieler verfügbar
- höhere Ablösesummen
- höhere Gehälter

## Langzeitloop

1. Spiele gewinnen
2. Tabellenplatz verbessern
3. Aufsteigen
4. Mehr Einnahmen bekommen
5. Bessere Spieler kaufen
6. Stadion ausbauen
7. Training und Jugend verbessern
8. Noch stärker werden
9. In höhere Liga aufsteigen

## Akzeptanzkriterien

- 3., 2. und 1. Liga existieren.
- Aufstieg verändert Liga des Spielers.
- Gegner werden in höheren Ligen stärker.
- Ticketpreise ändern sich ligaabhängig.
- Sponsorangebote ändern sich ligaabhängig.
- Gehälter und Transferwerte skalieren mit Liga.

---

# 15. Zufallsereignisse Loop

## Ziel dieses Schritts

Zwischen Spieltagen entstehen kleine Geschichten und Überraschungen.

## Zeitpunkt

Ereignisse können auftreten:

- beim Klick auf „Nächstes Spiel“
- vor einem Spiel
- nach einem Spiel
- zwischen Spieltagen

## Event-System

```js
const event = {
  id: "event_transfer_offer",
  type: "transferOffer",
  title: "Transferangebot",
  text: "Ein Verein bietet 80.000 € für Tim Becker.",
  choices: []
};
```

## Ereignistypen

### 1. Spieler wird zum Kauf angeboten

```text
Der FC Musterstadt bietet dir Max Müller an.
Ablöse: 120.000 €
```

Optionen:

- kaufen
- ablehnen

### 2. Angebot für eigenen Spieler

```text
Der SV Grün-Weiß möchte Tim Becker kaufen.
Angebot: 250.000 €
```

Optionen:

- verkaufen
- ablehnen

### 3. Sponsorenangebot

```text
FastEnergy möchte dein neuer Sponsor werden.
Zahlung pro Spieltag: 25.000 €
```

Optionen:

- wechseln
- behalten

### 4. Verletzung

Nach einem Spiel kann sich ein Spieler verletzen.

Neue Spielereigenschaft erst jetzt nötig:

```js
injuryDaysRemaining: 0
```

Wirkung:

- Spieler fällt 3–5 Spieltage aus.
- Verletzte Spieler können nicht in der Startelf stehen.

### 5. Jugendspieler verbessert sich plötzlich

```text
Leon Schmidt hat große Fortschritte gemacht!
+3 Stärke
```

### 6. Sponsor zahlt Bonus

```text
Dein Sponsor zahlt einen Erfolgsbonus!
+50.000 €
```

### 7. Wetter beeinflusst Zuschauer

Beispiele:

- gutes Wetter: mehr Zuschauer
- schlechtes Wetter: weniger Zuschauer

### 8. Fan-Tag / Vereinsaktion

```text
Heute ist Fan-Tag! Mehr Zuschauer kommen ins Stadion.
```

## Häufigkeit

Ereignisse sollen:

- selten genug sein, um spannend zu bleiben
- häufig genug, um Abwechslung zu erzeugen

Beispiel:

- 20–30 % Chance auf ein Ereignis pro Spieltag
- nicht mehr als ein großes Ereignis pro Spieltag

## Akzeptanzkriterien

- Event-System existiert.
- Ereignisse können vor/nach Spielen erscheinen.
- Spieler kann Entscheidungen treffen.
- Ereignisse verändern Spielzustand.
- Verletzungen verhindern Einsatz von Spielern.
- Positive und negative Ereignisse existieren.

---

# 16. Datengetriebenes Balancing über JSON

## Ziel dieses Schritts

Alle Werte werden leicht anpassbar. Keine wichtigen Balancing-Werte sollen fest im Code stehen.

## Grundregel

Alles, was Balancing betrifft, kommt in JSON-Dateien.

## Beispiele für konfigurierbare Werte

### Ligen

```json
{
  "leagues": {
    "liga3": {
      "name": "3. Liga",
      "playerStrengthMin": 20,
      "playerStrengthMax": 40,
      "ticketPrices": {
        "low": 4,
        "medium": 6,
        "high": 8
      },
      "sponsorPaymentMin": 3000,
      "sponsorPaymentMax": 12000,
      "salaryFactor": 1.0,
      "transferValueFactor": 1.0
    },
    "liga2": {
      "name": "2. Liga",
      "playerStrengthMin": 40,
      "playerStrengthMax": 70,
      "ticketPrices": {
        "low": 10,
        "medium": 12,
        "high": 15
      },
      "sponsorPaymentMin": 15000,
      "sponsorPaymentMax": 50000,
      "salaryFactor": 2.5,
      "transferValueFactor": 3.0
    },
    "liga1": {
      "name": "1. Liga",
      "playerStrengthMin": 70,
      "playerStrengthMax": 90,
      "ticketPrices": {
        "low": 18,
        "medium": 20,
        "high": 25
      },
      "sponsorPaymentMin": 60000,
      "sponsorPaymentMax": 200000,
      "salaryFactor": 6.0,
      "transferValueFactor": 8.0
    }
  }
}
```

### Training

```json
{
  "training": {
    "startLevel": 20,
    "upgradeStep": 5,
    "baseUpgradeCost": 25000,
    "upgradeDurationDays": 5,
    "developmentChance": {
      "young": 0.25,
      "prime": 0.12,
      "older": 0.05,
      "veteran": 0.01
    }
  }
}
```

### Sondertraining

```json
{
  "specialTraining": {
    "cost": 5000,
    "strengthBonus": 1,
    "fatigueIncrease": 10
  },
  "recovery": {
    "cost": 3000,
    "fatigueReduction": 15
  }
}
```

### Stadion

```json
{
  "stadium": {
    "startCapacity": {
      "north": 100,
      "south": 100,
      "east": 200,
      "west": 200
    },
    "upgradeDurationDays": 5,
    "upgradeCostPerSeat": 300
  }
}
```

### Ereignisse

```json
{
  "events": {
    "eventChancePerMatchDay": 0.25,
    "injuryDurationMin": 3,
    "injuryDurationMax": 5,
    "sponsorBonusMin": 10000,
    "sponsorBonusMax": 50000
  }
}
```

## Akzeptanzkriterien

- Balancing-Werte werden aus JSON geladen.
- Liga-Werte kommen aus Konfiguration.
- Training, Stadion, Sponsoren, Events und Transfers sind konfigurierbar.
- Änderungen an JSON verändern das Spiel ohne Codeänderung.

---

# 17. Empfohlene Implementierungsreihenfolge

Diese Reihenfolge liefert nach jedem Schritt eine lauffähige Version:

1. Technische Grundlage
2. Main Game Loop mit Match-Simulation
3. Taktik während des Spiels
4. Kader-Management mit Startelf und Bank
5. Training und Spielerentwicklung
6. Sondertraining und Erholung
7. Stadion, Zuschauer und Ticketpreise
8. Finanzen und Gehälter
9. Jugendarbeit
10. Verträge und Vertragsverlängerungen
11. Transfermarkt
12. Sponsoren
13. Saisonziele
14. Liga, Tabelle und Saisonabschluss
15. Langzeit-Progression über mehrere Ligen
16. Zufallsereignisse
17. JSON-basiertes Balancing systematisch ausbauen

Hinweis: JSON-Konfiguration kann technisch schon früh angelegt werden. Inhaltlich sollten die Werte aber erst dann vollständig ergänzt werden, wenn der jeweilige Loop implementiert wird.

---

# 18. Zielbild nach vollständiger Umsetzung

Der Spieler startet mit einem kleinen Verein in der 3. Liga.

Er verwaltet:

- Kader
- Startelf
- Training
- Müdigkeit
- Stadion
- Ticketpreise
- Finanzen
- Jugend
- Verträge
- Transfers
- Sponsoren
- Saisonziele

Er spielt kurze 90-Sekunden-Partien mit sichtbarer Live-Simulation.

Über viele Saisons entwickelt er seinen Verein:

- bessere Spieler
- größeres Stadion
- bessere Trainingsanlagen
- stärkere Jugend
- bessere Sponsoren
- höhere Ligen

Das zentrale Spielgefühl:

> Ich starte mit einem kleinen Verein und mache ihn Schritt für Schritt zu einem großen Club.

