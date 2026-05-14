import assert from 'node:assert/strict';

import { createSeasonSchedule } from '../src/game/schedule.js';
import { gameState, resetGameProgress, simulateCurrentMatchday, simulateRemainingMatches, startNewGame, watchUserMatchLive } from '../src/game/state.js';
import { isFinalMatchdayComplete } from '../src/game/seasonEnd.js';
import { getTableZone } from '../src/game/table.js';
import { renderSeasonEnd } from '../src/views/SeasonEnd.js';
import { renderSquad } from '../src/views/Squad.js';
import { renderTable } from '../src/views/TableView.js';
import { fantasyTeams, teamsByLeague, TEAMS_PER_LEAGUE } from '../src/data/teams.js';
import { players } from '../src/data/players.js';
import {
  ACTIVE_VIEW_STORAGE_KEY,
  deleteActiveView,
  deleteSavedGame,
  hasSavedGame,
  loadActiveView,
  loadSavedGameState,
  SAVE_STORAGE_KEY,
  SAVE_VERSION,
  saveActiveView,
  saveGameState,
} from '../src/game/storage.js';

const bundesligaTeams = teamsByLeague.Bundesliga;
const secondBundesligaTeams = teamsByLeague['2. Bundesliga'];
const bundesligaSchedule = createSeasonSchedule(bundesligaTeams);

assert.equal(TEAMS_PER_LEAGUE, 18, 'Die Zielgröße pro Liga bleibt bei 18 Teams.');
assert.equal(bundesligaTeams.length, 18, 'Bundesliga hat 18 Teams.');
assert.equal(secondBundesligaTeams.length, 18, '2. Bundesliga hat 18 Teams.');
assert.equal(fantasyTeams.length, 36, 'Fantasy-Daten enthalten insgesamt 36 Teams.');
assert.equal(bundesligaSchedule.length, 34, 'Bundesliga-Saison hat 34 Spieltage.');
assert.equal(bundesligaSchedule[0].matches.length, 9, 'Spieltag 1 hat 9 Partien.');
assert.ok(
  bundesligaSchedule.every((matchday) => matchday.matches.length === 9),
  'Jeder Bundesliga-Spieltag hat 9 Partien.',
);

assert.deepEqual(getTableZone({ position: 1 }, 'Bundesliga'), { key: 'title', label: 'Meisterschaft' });
assert.deepEqual(getTableZone({ position: 4 }, 'Bundesliga'), { key: 'international', label: 'Internationale Plätze' });
assert.deepEqual(getTableZone({ position: 5 }, 'Bundesliga'), { key: 'neutral', label: 'Mittelfeld' });
assert.deepEqual(getTableZone({ position: 16 }, 'Bundesliga'), { key: 'relegation', label: 'Relegation' });
assert.deepEqual(getTableZone({ position: 17 }, 'Bundesliga'), { key: 'demotion', label: 'Abstieg' });
assert.deepEqual(getTableZone({ position: 2 }, '2. Bundesliga'), { key: 'promotion', label: 'Aufstieg' });
assert.deepEqual(getTableZone({ position: 3 }, '2. Bundesliga'), { key: 'relegation', label: 'Relegation' });
assert.deepEqual(getTableZone({ position: 16 }, '2. Bundesliga'), { key: 'neutral', label: 'Mittelfeld' });
assert.deepEqual(getTableZone({ position: 17 }, '2. Bundesliga'), { key: 'demotion', label: 'Abstieg' });
assert.deepEqual(getTableZone({ position: 1 }, 'Bundesliga', 8), { key: 'demo', label: 'Demo-Liga' });

for (const team of fantasyTeams) {
  assert.equal(
    players.filter((player) => player.teamId === team.id).length,
    18,
    `${team.name} hat einen Kader mit 18 Spielern.`,
  );
}

const selectedClub = bundesligaTeams[0];
startNewGame(selectedClub);
const squadMarkup = renderSquad(gameState);
assert.match(squadMarkup, /class="squad-row player-card"/, 'Kaderspieler werden als Karten renderbar markiert.');
assert.match(squadMarkup, /<details class="player-details">/, 'Detailwerte im Kader sind einklappbar.');
assert.match(squadMarkup, /Form\/Fitness\/Moral/, 'Die wichtigsten Stimmungswerte bleiben direkt sichtbar.');

const tableMarkup = renderTable(gameState);
assert.match(tableMarkup, /class="standings-points"/, 'Tabellenpunkte sind für mobile Ranglisten separat adressierbar.');
assert.match(tableMarkup, /class="standings-goals-for"/, 'Tore sind für mobile Ranglisten separat adressierbar.');
assert.match(tableMarkup, /class="standings-goals-against"/, 'Gegentore sind für mobile Ranglisten separat adressierbar.');

const watchedMatchday = gameState.schedule.find((matchday) => matchday.matchday === gameState.currentMatchday);
const watchedUserMatch = watchUserMatchLive(gameState);
simulateRemainingMatches(gameState);

assert.equal(gameState.liveMatch?.id, watchedUserMatch.id, 'Das Live-Spiel bleibt nach der Restsimulation die eigene Partie.');
assert.equal(
  gameState.latestMatchdayResults.length,
  watchedMatchday.matches.length,
  'Nach der Restsimulation enthält latestMatchdayResults den vollständigen Spieltag.',
);

while (!isFinalMatchdayComplete(gameState)) {
  simulateCurrentMatchday(gameState);
}

const seasonEndMarkup = renderSeasonEnd(gameState);
assert.match(seasonEndMarkup, /Saisonabschluss/, 'Die Saisonabschlussansicht wird nach dem letzten kompletten Spieltag gerendert.');
assert.match(seasonEndMarkup, /Finale Position/, 'Die Abschlussansicht zeigt die finale Platzierung.');
assert.match(seasonEndMarkup, /Torschützenkönig/, 'Die Abschlussansicht zeigt den Topscorer-Bereich aus Matchdaten.');
assert.match(seasonEndMarkup, /Neue Saison starten/, 'Die Abschlussansicht bietet einen Neustart der Saison an.');


const storage = new Map();
globalThis.localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  },
};

saveGameState(gameState);
const rawSave = JSON.parse(globalThis.localStorage.getItem(SAVE_STORAGE_KEY));
assert.equal(rawSave.saveVersion, SAVE_VERSION, 'LocalStorage-Save nutzt die aktuelle Save-Version.');
assert.equal(rawSave.gameState.selectedClub.id, selectedClub.id, 'LocalStorage-Save serialisiert den aktuellen Verein.');
assert.equal(hasSavedGame(), true, 'Ein gespeicherter Spielstand wird erkannt.');
saveActiveView('Training');
assert.equal(
  globalThis.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY),
  'Training',
  'Die aktive Ansicht wird getrennt vom Spielstand gespeichert.',
);
assert.equal(loadActiveView(), 'Training', 'Die aktive Ansicht wird getrennt vom Spielstand geladen.');

resetGameProgress();
assert.equal(gameState.selectedClub, null, 'Reset entfernt den aktiven Verein vor dem Lade-Test.');
loadSavedGameState();
assert.equal(gameState.selectedClub.id, selectedClub.id, 'Gespeicherter Spielstand wird beim Laden wiederhergestellt.');
assert.equal(gameState.currentMatchday, rawSave.gameState.currentMatchday, 'Gespeicherter Spieltag wird wiederhergestellt.');

deleteSavedGame();
assert.equal(hasSavedGame(), false, 'Spielstand löschen entfernt den LocalStorage-Eintrag.');
assert.equal(loadActiveView(), 'Training', 'Das Löschen des Spielstands entfernt die separat gespeicherte Ansicht nicht automatisch.');
deleteActiveView();
assert.equal(loadActiveView(), null, 'Die separat gespeicherte Ansicht kann gezielt gelöscht werden.');
