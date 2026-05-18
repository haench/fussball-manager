import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  completeMatchDay,
  getNextUserMatch,
  initializeLeagueWorld,
  leagueSize,
  totalMatchDays
} from "../src/leagueWorld.js";
import { createInitialMatchState, simulateMinute } from "../src/matchSimulation.js";
import { isLineupValid } from "../src/state/store.js";
import {
  addFinanceLedgerEntry,
  calculateAttendanceAndRevenue,
  gameState,
  getFinanceEntriesForContext
} from "../src/state.js";

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

const worldState = assertLeagueInitialization();
assertMatchdayStructure(worldState);
assertCompleteMatchDay();
assertFinanceLedger();
assertMatchMinuteSmoke();
assertFormationValidation();

console.log("Smoke checks passed: league init, schedules, matchday completion, finance ledger, match minutes, formation validation.");
