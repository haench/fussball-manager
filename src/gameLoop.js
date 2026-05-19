import { matchConfig } from "./config.js";
import {
  addFinanceLedgerEntry,
  calculateAttendanceAndRevenue,
  gameState,
  getFinanceEntriesForContext,
  isLineupValid,
  processYouthAfterMatch,
  processTrainingAfterMatch,
  progressStadiumUpgrades,
  saveCurrentGame,
  setMatch,
  setScreen,
  setState,
  updateMatch
} from "./state.js";
import { createInitialMatchState, getResultSummary, simulateMatchLogicUntil, simulateStep } from "./matchSimulation.js";
import {
  completeMatchDay,
  finishUserMatch,
  getMatchTeams,
  getNextUserMatch,
  getTeamById,
  getUserTeam
} from "./leagueWorld.js";
import { processTransferMarketLoop } from "./domain/transferMarket.js";

let activeLoopId = null;
let matchStartTimeMs = 0;
let lastFrameTimeMs = 0;
let simulationAccumulatorMs = 0;
const renderLoopIntervalMs = 33;
const simulationStepMinutes = (matchConfig.simulationStepMs / matchConfig.matchDurationMs) * matchConfig.matchDurationMinutes;

export function startMatch() {
  if (activeLoopId || gameState.match?.status === "playing") {
    return;
  }

  const userTeam = getUserTeam(gameState);
  if (!isLineupValid(userTeam)) {
    return;
  }

  const fixture = getNextUserMatch(gameState);
  const hasLeagueWorld = Boolean(fixture);
  const { homeTeam, awayTeam } = hasLeagueWorld
    ? getMatchTeams(gameState, fixture)
    : { homeTeam: gameState.team, awayTeam: gameState.opponent };
  const matchState = createInitialMatchState(homeTeam, awayTeam);
  const isUserHome = !hasLeagueWorld || homeTeam.id === gameState.selectedTeamId;
  matchState.fixtureId = fixture?.id ?? null;
  matchState.homeTeamId = homeTeam.id;
  matchState.awayTeamId = awayTeam.id;
  matchState.homeTeamName = homeTeam.name;
  matchState.awayTeamName = awayTeam.name;
  matchState.isUserHome = isUserHome;
  matchState.stadiumRevenue = isUserHome
    ? calculateAttendanceAndRevenue(userTeam, gameState.matchHistory)
    : { attendance: 0, revenue: 0, capacity: 0, ticketPrice: 0, ticketPriceLevel: userTeam.stadium?.ticketPriceLevel ?? "medium" };
  matchState.attendance = matchState.stadiumRevenue.attendance;
  setMatch(matchState);
  setScreen("match");
  matchStartTimeMs = 0;
  lastFrameTimeMs = 0;
  simulationAccumulatorMs = 0;
  activeLoopId = window.setInterval(runMatchLoop, renderLoopIntervalMs);
}

export function setTactic(tactic) {
  if (!["aggressive", "normal", "defensive"].includes(tactic)) {
    return;
  }

  updateMatch((match) => {
    match.tactic = tactic;
  });
}

function getLiveMatchTeams(match) {
  return {
    homeTeam: match.homeTeamId ? gameState.teams?.find((team) => team.id === match.homeTeamId) ?? gameState.team : gameState.team,
    awayTeam: match.awayTeamId ? gameState.teams?.find((team) => team.id === match.awayTeamId) ?? gameState.opponent : gameState.opponent
  };
}

function finalizeMatchState(match) {
  match.displayMinute = matchConfig.matchDurationMinutes;
  match.minute = matchConfig.matchDurationMinutes;
  match.simulatedMinutes = matchConfig.matchDurationMinutes;
  match.status = "finished";
  match.result = getResultSummary(match);
}

export function skipMatch() {
  if (!gameState.match || gameState.match.status !== "playing") {
    return;
  }

  updateMatch((match) => {
    const { homeTeam, awayTeam } = getLiveMatchTeams(match);
    simulateMatchLogicUntil(homeTeam, awayTeam, match, matchConfig.matchDurationMinutes);

    const remainingVisualSteps = Math.max(
      0,
      Math.ceil((matchConfig.matchDurationMinutes - (match.simulatedMinutes ?? 0)) / simulationStepMinutes)
    );

    for (let index = 0; index < remainingVisualSteps; index += 1) {
      simulateStep(homeTeam, awayTeam, match, simulationStepMinutes);
    }

    finalizeMatchState(match);
  });

  stopTimer();
  setScreen("result");
}

export function continueAfterMatch() {
  stopTimer();
  setState((state) => {
    const match = state.match;
    const hasLeagueWorld = Boolean(match.fixtureId && state.teams && state.leagues);
    const reportSeasonYear = state.season?.year ?? 2026;
    const reportMatchDay = state.season?.currentMatchDay ?? state.currentDay;
    const reportLeague = hasLeagueWorld ? state.leagues.find((league) => league.schedule.some((fixture) => fixture.id === match.fixtureId)) : null;
    const reportLeagueId = reportLeague?.id ?? null;
    const userHomeGoals = match.isUserHome ? match.homeGoals : match.awayGoals;
    const userAwayGoals = match.isUserHome ? match.awayGoals : match.homeGoals;
    const opponentName = match.isUserHome ? match.awayTeamName : match.homeTeamName;
    const result = userHomeGoals > userAwayGoals
      ? "S"
      : userHomeGoals < userAwayGoals ? "N" : "U";

    state.matchHistory = [
      {
        result,
        day: state.currentDay,
        opponentName,
        homeGoals: userHomeGoals,
        awayGoals: userAwayGoals
      },
      ...(state.matchHistory ?? [])
    ].slice(0, 5);

    if (hasLeagueWorld) {
      finishUserMatch(state, {
        matchId: match.fixtureId,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals
      });
    }

    const stadiumRevenue = match.isUserHome
      ? (match.stadiumRevenue ?? calculateAttendanceAndRevenue(state.team, state.matchHistory))
      : { attendance: 0, revenue: 0, capacity: 0, ticketPrice: 0, ticketPriceLevel: state.team.stadium.ticketPriceLevel };
    if (match.isUserHome) {
      state.team.stadium.lastMatchRevenue = stadiumRevenue;
      state.money += stadiumRevenue.revenue;
      addFinanceLedgerEntry({
        type: "income",
        category: "stadium",
        label: `Zuschauereinnahmen: ${stadiumRevenue.attendance} Zuschauer × ${stadiumRevenue.ticketPrice} €`,
        amount: stadiumRevenue.revenue,
        meta: stadiumRevenue
      }, state);
    }

    let completedMatchDay = null;
    if (hasLeagueWorld) {
      completedMatchDay = completeMatchDay(state);
    } else {
      state.currentDay += 1;
    }
    progressStadiumUpgrades(state);
    processTrainingAfterMatch(state);
    processYouthAfterMatch(state);
    processTransferMarketLoop(state);
    state.postMatchReport = buildPostMatchReport(state, {
      completedMatchDay,
      leagueId: reportLeagueId,
      matchDay: reportMatchDay,
      seasonYear: reportSeasonYear,
      userMatchId: match.fixtureId
    });
    state.currentScreen = state.postMatchReport ? "matchdayReport" : "financeReport";
    state.match = null;
  });
  saveCurrentGame();
}

function buildFixtureReport(fixture, state) {
  const homeTeam = getTeamById(state, fixture.homeTeamId);
  const awayTeam = getTeamById(state, fixture.awayTeamId);
  return {
    id: fixture.id,
    leagueId: fixture.leagueId,
    matchDay: fixture.matchDay,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    homeTeamName: homeTeam?.name ?? fixture.homeTeamId,
    awayTeamName: awayTeam?.name ?? fixture.awayTeamId,
    homeGoals: fixture.homeGoals,
    awayGoals: fixture.awayGoals,
    played: Boolean(fixture.played),
    isUserMatch: fixture.homeTeamId === state.selectedTeamId || fixture.awayTeamId === state.selectedTeamId
  };
}

function buildPostMatchReport(state, context) {
  const leagueSnapshot = context.completedMatchDay?.leagues?.find((league) => league.id === context.leagueId);
  const financeEntries = getFinanceEntriesForContext(state, context.seasonYear, context.matchDay)
    .map((entry) => ({ ...entry }));
  const financeTotal = financeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const moneyAfter = state.money;

  if (!leagueSnapshot) {
    return {
      seasonYear: context.seasonYear,
      leagueId: null,
      leagueName: "Freundschaftsspiel",
      matchDay: context.matchDay,
      totalMatchDays: null,
      userMatchId: context.userMatchId,
      userTeamId: state.selectedTeamId,
      userStandingPosition: null,
      standings: [],
      matchdayFixtures: [],
      seasonScheduleSnapshot: [],
      financeEntries,
      moneyBefore: moneyAfter - financeTotal,
      moneyAfter
    };
  }

  const seasonScheduleSnapshot = leagueSnapshot.schedule.map((fixture) => buildFixtureReport(fixture, state));
  const standings = leagueSnapshot.standings.map((standing) => ({ ...standing }));
  const userStandingPosition = standings.findIndex((standing) => standing.teamId === state.selectedTeamId) + 1;
  const teamNamesById = Object.fromEntries(leagueSnapshot.teamIds.map((teamId) => [teamId, getTeamById(state, teamId)?.name ?? teamId]));
  return {
    seasonYear: context.seasonYear,
    leagueId: leagueSnapshot.id,
    leagueName: leagueSnapshot.name,
    matchDay: context.matchDay,
    totalMatchDays: leagueSnapshot.totalMatchDays,
    userMatchId: context.userMatchId,
    userTeamId: state.selectedTeamId,
    userStandingPosition: userStandingPosition > 0 ? userStandingPosition : null,
    teamNamesById,
    standings,
    matchdayFixtures: seasonScheduleSnapshot.filter((fixture) => fixture.matchDay === context.matchDay),
    seasonScheduleSnapshot,
    financeEntries,
    moneyBefore: moneyAfter - financeTotal,
    moneyAfter
  };
}

function stopTimer() {
  if (activeLoopId) {
    window.clearInterval(activeLoopId);
  }
  activeLoopId = null;
  matchStartTimeMs = 0;
  lastFrameTimeMs = 0;
  simulationAccumulatorMs = 0;
}

function runMatchLoop() {
  if (!gameState.match || gameState.match.status !== "playing") {
    stopTimer();
    return;
  }

  const timestamp = performance.now();

  if (matchStartTimeMs === 0) {
    matchStartTimeMs = timestamp;
    lastFrameTimeMs = timestamp;
  }

  const deltaMs = timestamp - lastFrameTimeMs;
  lastFrameTimeMs = timestamp;
  simulationAccumulatorMs += deltaMs;

  const elapsedMs = Math.min(timestamp - matchStartTimeMs, matchConfig.matchDurationMs);
  const nextDisplayMinute = Math.min(
    matchConfig.matchDurationMinutes,
    Math.floor((elapsedMs / matchConfig.matchDurationMs) * matchConfig.matchDurationMinutes)
  );
  const simulationSteps = Math.floor(simulationAccumulatorMs / matchConfig.simulationStepMs);
  const shouldFinish = elapsedMs >= matchConfig.matchDurationMs;
  const shouldUpdate = simulationSteps > 0 || nextDisplayMinute !== gameState.match.displayMinute || shouldFinish;

  if (shouldUpdate) {
    updateMatch((match) => {
      const { homeTeam, awayTeam } = getLiveMatchTeams(match);
      simulateMatchLogicUntil(
        homeTeam,
        awayTeam,
        match,
        shouldFinish ? matchConfig.matchDurationMinutes : nextDisplayMinute
      );

      for (let index = 0; index < simulationSteps; index += 1) {
        const deltaMinutes = (matchConfig.simulationStepMs / matchConfig.matchDurationMs) * matchConfig.matchDurationMinutes;
        simulateStep(homeTeam, awayTeam, match, deltaMinutes);
      }

      simulationAccumulatorMs -= simulationSteps * matchConfig.simulationStepMs;
      match.displayMinute = nextDisplayMinute;
      match.minute = nextDisplayMinute;

      if (shouldFinish) {
        finalizeMatchState(match);
      }
    });
  }

  if (gameState.match?.status === "finished") {
    stopTimer();
    setScreen("result");
    return;
  }
}
