import { matchConfig } from "../config.js";
import {
  clamp,
  createNextPhase,
  getFormationPositions,
  getOpponentPenaltyArea,
  getPhaseTargetPositions,
  goalSequenceDurationMs,
  lanes,
  mirrorTeam,
  resetDurationMs,
  weightedPick
} from "./helpers.js";
import { applyTargets } from "./movement.js";
import { getTeamStrengths, registerShot, updatePossession } from "./resultEngine.js";
export function updateGoalSplash(match) {
  if (!match.goalSplash) {
    return;
  }

  match.goalSplash.stepsRemaining -= 1;

  if (match.goalSplash.stepsRemaining <= 0) {
    match.goalSplash = null;
  }
}

export function prepareGoalScoringSequence(match, scoringTeam) {
  const stepCount = Math.max(10, Math.ceil(goalSequenceDurationMs / matchConfig.simulationStepMs));
  match.goalPlan = {
    scoringTeam,
    stageIndex: 0,
    stages: [
      { type: "buildUp", stepsRemaining: Math.max(3, Math.round(stepCount * 0.2)) },
      { type: Math.random() < 0.55 ? "wideAttack" : "centralAttack", stepsRemaining: Math.max(3, Math.round(stepCount * 0.24)) },
      { type: "pressure", stepsRemaining: Math.max(4, Math.round(stepCount * 0.34)) },
      { type: "pressure", stepsRemaining: Math.max(3, Math.round(stepCount * 0.22)), shot: true }
    ],
    lane: weightedPick([
      { value: "left", weight: 1 },
      { value: "center", weight: 1.6 },
      { value: "right", weight: 1 }
    ])
  };
  match.phase = {
    type: "buildUp",
    attackingTeam: scoringTeam,
    lane: match.goalPlan.lane,
    stepsRemaining: stepCount
  };
}

export function resetToKickoffShape(match) {
  match.phase = {
    type: "reset",
    attackingTeam: mirrorTeam(match.phase?.attackingTeam ?? "home"),
    lane: "center",
    stepsRemaining: Math.max(8, Math.ceil(resetDurationMs / matchConfig.simulationStepMs))
  };
  match.resetStepsRemaining = match.phase.stepsRemaining;
  match.ball.targetX = 0.5;
  match.ball.targetY = 0.5;
}

export function advanceGoalPlan(team, opponent, match, eventMinute) {
  const stage = match.goalPlan.stages[match.goalPlan.stageIndex];
  const scoringTeam = match.goalPlan.scoringTeam;
  const defendingTeam = mirrorTeam(scoringTeam);
  const phase = {
    type: stage.type,
    attackingTeam: scoringTeam,
    lane: match.goalPlan.lane,
    stepsRemaining: stage.stepsRemaining
  };
  const targets = getPhaseTargetPositions(phase, scoringTeam, defendingTeam, match.tactic, match.players);
  const opponentBox = getOpponentPenaltyArea(scoringTeam);

  if (stage.shot) {
    targets.ball = {
      x: opponentBox.centerX,
      y: scoringTeam === "home" ? opponentBox.minY + 0.01 : opponentBox.maxY - 0.01
    };
  }

  applyTargets(match, targets, stage.shot ? 0.28 : 0.22);
  stage.stepsRemaining -= 1;

  if (stage.stepsRemaining > 0) {
    return;
  }

  if (stage.shot) {
    const isHomeGoal = scoringTeam === "home";
    registerShot(match, isHomeGoal, true);
    match.goalPlan = null;
    resetToKickoffShape(match);
    return;
  }

  match.goalPlan.stageIndex += 1;
}

export function runResetShape(match) {
  const phase = {
    type: "reset",
    attackingTeam: match.phase.attackingTeam,
    lane: "center"
  };
  const targets = {
    home: getFormationPositions("home", match.tactic, match.formations.home),
    away: getFormationPositions("away", match.tactic, match.formations.away),
    ball: { x: 0.5, y: 0.5 }
  };
  applyTargets(match, targets, 0.2);
  match.resetStepsRemaining -= 1;

  if (match.resetStepsRemaining <= 0) {
    match.phase = createNextPhase(match.phase.attackingTeam, match.tactic, match.simulatedMinutes);
  }
}

export function maybeCreateVisualPressure(match, homePhase, deltaMinutes) {
  if (match.goalPlan || match.resetStepsRemaining > 0) {
    return;
  }

  const shotChance = (match.phase.type === "pressure" ? 0.055 : 0.026) * deltaMinutes;
  if (Math.random() < shotChance) {
    registerShot(match, homePhase, Math.random() < 0.58);
  }
}

export function simulateStep(team, opponent, match, deltaMinutes) {
  const { homeStrength, awayStrength } = getTeamStrengths(team, opponent);

  match.simulatedMinutes = clamp(match.simulatedMinutes + deltaMinutes, 0, matchConfig.matchDurationMinutes);
  const eventMinute = Math.max(1, Math.min(matchConfig.matchDurationMinutes, Math.round(match.simulatedMinutes)));
  updateGoalSplash(match);

  if (match.goalPlan) {
    advanceGoalPlan(team, opponent, match, eventMinute);
    updatePossession(match, homeStrength, awayStrength, match.goalPlan?.scoringTeam ?? match.phase.attackingTeam);
    return;
  }

  if (match.resetStepsRemaining > 0) {
    runResetShape(match);
    return;
  }

  if (!match.phase || match.phase.stepsRemaining <= 0) {
    match.phase = createNextPhase(match.phase?.attackingTeam ?? "home", match.tactic, match.simulatedMinutes);
  }

  const attackingTeam = match.phase.attackingTeam;
  const defendingTeam = mirrorTeam(attackingTeam);
  const targets = getPhaseTargetPositions(match.phase, attackingTeam, defendingTeam, match.tactic, match.players);
  const phaseSpeed = match.phase.type === "counter" ? 0.26 : match.phase.type === "pressure" ? 0.23 : 0.18;

  applyTargets(match, targets, phaseSpeed);
  updatePossession(match, homeStrength, awayStrength, attackingTeam);
  match.phase.stepsRemaining -= 1;
  maybeCreateVisualPressure(match, attackingTeam === "home", deltaMinutes);
}


