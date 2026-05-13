import { getPlayersByTeamId } from '../data/players.js';
import { buildBestLineup, createInitialLineup, defaultFormation, formations } from './lineup.js';
import { defaultTactics, normalizeTactics, tacticOptions } from './tactics.js';
import { leagues, teamsByLeague } from '../data/teams.js';
import { calculateLeagueTable, createInitialTable, createSeasonGoal } from './table.js';
import { createSeasonSchedule, getMatchday, getNextUserFixture } from './schedule.js';
import { simulateMatchday } from './simulation.js';
import {
  buyPlayer,
  calculateCurrentWageSum,
  createInitialPlayerTeamIds,
  createInitialTransferFinances,
  defaultTransferFilters,
  sellPlayer,
} from './transfers.js';

export { leagues };
export const clubs = teamsByLeague;

export const initialGameState = {
  selectedClub: null,
  currentLeague: null,
  currentMatchday: 1,
  budget: 0,
  transferBudget: 0,
  wageBudget: 0,
  currentWageSum: 0,
  squad: [],
  table: [],
  schedule: [],
  completedMatches: [],
  latestMatchdayResults: [],
  liveMatch: null,
  messages: [],
  tacticsByTeamId: {},
  lineupByTeamId: {},
  transferFilters: { ...defaultTransferFilters },
  transferLastResponse: '',
  playerTeamIds: {},
  seasonGoal: null,
};

export const gameState = structuredClone(initialGameState);

export function createInitialSquad(teamId) {
  return getPlayersByTeamId(teamId);
}

function createTeamsById(league) {
  return Object.fromEntries(clubs[league].map((club) => [club.id, club]));
}

export function recalculateTable(state = gameState) {
  state.table = calculateLeagueTable(state.currentLeague, state.completedMatches);
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
    lineupByTeamId: state.lineupByTeamId,
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
    lineupByTeamId: state.lineupByTeamId,
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
    lineupByTeamId: state.lineupByTeamId,
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

export function updateLineupFormation(state = gameState, formation = defaultFormation) {
  if (!state.selectedClub || !formations[formation]) return null;

  state.lineupByTeamId[state.selectedClub.id] = buildBestLineup(state.squad, formation);
  return state.lineupByTeamId[state.selectedClub.id];
}

export function assignLineupPlayer(state = gameState, slotId, playerId) {
  if (!state.selectedClub) return null;

  const teamId = state.selectedClub.id;
  const currentLineup = state.lineupByTeamId[teamId] ?? createInitialLineup(state.squad, defaultFormation);
  const assignments = Object.fromEntries(
    Object.entries(currentLineup.assignments ?? {}).filter(([, assignedPlayerId]) => assignedPlayerId !== playerId),
  );

  if (playerId) {
    assignments[slotId] = playerId;
  } else {
    delete assignments[slotId];
  }

  state.lineupByTeamId[teamId] = { ...currentLineup, assignments };
  return state.lineupByTeamId[teamId];
}

export function setBestLineup(state = gameState) {
  if (!state.selectedClub) return null;

  const currentFormation = state.lineupByTeamId[state.selectedClub.id]?.formation ?? defaultFormation;
  state.lineupByTeamId[state.selectedClub.id] = buildBestLineup(state.squad, currentFormation);
  return state.lineupByTeamId[state.selectedClub.id];
}

export function updateUserTactics(state = gameState, field, value) {
  if (!state.selectedClub || !tacticOptions[field]?.some((option) => option.value === value)) return null;

  const teamId = state.selectedClub.id;
  state.tacticsByTeamId[teamId] = normalizeTactics({
    ...(state.tacticsByTeamId[teamId] ?? defaultTactics),
    [field]: value,
  });
  return state.tacticsByTeamId[teamId];
}

export function startNewGame(club) {
  const initialSquad = createInitialSquad(club.id);
  const initialFinances = createInitialTransferFinances(club, initialSquad);

  Object.assign(gameState, {
    selectedClub: club,
    currentLeague: club.league,
    currentMatchday: 1,
    ...initialFinances,
    squad: initialSquad,
    table: createInitialTable(club.league),
    schedule: createSeasonSchedule(clubs[club.league]),
    completedMatches: [],
    latestMatchdayResults: [],
    liveMatch: null,
    messages: ['Die Saison wurde mit einem 34-Spieltage-Plan angesetzt.'],
    transferFilters: { ...defaultTransferFilters },
    transferLastResponse: '',
    playerTeamIds: createInitialPlayerTeamIds(),
    seasonGoal: createSeasonGoal(club),
    tacticsByTeamId: { [club.id]: { ...defaultTactics } },
    lineupByTeamId: { [club.id]: createInitialLineup(initialSquad, defaultFormation) },
  });

  return gameState;
}

export function updateTransferFilter(state = gameState, field, value) {
  if (!Object.hasOwn(defaultTransferFilters, field)) return state.transferFilters;

  state.transferFilters = { ...state.transferFilters, [field]: value };
  return state.transferFilters;
}

export function resetTransferFilters(state = gameState) {
  state.transferFilters = { ...defaultTransferFilters };
  return state.transferFilters;
}

export function submitTransferOffer(state = gameState, playerId, offer) {
  const result = buyPlayer(state, playerId, offer);
  state.transferLastResponse = result.response;
  return result;
}

export function sellSquadPlayer(state = gameState, playerId) {
  const result = sellPlayer(state, playerId);
  state.transferLastResponse = result.response;

  if (result.accepted && state.selectedClub) {
    state.lineupByTeamId[state.selectedClub.id] = buildBestLineup(state.squad, state.lineupByTeamId[state.selectedClub.id]?.formation ?? defaultFormation);
  }

  state.currentWageSum = calculateCurrentWageSum(state.squad);
  return result;
}
