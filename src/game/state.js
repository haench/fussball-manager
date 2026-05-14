import { getPlayersByTeamId, useFantasyPlayers, useImportedPlayers } from '../data/players.js';
import { applyMatchMood, applyMonthlyDevelopment } from './development.js';
import { buildBestLineup, createInitialLineup, defaultFormation, formations } from './lineup.js';
import { defaultTactics, normalizeTactics, tacticOptions } from './tactics.js';
import { activeDataMode, DATA_MODES, leagues, teamsByLeague as clubs, useFantasyTeams, useImportedTeams } from '../data/teams.js';
import { calculateLeagueTable, createInitialTable, createSeasonGoal, getSeasonGoalStatus } from './table.js';
import { createSeasonSchedule, getMatchday, getNextUserFixture } from './schedule.js';
import { simulateMatchday } from './simulation.js';
import { addNewsItems, createInitialNewsItems, generateMatchdayNews } from './news.js';
import { applyWeeklyTraining, normalizeTrainingFocus, planAutomaticTraining } from './training.js';
import { evaluateAchievements, createInitialAchievementState } from './achievements.js';
import { buyClubUpgrade, calculateWeeklyUpgradeIncome, createInitialClubUpgrades, getMedicalFatigueReduction, getTrainingGroundDevelopmentBonus } from './clubUpgrades.js';
import { createInitialCupState, shouldPlayCupRound, simulateCupRound } from './cup.js';
import { createInitialYouthState, maybeGenerateYouthPlayer } from './youth.js';
import { isFinalMatchdayComplete } from './seasonEnd.js';
import {
  buyPlayer,
  calculateCurrentWageSum,
  createInitialPlayerTeamIds,
  createInitialTransferFinances,
  defaultTransferFilters,
  sellPlayer,
} from './transfers.js';

export { activeDataMode, DATA_MODES, leagues, clubs };

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
  newsItems: [],
  tacticsByTeamId: {},
  lineupByTeamId: {},
  transferFilters: { ...defaultTransferFilters },
  transferLastResponse: '',
  playerTeamIds: {},
  seasonGoal: null,
  trainingFocus: 'Teamgeist',
  trainingMessages: [],
  developmentMonth: 1,
  developmentProcessedMatchdays: [],
  incomeProcessedMatchdays: [],
  clubUpgrades: createInitialClubUpgrades(),
  cup: createInitialCupState(),
  youthState: createInitialYouthState(),
  youthPlayers: [],
  achievements: createInitialAchievementState(),
  feedbackEffects: [],
  dataMode: DATA_MODES.FANTASY,
  dataImportMessage: '',
};

export const gameState = structuredClone(initialGameState);

export function resetGameProgress(dataMode = activeDataMode, dataImportMessage = '') {
  Object.assign(gameState, structuredClone(initialGameState), {
    dataMode,
    dataImportMessage,
  });

  return gameState;
}

export function createInitialSquad(teamId) {
  return getPlayersByTeamId(teamId);
}

export function getDataModeSummary() {
  return {
    mode: activeDataMode,
    isRealImport: activeDataMode === DATA_MODES.REAL_IMPORT,
    message: gameState.dataImportMessage,
  };
}

export function resetToFantasyData() {
  const fantasyTeams = useFantasyTeams();
  useFantasyPlayers(fantasyTeams);
  return resetGameProgress(DATA_MODES.FANTASY, 'Fantasiedaten sind aktiv.');
}

export function importPrivateRealData(payload) {
  if (!Array.isArray(payload?.players) || payload.players.length === 0) {
    throw new Error('Die JSON-Datei benötigt ein players-Array.');
  }

  const importedTeams = useImportedTeams(payload?.teams);
  useImportedPlayers(payload?.players, importedTeams);

  return resetGameProgress(
    DATA_MODES.REAL_IMPORT,
    `Privater Datenimport aktiv: ${importedTeams.length} Teams und ${payload.players.length} Spieler geladen.`,
  );
}

function createTeamsById(league = null) {
  const teamList = league ? clubs[league] : Object.values(clubs).flat();
  return Object.fromEntries(teamList.map((club) => [club.id, club]));
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

function createUserSquadMap(state) {
  return state.selectedClub ? { [state.selectedClub.id]: state.squad } : {};
}

function createFormMap(state) {
  return Object.fromEntries(clubs[state.currentLeague].map((club) => [club.id, getTeamForm(state, club.id)]));
}


function advanceMonthlyDevelopment(state, matchdayNumber) {
  if (matchdayNumber % 4 !== 0 || state.developmentProcessedMatchdays.includes(matchdayNumber)) return [];

  const developmentMessages = applyMonthlyDevelopment(state.squad, {
    trainingGroundBonus: getTrainingGroundDevelopmentBonus(state),
  });
  state.developmentMonth += 1;
  state.developmentProcessedMatchdays = [...state.developmentProcessedMatchdays, matchdayNumber];
  return developmentMessages;
}

function isUserMatch(state, match) {
  return Boolean(
    match
      && state.selectedClub
      && (match.homeTeamId === state.selectedClub.id || match.awayTeamId === state.selectedClub.id),
  );
}

function getCompletedMatchdayResults(state, matchday) {
  if (!matchday) return [];

  const completedById = new Map(state.completedMatches.map((match) => [match.id, match]));
  return matchday.matches.map((match) => completedById.get(match.id)).filter(Boolean);
}

function storeMatchdayResults(state, matchday, results, { advanceMatchday = true } = {}) {
  const existingIds = new Set(state.completedMatches.map((match) => match.id));
  const newResults = results.filter((match) => !existingIds.has(match.id));

  state.completedMatches.push(...newResults);
  const matchdayResults = getCompletedMatchdayResults(state, matchday);
  state.latestMatchdayResults = matchdayResults;

  const userResult = matchdayResults.find((match) => isUserMatch(state, match));
  const newUserResult = newResults.find((match) => isUserMatch(state, match));
  state.liveMatch = userResult ?? (isUserMatch(state, state.liveMatch) ? state.liveMatch : matchdayResults[0] ?? null);
  const moodMessages = applyMatchMood(state.squad, newUserResult, state.selectedClub.id, {
    fatigueReduction: getMedicalFatigueReduction(state),
  });
  const developmentMessages = advanceMonthlyDevelopment(state, matchday.matchday);
  const youthMessages = maybeGenerateYouthPlayer(state, matchday.matchday);
  const incomeAlreadyProcessed = state.incomeProcessedMatchdays.includes(matchday.matchday);
  const income = incomeAlreadyProcessed ? { total: 0 } : calculateWeeklyUpgradeIncome(state, newUserResult);
  const incomeMessages = income.total > 0 ? [`Vereinsausbau zahlt sich aus: +${income.total.toLocaleString('de-DE')} € Einnahmen.`] : [];
  if (!incomeAlreadyProcessed) {
    state.transferBudget += income.total;
    state.budget = state.transferBudget;
    state.incomeProcessedMatchdays = [...state.incomeProcessedMatchdays, matchday.matchday];
  }

  const cupMessages = [];
  let cupWinnerId = null;
  if (shouldPlayCupRound(state.cup, matchday.matchday)) {
    const cupRound = simulateCupRound({
      state,
      teamsById: createTeamsById(),
      formByTeamId: createFormMap(state),
      tacticsByTeamId: state.tacticsByTeamId,
      lineupByTeamId: state.lineupByTeamId,
      squadByTeamId: createUserSquadMap(state),
    });
    cupMessages.push(...cupRound.messages);
    cupWinnerId = cupRound.winnerId;
  }

  recalculateTable(state);

  const seasonFinished = isFinalMatchdayComplete(state);
  const achievementMessages = evaluateAchievements(state, {
    userResult: newUserResult,
    seasonFinished,
    cupWinnerId,
  });
  const goalStatus = getSeasonGoalStatus(state);
  const seasonGoalMessages = seasonFinished && goalStatus.goal && goalStatus.isInTarget
    ? [`🎉 Saisonziel erreicht: ${goalStatus.goal.label}!`]
    : [];

  if (seasonGoalMessages.length > 0) {
    state.feedbackEffects = ['confetti', ...(state.feedbackEffects ?? [])].slice(0, 3);
  }

  addNewsItems(state, generateMatchdayNews({ state, matchday, results: matchdayResults, userResult }));

  state.messages = [
    `Spieltag ${matchday.matchday} abgeschlossen: ${results.length} Partien wurden simuliert.`,
    ...results.map((match) => `${match.homeTeam} ${match.homeGoals}:${match.awayGoals} ${match.awayTeam}`),
    ...moodMessages,
    ...developmentMessages,
    ...youthMessages,
    ...incomeMessages,
    ...cupMessages,
    ...achievementMessages,
    ...seasonGoalMessages,
  ].slice(0, 12);

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

  state.trainingMessages = [applyWeeklyTraining(state.squad, state.trainingFocus)];

  const results = simulateMatchday({
    matchday,
    teamsById: createTeamsById(state.currentLeague),
    formByTeamId: createFormMap(state),
    tacticsByTeamId: state.tacticsByTeamId,
    lineupByTeamId: state.lineupByTeamId,
    squadByTeamId: createUserSquadMap(state),
  });

  return storeMatchdayResults(state, matchday, results);
}

export function watchUserMatchLive(state = gameState) {
  const fixture = getNextUserFixture(state);

  if (!fixture) {
    state.liveMatch = null;
    return null;
  }

  state.trainingMessages = [applyWeeklyTraining(state.squad, state.trainingFocus)];

  const result = simulateMatchday({
    matchday: { matches: [fixture] },
    teamsById: createTeamsById(state.currentLeague),
    formByTeamId: createFormMap(state),
    tacticsByTeamId: state.tacticsByTeamId,
    lineupByTeamId: state.lineupByTeamId,
    squadByTeamId: createUserSquadMap(state),
  })[0];

  storeMatchdayResults(state, getMatchday(state.schedule, state.currentMatchday), [result], { advanceMatchday: false });
  state.messages = [
    `Live-Spiel abgeschlossen: ${result.homeTeam} ${result.homeGoals}:${result.awayGoals} ${result.awayTeam}.`,
    result.summary,
    ...state.messages.slice(1),
  ].slice(0, 8);
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

  state.trainingMessages = [applyWeeklyTraining(state.squad, state.trainingFocus)];

  const results = simulateMatchday({
    matchday: { ...matchday, matches: remainingMatches },
    teamsById: createTeamsById(state.currentLeague),
    formByTeamId: createFormMap(state),
    tacticsByTeamId: state.tacticsByTeamId,
    lineupByTeamId: state.lineupByTeamId,
    squadByTeamId: createUserSquadMap(state),
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
    newsItems: createInitialNewsItems(club.name),
    trainingFocus: 'Teamgeist',
    trainingMessages: ['Wähle einen Fokus oder lass dein Training automatisch planen.'],
    developmentMonth: 1,
    developmentProcessedMatchdays: [],
    incomeProcessedMatchdays: [],
    clubUpgrades: createInitialClubUpgrades(),
    cup: createInitialCupState(),
    youthState: createInitialYouthState(),
    youthPlayers: [],
    achievements: createInitialAchievementState(),
    feedbackEffects: [],
    dataMode: activeDataMode,
    dataImportMessage: gameState.dataImportMessage,
    transferFilters: { ...defaultTransferFilters },
    transferLastResponse: '',
    playerTeamIds: createInitialPlayerTeamIds(),
    seasonGoal: createSeasonGoal(club),
    tacticsByTeamId: { [club.id]: { ...defaultTactics } },
    lineupByTeamId: { [club.id]: createInitialLineup(initialSquad, defaultFormation) },
  });

  return gameState;
}

export function updateTrainingFocus(state = gameState, focus) {
  state.trainingFocus = normalizeTrainingFocus(focus);
  state.trainingMessages = [`Trainingsfokus gesetzt: ${state.trainingFocus}.`];
  return state.trainingFocus;
}

export function autoPlanTraining(state = gameState) {
  state.trainingFocus = planAutomaticTraining(state);
  state.trainingMessages = [`Training automatisch geplant: ${state.trainingFocus}.`];
  return state.trainingFocus;
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

  if (result.accepted) {
    const achievementMessages = evaluateAchievements(state, { salePrice: result.salePrice });
    state.messages = [...achievementMessages, ...state.messages].slice(0, 12);
  }

  if (result.accepted && state.selectedClub) {
    state.lineupByTeamId[state.selectedClub.id] = buildBestLineup(state.squad, state.lineupByTeamId[state.selectedClub.id]?.formation ?? defaultFormation);
  }

  state.currentWageSum = calculateCurrentWageSum(state.squad);
  return result;
}

export function upgradeClubFacility(state = gameState, upgradeKey) {
  const result = buyClubUpgrade(state, upgradeKey);
  state.messages = [result.message, ...state.messages].slice(0, 12);
  return result;
}

export function clearFeedbackEffects(state = gameState) {
  state.feedbackEffects = [];
}
