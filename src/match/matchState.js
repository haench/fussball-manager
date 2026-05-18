import { AWAY_DEFAULT_FORMATION } from "../formations.js";
import { createNextPhase, createPlayers, normalizeFormation, toPosition } from "./helpers.js";
export function createInitialMatchState(team, opponent) {
  const homeFormation = normalizeFormation(team.formation);
  const awayFormation = normalizeFormation(opponent.formation ?? AWAY_DEFAULT_FORMATION);
  const players = {
    home: createPlayers("home", homeFormation),
    away: createPlayers("away", awayFormation)
  };

  return {
    minute: 0,
    displayMinute: 0,
    simulatedMinutes: 0,
    processedMinute: 0,
    status: "playing",
    homeGoals: 0,
    awayGoals: 0,
    tickerEvents: [],
    attendance: 0,
    stadiumRevenue: null,
    tactic: "normal",
    formations: {
      home: homeFormation,
      away: awayFormation
    },
    stats: {
      homeShots: 0,
      awayShots: 0,
      homeShotsOnTarget: 0,
      awayShotsOnTarget: 0,
      homePossession: 50,
      awayPossession: 50,
      homePossessionTotal: 0,
      possessionSamples: 0
    },
    scorers: [],
    players,
    ball: {
      x: 0.5,
      y: 0.5,
      targetX: 0.5,
      targetY: 0.5
    },
    phase: createNextPhase("home", "normal", 0),
    currentEvent: null,
    goalPlan: null,
    goalScene: null,
    goalSplash: null,
    resetStepsRemaining: 0,
    positions: {
      home: players.home.map(toPosition),
      away: players.away.map(toPosition),
      ball: { x: 0.5, y: 0.5 }
    }
  };
}


