# Fussball Manager

Ein schlankes Browser-App-Projekt für einen einfachen Fußballmanager ohne Build-Schritt.

## Datenmodus

Die veröffentlichbare Demo startet im Modus `fantasy` und enthält ausschließlich Fantasienamen. Beim Start weist die UI darauf hin: „Diese Demo nutzt Fantasienamen. Du kannst privat eigene Daten importieren.“

Optional kann lokal und privat der Modus `realImport` genutzt werden. Dafür importieren Nutzer im Startbildschirm eine eigene JSON-Datei mit Teams und Spielern. Das Projekt baut keine echten Vereins- oder Spielernamen fest ein; falls solche Daten künftig ausgeliefert werden sollen, muss die Lizenzlage vorher geprüft und dokumentiert werden.

Der Team-Datenbestand ist auf bis zu 18 Teams pro Liga vorbereitet. Importierte Ligen benötigen aus Spielplan-Gründen eine gerade Anzahl von mindestens zwei und maximal 18 Teams.

Minimales JSON-Beispiel:

```json
{
  "teams": [
    { "id": "club-a", "name": "Eigener Club A", "league": "Privatliga", "budget": 10000000 },
    { "id": "club-b", "name": "Eigener Club B", "league": "Privatliga", "budget": 9000000 }
  ],
  "players": [
    { "id": "a-1", "name": "Eigener Spieler", "teamId": "club-a", "position": "ZM", "strength": 70 },
    { "id": "b-1", "name": "Anderer Spieler", "teamId": "club-b", "position": "TW", "strength": 68 }
  ]
}
```

## Starten

```bash
npm run dev
```

Danach die App im Browser unter <http://localhost:5173> öffnen.

## Prüfen

```bash
npm run check
```
