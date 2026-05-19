import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { skipMatch } from "../src/gameLoop.js";
import {
  completeMatchDay,
  getNextUserMatch,
  initializeLeagueWorld,
  leagueSize,
  totalMatchDays
} from "../src/leagueWorld.js";
import { createInitialMatchState, simulateMinute } from "../src/matchSimulation.js";
import {
  acceptExternalOffer,
  buyPlayer,
  generateTransferMarketPlayers,
  isLineupValid,
  processTransferMarketLoop,
  sellPlayer
} from "../src/state/store.js";
import {
  addFinanceLedgerEntry,
  calculateAttendanceAndRevenue,
  gameState,
  getFinanceEntriesForContext
} from "../src/state.js";
import {
  renderMatchdayReportScreen,
  renderMatchdayStandingsReportScreen
} from "../src/views/reportViews.js";

const sourceData = JSON.parse(
  await readFile(new URL("../data/fussball_manager_1_2_3_liga_fiktiv_anonymisiert.json", import.meta.url), "utf8")
);

function createWorldState() {
  const world = initializeLeagueWorld(sourceData);
  return {
    currentDay: 1,
    money: 50000,
    matchHistory: [],
    financeLedger: [],
    postMatchReport: null,
    match: null,
    ...world
  };
}

function withMockedRandom(values, callback) {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => values[Math.min(index++, values.length - 1)];
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function getSmokeUserTeam(state) {
  return state.team ?? state.teams.find((team) => team.id === state.selectedTeamId);
}

function assertLeagueInitialization() {
  const state = createWorldState();

  assert.equal(state.leagues.length, 3, "expected exactly 3 leagues");
  assert.equal(state.teams.length, leagueSize * 3, "expected 18 teams per league");
  assert.ok(Array.isArray(state.database.reserveTeams), "expected reserveTeams array");

  state.leagues.forEach((league) => {
    assert.equal(league.teamIds.length, leagueSize, `${league.id} should have 18 teams`);
    assert.equal(league.totalMatchDays, totalMatchDays, `${league.id} should have 34 matchdays`);
    assert.equal(league.schedule.length, totalMatchDays * (leagueSize / 2), `${league.id} should have 306 matches`);
  });

  return state;
}

function assertMatchdayStructure(state) {
  state.leagues.forEach((league) => {
    for (let matchDay = 1; matchDay <= totalMatchDays; matchDay += 1) {
      const fixtures = league.schedule.filter((match) => match.matchDay === matchDay);
      const teamAppearances = new Map();

      assert.equal(fixtures.length, leagueSize / 2, `${league.id} matchday ${matchDay} should have 9 fixtures`);

      fixtures.forEach((fixture) => {
        teamAppearances.set(fixture.homeTeamId, (teamAppearances.get(fixture.homeTeamId) ?? 0) + 1);
        teamAppearances.set(fixture.awayTeamId, (teamAppearances.get(fixture.awayTeamId) ?? 0) + 1);
      });

      assert.equal(teamAppearances.size, leagueSize, `${league.id} matchday ${matchDay} should include all teams`);
      teamAppearances.forEach((count, teamId) => {
        assert.equal(count, 1, `${teamId} should play exactly once on ${league.id} matchday ${matchDay}`);
      });
    }
  });
}

function assertCompleteMatchDay() {
  const state = createWorldState();
  const completed = completeMatchDay(state);

  assert.equal(completed.matchDay, 1, "completed snapshot should describe matchday 1");
  assert.equal(state.season.currentMatchDay, 2, "state should advance to matchday 2");
  assert.equal(state.currentDay, 2, "currentDay should advance to 2");

  state.leagues.forEach((league) => {
    const dayOneFixtures = league.schedule.filter((match) => match.matchDay === 1);
    assert.ok(dayOneFixtures.every((match) => match.played), `${league.id} matchday 1 should be fully played`);
    assert.equal(league.matchDay, 2, `${league.id} should advance to matchday 2`);
  });
}

function assertFinanceLedger() {
  const state = createWorldState();
  const userTeam = state.teams.find((team) => team.id === state.selectedTeamId);
  const nextMatch = getNextUserMatch(state);
  const isUserHome = nextMatch.homeTeamId === state.selectedTeamId;
  const revenue = isUserHome
    ? calculateAttendanceAndRevenue(userTeam, state.matchHistory)
    : { attendance: 0, revenue: 0, ticketPrice: 0 };

  if (isUserHome) {
    state.money += revenue.revenue;
    addFinanceLedgerEntry({
      type: "income",
      category: "stadium",
      label: `Zuschauereinnahmen Smoke: ${revenue.attendance}`,
      amount: revenue.revenue,
      meta: revenue
    }, state);
  }

  state.money -= 5000;
  addFinanceLedgerEntry({
    type: "expense",
    category: "training",
    label: "Trainingsausbau Smoke",
    amount: -5000,
    meta: { targetLevel: 21 }
  }, state);

  const entries = getFinanceEntriesForContext(state, state.season.year, state.season.currentMatchDay);
  const ledgerTotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const expectedTotal = (isUserHome ? revenue.revenue : 0) - 5000;

  assert.equal(ledgerTotal, expectedTotal, "finance ledger should sum income and expenses for the matchday");
  assert.ok(entries.some((entry) => entry.type === "expense" && entry.category === "training"), "expected training expense entry");
  if (isUserHome) {
    assert.ok(entries.some((entry) => entry.type === "income" && entry.category === "stadium"), "expected stadium income entry");
  }
}

function assertMatchMinuteSmoke() {
  const match = createInitialMatchState(gameState.team, gameState.opponent);

  for (let minute = 0; minute < 5; minute += 1) {
    simulateMinute(gameState.team, gameState.opponent, match);
  }

  assert.equal(match.minute, 5, "existing match minute smoke should still simulate 5 display minutes");
  assert.equal(match.processedMinute, 5, "match logic should process 5 minutes");
  assert.ok(Number.isInteger(match.homeGoals), "home goals should be an integer");
  assert.ok(Number.isInteger(match.awayGoals), "away goals should be an integer");
}

function assertFormationValidation() {
  const validTeam = {
    formation: "4-3-3",
    players: [
      { id: "gk", position: "goalkeeper", isStarter: true },
      { id: "d1", position: "defender", isStarter: true },
      { id: "d2", position: "defender", isStarter: true },
      { id: "d3", position: "defender", isStarter: true },
      { id: "d4", position: "defender", isStarter: true },
      { id: "m1", position: "midfielder", isStarter: true },
      { id: "m2", position: "midfielder", isStarter: true },
      { id: "m3", position: "midfielder", isStarter: true },
      { id: "s1", position: "striker", isStarter: true },
      { id: "s2", position: "striker", isStarter: true },
      { id: "s3", position: "striker", isStarter: true },
      { id: "sub", position: "defender", isStarter: false }
    ]
  };

  assert.ok(isLineupValid(validTeam), "4-3-3 with 11 starters matching positions should be valid");

  const tooFewStarters = {
    ...validTeam,
    players: validTeam.players.filter((p) => p.id !== "s3")
  };
  assert.equal(isLineupValid(tooFewStarters), false, "only 10 starters should be invalid");

  const wrongPosition = {
    ...validTeam,
    players: validTeam.players.map((p) => (p.id === "d4" ? { ...p, position: "striker" } : p))
  };
  assert.equal(isLineupValid(wrongPosition), false, "4-2-2-2-ish triggered by swapped position should be invalid");
}

function assertTransferOfferFlow() {
  const state = createWorldState();
  const userTeam = getSmokeUserTeam(state);
  const listedPlayer = userTeam.players.find((player) => !player.isStarter) ?? userTeam.players[0];
  const moneyBefore = state.money;

  assert.ok(sellPlayer(listedPlayer.id, state), "listing a player for sale should succeed");
  withMockedRandom([0, 0, 0], () => {
    processTransferMarketLoop(state);
  });

  assert.ok(state.transferMarket, "transfer market state should initialize on first loop");
  assert.ok(state.transferMarket.externalOffer, "listed players should be able to receive an offer");
  assert.equal(state.transferMarket.externalOffer.playerId, listedPlayer.id, "offer should target the listed player");
  assert.equal(typeof state.transferMarket.externalOffer.buyerTeamId, "string", "offer should include a buyer team id");

  const firstOfferId = state.transferMarket.externalOffer.id;
  state.currentDay = state.transferMarket.externalOffer.expiresDay;

  withMockedRandom([0, 0, 0], () => {
    processTransferMarketLoop(state);
  });

  assert.ok(state.transferMarket.externalOffer, "an expired offer should be replaceable on the same tick");
  assert.notEqual(state.transferMarket.externalOffer.id, firstOfferId, "replacement offer should be newly generated");

  const buyerTeam = state.teams.find((team) => team.id === state.transferMarket.externalOffer.buyerTeamId);
  const buyerCountBefore = buyerTeam.players.length;
  const userCountBefore = userTeam.players.length;
  const acceptedOffer = state.transferMarket.externalOffer;

  assert.ok(acceptExternalOffer(state), "accepting a generated offer should succeed");
  assert.equal(state.money, moneyBefore + acceptedOffer.offerAmount, "accepting an offer should credit the fee");
  assert.equal(userTeam.players.length, userCountBefore - 1, "selling should remove the player from the user squad");
  assert.equal(buyerTeam.players.length, buyerCountBefore + 1, "selling should add the player to the buyer club");
  assert.ok(buyerTeam.players.some((player) => player.id === acceptedOffer.playerId), "buyer club should receive the sold player");
}

function assertTransferPurchaseFlow() {
  const state = createWorldState();
  state.team = getSmokeUserTeam(state);
  state.money = 1_000_000;

  const availablePlayers = generateTransferMarketPlayers(state);
  assert.ok(availablePlayers.length > 0, "buy market should generate players");

  const playerToBuy = availablePlayers[0];
  const sellerTeam = state.teams.find((team) => team.id !== state.selectedTeamId && team.players.some((player) => player.id === playerToBuy.id));
  assert.ok(sellerTeam, "buy candidate should belong to a rival club");

  const sellerCountBefore = sellerTeam.players.length;
  const userCountBefore = state.team.players.length;
  const moneyBefore = state.money;

  assert.ok(buyPlayer(playerToBuy, state), "buying a generated player should succeed with enough money");
  assert.equal(state.money, moneyBefore - playerToBuy.marketValue, "buying should deduct the transfer fee");
  assert.equal(state.team.players.length, userCountBefore + 1, "bought player should join the user squad");
  assert.equal(sellerTeam.players.length, sellerCountBefore - 1, "bought player should be removed from the seller club");
  assert.ok(!state.transferMarket.availablePlayers.some((player) => player.id === playerToBuy.id), "bought player should leave the current market list");
}

function assertTransferSafetyRules() {
  const state = createWorldState();
  state.team = getSmokeUserTeam(state);
  const guardedTeam = state.teams.find((team) => team.id !== state.selectedTeamId && team.players.length > 11);
  guardedTeam.players = guardedTeam.players.slice(0, 11);

  const availablePlayers = generateTransferMarketPlayers(state);
  const guardedIds = new Set(guardedTeam.players.map((player) => player.id));
  assert.ok(availablePlayers.every((player) => !guardedIds.has(player.id)), "teams with exactly 11 players should not supply buy-market players");

  const stateWithListedEleven = createWorldState();
  const userTeam = getSmokeUserTeam(stateWithListedEleven);
  stateWithListedEleven.team = userTeam;
  userTeam.players = userTeam.players.slice(0, 11);
  userTeam.players[0].isOnTransferList = true;
  withMockedRandom([0, 0, 0], () => {
    processTransferMarketLoop(stateWithListedEleven);
  });
  assert.equal(stateWithListedEleven.transferMarket.externalOffer, null, "user team with exactly 11 players should not receive sale offers");

  const stateWithLateBlock = createWorldState();
  stateWithLateBlock.team = getSmokeUserTeam(stateWithLateBlock);
  stateWithLateBlock.money = 1_000_000;
  const lateCandidates = generateTransferMarketPlayers(stateWithLateBlock);
  const lateTarget = lateCandidates[0];
  const lateSeller = stateWithLateBlock.teams.find((team) => team.id !== stateWithLateBlock.selectedTeamId && team.players.some((player) => player.id === lateTarget.id));
  const keepIds = new Set(lateSeller.players.slice(0, 10).map((player) => player.id));
  keepIds.add(lateTarget.id);
  lateSeller.players = lateSeller.players.filter((player) => keepIds.has(player.id)).slice(0, 11);
  const moneyBeforeRejectedBuy = stateWithLateBlock.money;
  const userCountBeforeRejectedBuy = stateWithLateBlock.team.players.length;

  assert.equal(buyPlayer(lateTarget, stateWithLateBlock), false, "buy should be rejected if the seller has fallen to 11 players");
  assert.equal(stateWithLateBlock.money, moneyBeforeRejectedBuy, "rejected buy should not change money");
  assert.equal(stateWithLateBlock.team.players.length, userCountBeforeRejectedBuy, "rejected buy should not change the user squad");
}

function assertMatchSkipFlow() {
  const state = createWorldState();
  const previousSnapshot = {
    team: gameState.team,
    opponent: gameState.opponent,
    teams: gameState.teams,
    selectedTeamId: gameState.selectedTeamId,
    match: gameState.match,
    currentScreen: gameState.currentScreen
  };

  try {
    const userTeam = getSmokeUserTeam(state);
    const nextMatch = getNextUserMatch(state);
    const homeTeam = state.teams.find((team) => team.id === nextMatch.homeTeamId);
    const awayTeam = state.teams.find((team) => team.id === nextMatch.awayTeamId);
    const match = createInitialMatchState(homeTeam, awayTeam);
    match.fixtureId = nextMatch.id;
    match.homeTeamId = homeTeam.id;
    match.awayTeamId = awayTeam.id;
    match.homeTeamName = homeTeam.name;
    match.awayTeamName = awayTeam.name;
    match.isUserHome = homeTeam.id === state.selectedTeamId;
    match.attendance = calculateAttendanceAndRevenue(userTeam, state.matchHistory).attendance;

    Object.assign(gameState, state, {
      team: userTeam,
      opponent: awayTeam.id === state.selectedTeamId ? homeTeam : awayTeam,
      match,
      currentScreen: "match"
    });

    simulateMinute(homeTeam, awayTeam, gameState.match);
    assert.equal(gameState.match.status, "playing", "match should still be running before the skip");

    skipMatch();

    assert.equal(gameState.currentScreen, "result", "skip should open the result screen");
    assert.equal(gameState.match.status, "finished", "skip should finish the running match");
    assert.equal(gameState.match.minute, 90, "skip should set the final match minute");
    assert.equal(gameState.match.displayMinute, 90, "skip should set the visible minute to 90");
    assert.ok(gameState.match.result, "skip should compute the final result payload");
  } finally {
    Object.assign(gameState, previousSnapshot);
  }
}

function assertPostMatchStandingsReportFlow() {
  const state = createWorldState();
  state.team = getSmokeUserTeam(state);
  const completedMatchDay = completeMatchDay(state);
  const leagueSnapshot = completedMatchDay.leagues.find((league) => league.id === state.team.leagueId);
  const seasonScheduleSnapshot = leagueSnapshot.schedule.map((fixture) => {
    const homeTeam = state.teams.find((team) => team.id === fixture.homeTeamId);
    const awayTeam = state.teams.find((team) => team.id === fixture.awayTeamId);
    return {
      ...fixture,
      homeTeamName: homeTeam?.name ?? fixture.homeTeamId,
      awayTeamName: awayTeam?.name ?? fixture.awayTeamId,
      isUserMatch: fixture.homeTeamId === state.selectedTeamId || fixture.awayTeamId === state.selectedTeamId
    };
  });
  const teamNamesById = Object.fromEntries(leagueSnapshot.teamIds.map((teamId) => [teamId, state.teams.find((team) => team.id === teamId)?.name ?? teamId]));
  const standings = leagueSnapshot.standings.map((standing) => ({ ...standing }));
  state.postMatchReport = {
    seasonYear: completedMatchDay.seasonYear,
    leagueId: leagueSnapshot.id,
    leagueName: leagueSnapshot.name,
    matchDay: completedMatchDay.matchDay,
    totalMatchDays: leagueSnapshot.totalMatchDays,
    userMatchId: getNextUserMatch(createWorldState())?.id ?? null,
    userTeamId: state.selectedTeamId,
    userStandingPosition: standings.findIndex((standing) => standing.teamId === state.selectedTeamId) + 1,
    teamNamesById,
    standings,
    matchdayFixtures: seasonScheduleSnapshot.filter((fixture) => fixture.matchDay === completedMatchDay.matchDay),
    seasonScheduleSnapshot,
    financeEntries: [],
    moneyBefore: state.money,
    moneyAfter: state.money
  };

  const matchdayMarkup = renderMatchdayReportScreen(state);
  const standingsMarkup = renderMatchdayStandingsReportScreen(state);

  assert.match(matchdayMarkup, /data-action="show-matchday-standings-report"/, "matchday report should continue to the standings snapshot");
  assert.match(standingsMarkup, /data-testid="matchday-standings-report-screen"/, "expected dedicated post-match standings screen");
  assert.match(standingsMarkup, new RegExp(`Spieltag ${completedMatchDay.matchDay}`), "standings report should label the completed matchday");
  assert.match(standingsMarkup, /data-action="show-finance-report"/, "standings report should continue to finance");
}

const worldState = assertLeagueInitialization();
assertMatchdayStructure(worldState);
assertCompleteMatchDay();
assertFinanceLedger();
assertMatchMinuteSmoke();
assertFormationValidation();
assertTransferOfferFlow();
assertTransferPurchaseFlow();
assertTransferSafetyRules();
assertMatchSkipFlow();
assertPostMatchStandingsReportFlow();

console.log("Smoke checks passed: league init, schedules, transfer market, post-match standings flow, matchday completion, finance ledger, match minutes, match skip, formation validation.");
