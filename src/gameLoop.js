import { matchConfig } from "./config.js";
import { gameState, isLineupValid, saveCurrentGame, setMatch, setScreen, setState, updateMatch } from "./state.js";
import { createInitialMatchState, getResultSummary, simulateStep } from "./matchSimulation.js";

let activeLoopId = null;
let matchStartTimeMs = 0;
let lastFrameTimeMs = 0;
let simulationAccumulatorMs = 0;
const renderLoopIntervalMs = 33;

export function startMatch() {
  if (activeLoopId || gameState.match?.status === "playing") {
    return;
  }

  if (!isLineupValid(gameState.team)) {
    return;
  }

  const matchState = createInitialMatchState(gameState.team, gameState.opponent);
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

export function continueAfterMatch() {
  stopTimer();
  setState((state) => {
    const match = state.match;
    const result = match.homeGoals > match.awayGoals
      ? "S"
      : match.homeGoals < match.awayGoals ? "N" : "U";

    state.matchHistory = [
      {
        result,
        day: state.currentDay,
        opponentName: state.opponent.name,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals
      },
      ...(state.matchHistory ?? [])
    ].slice(0, 5);
    state.currentDay += 1;
    state.currentScreen = "club";
    state.match = null;
  });
  saveCurrentGame();
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
      for (let index = 0; index < simulationSteps; index += 1) {
        const deltaMinutes = (matchConfig.simulationStepMs / matchConfig.matchDurationMs) * matchConfig.matchDurationMinutes;
        simulateStep(gameState.team, gameState.opponent, match, deltaMinutes);
      }

      simulationAccumulatorMs -= simulationSteps * matchConfig.simulationStepMs;
      match.displayMinute = nextDisplayMinute;
      match.minute = nextDisplayMinute;

      if (shouldFinish) {
        match.displayMinute = matchConfig.matchDurationMinutes;
        match.minute = matchConfig.matchDurationMinutes;
        match.simulatedMinutes = matchConfig.matchDurationMinutes;
        match.status = "finished";
        match.result = getResultSummary(match);
      }
    });
  }

  if (gameState.match?.status === "finished") {
    stopTimer();
    setScreen("result");
    return;
  }
}
