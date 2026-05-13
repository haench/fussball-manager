import { getPlayersByTeamId } from '../data/players.js';
import { leagues, teamsByLeague } from '../data/teams.js';
import { createSeasonSchedule, getMatchday, getNextUserFixture } from './schedule.js';
import { simulateMatchday } from './simulation.js';

export { leagues };
export const clubs = teamsByLeague;

export const initialGameState = {
  selectedClub: null,
  currentLeague: null,
  currentMatchday: 1,
  budget: 0,
  squad: [],
  table: [],
  schedule: [],
  completedMatches: [],
  latestMatchdayResults: [],
  liveMatch: null,
  messages: [],
  tacticsByTeamId: {},
};

export const gameState = structuredClone(initialGameState);

export function createInitialSquad(teamId) {
  return getPlayersByTeamId(teamId);
}

function createTeamsById(league) {
  return Object.fromEntries(clubs[league].map((club) => [club.id, club]));
}

function createInitialRows(league) {
  return clubs[league].map((club) => ({
    position: 0,
    club: club.name,
    teamId: club.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }));
}

function sortTable(rows) {
  return rows
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.club.localeCompare(b.club),
    )
    .map((row, index) => ({ ...row, position: index + 1 }));
}

export function createInitialTable(league) {
  return sortTable(createInitialRows(league));
}

export function recalculateTable(state = gameState) {
  const rowsByTeamId = Object.fromEntries(createInitialRows(state.currentLeague).map((row) => [row.teamId, row]));

  state.completedMatches.forEach((match) => {
    const homeRow = rowsByTeamId[match.homeTeamId];
    const awayRow = rowsByTeamId[match.awayTeamId];

    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.goalsFor += match.homeGoals;
    homeRow.goalsAgainst += match.awayGoals;
    awayRow.goalsFor += match.awayGoals;
    awayRow.goalsAgainst += match.homeGoals;

    if (match.homeGoals > match.awayGoals) {
      homeRow.won += 1;
      awayRow.lost += 1;
      homeRow.points += 3;
    } else if (match.awayGoals > match.homeGoals) {
      awayRow.won += 1;
      homeRow.lost += 1;
      awayRow.points += 3;
    } else {
      homeRow.drawn += 1;
      awayRow.drawn += 1;
      homeRow.points += 1;
      awayRow.points += 1;
    }
  });

  Object.values(rowsByTeamId).forEach((row) => {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  });

  state.table = sortTable(Object.values(rowsByTeamId));
  return state.table;
}

function getTeamForm(state, teamId) {
  const recentMatches = state.completedMatches
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
    .slice(-5);

  return recentMatches.reduce((form, match) => {
    const goalsFor = match.homeTeamId === teamId ? match.homeGoals : match.awayGoals;
    const goalsAgainst = match.homeTeamId === teamId ? match.awayGoals : match.homeGoals;

    if (goalsFor > goalsAgainst) return form + 1.2;
    if (goalsFor < goalsAgainst) return form - 0.9;
    return form + 0.2;
  }, 0);
}

function createFormMap(state) {
  return Object.fromEntries(clubs[state.currentLeague].map((club) => [club.id, getTeamForm(state, club.id)]));
}

function storeMatchdayResults(state, matchday, results, { advanceMatchday = true } = {}) {
  const existingIds = new Set(state.completedMatches.map((match) => match.id));
  const newResults = results.filter((match) => !existingIds.has(match.id));

  state.completedMatches.push(...newResults);
  state.latestMatchdayResults = results;
  state.liveMatch = results.find(
    (match) => match.homeTeamId === state.selectedClub.id || match.awayTeamId === state.selectedClub.id,
  ) ?? results[0] ?? null;
  state.messages = [
    `Spieltag ${matchday.matchday} abgeschlossen: ${results.length} Partien wurden simuliert.`,
    ...results.map((match) => `${match.homeTeam} ${match.homeGoals}:${match.awayGoals} ${match.awayTeam}`),
  ].slice(0, 6);
  recalculateTable(state);

  if (advanceMatchday && state.currentMatchday < state.schedule.length) {
    state.currentMatchday += 1;
  }

  return results;
}

export function simulateCurrentMatchday(state = gameState) {
  const matchday = getMatchday(state.schedule, state.currentMatchday);

  if (!matchday) {
    return [];
  }

  const results = simulateMatchday({
    matchday,
    teamsById: createTeamsById(state.currentLeague),
    formByTeamId: createFormMap(state),
    tacticsByTeamId: state.tacticsByTeamId,
  });

  return storeMatchdayResults(state, matchday, results);
}

export function watchUserMatchLive(state = gameState) {
  const fixture = getNextUserFixture(state);

  if (!fixture) {
    state.liveMatch = null;
    return null;
  }

  const result = simulateMatchday({
    matchday: { matches: [fixture] },
    teamsById: createTeamsById(state.currentLeague),
    formByTeamId: createFormMap(state),
    tacticsByTeamId: state.tacticsByTeamId,
  })[0];

  storeMatchdayResults(state, getMatchday(state.schedule, state.currentMatchday), [result], { advanceMatchday: false });
  state.messages = [`Live-Spiel abgeschlossen: ${result.homeTeam} ${result.homeGoals}:${result.awayGoals} ${result.awayTeam}.`, result.summary];
  return result;
}

export function simulateRemainingMatches(state = gameState) {
  const matchday = getMatchday(state.schedule, state.currentMatchday);

  if (!matchday) {
    return [];
  }

  const completedIds = new Set(state.completedMatches.map((match) => match.id));
  const remainingMatches = matchday.matches.filter((match) => !completedIds.has(match.id));

  if (remainingMatches.length === 0) {
    return [];
  }

  const results = simulateMatchday({
    matchday: { ...matchday, matches: remainingMatches },
    teamsById: createTeamsById(state.currentLeague),
    formByTeamId: createFormMap(state),
    tacticsByTeamId: state.tacticsByTeamId,
  });

  return storeMatchdayResults(state, matchday, results);
}

export function getCurrentMatchdayViewModel(state = gameState) {
  const matchday = getMatchday(state.schedule, state.currentMatchday);
  const teamsById = createTeamsById(state.currentLeague);

  return {
    matchday,
    fixtures: matchday?.matches.map((match) => ({
      ...match,
      homeTeam: teamsById[match.homeTeamId].name,
      awayTeam: teamsById[match.awayTeamId].name,
      isUserMatch: match.homeTeamId === state.selectedClub.id || match.awayTeamId === state.selectedClub.id,
    })) ?? [],
  };
}

export function startNewGame(club) {
  Object.assign(gameState, {
    selectedClub: club,
    currentLeague: club.league,
    currentMatchday: 1,
    budget: club.budget,
    squad: createInitialSquad(club.id),
    table: createInitialTable(club.league),
    schedule: createSeasonSchedule(clubs[club.league]),
    completedMatches: [],
    latestMatchdayResults: [],
    liveMatch: null,
    messages: ['Die Saison wurde mit einem 34-Spieltage-Plan angesetzt.'],
    tacticsByTeamId: { [club.id]: 'kontrolliert' },
  });

  return gameState;
}
