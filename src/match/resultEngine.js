import { matchConfig } from "../config.js";
import { AWAY_DEFAULT_FORMATION } from "../formations.js";
import { calculateTeamStrength, getStarterPlayers } from "../domain/teamStrength.js";
import {
  clamp,
  createPlayers,
  goalSequenceDurationMs,
  goalSplashDurationMs,
  getTacticGoalModifiers,
  weightedPick
} from "./helpers.js";
const scorerWeights = {
  striker: 60,
  forward: 60,
  midfielder: 28,
  defender: 11.9,
  goalkeeper: 0.1
};
const opponentScorerLabels = {
  forward: "Stürmer",
  striker: "Stürmer",
  midfielder: "Mittelfeld",
  defender: "Verteidiger",
  goalkeeper: "Torwart"
};

function getScorerWeight(position) {
  return scorerWeights[position] ?? scorerWeights.midfielder;
}

export function pickGoalScorer(team, matchTeamSide, match = null) {
  if (Array.isArray(team.players)) {
    const starters = getStarterPlayers(team);
    const scorer = weightedPick(starters.map((player) => ({
      value: player,
      weight: getScorerWeight(player.position)
    })));

    return {
      name: scorer.name,
      position: scorer.position
    };
  }

  const opponentPlayers = match?.players?.away ?? createPlayers("away", AWAY_DEFAULT_FORMATION);
  const scorer = weightedPick(opponentPlayers.map((player, index) => ({
    value: player,
    weight: getScorerWeight(player.role)
  })));
  const positionLabel = opponentScorerLabels[scorer.role] ?? "Spieler";

  return {
    name: `${team.name} ${positionLabel} ${scorer.lineIndex + 1}`,
    position: scorer.role
  };
}

function createTickerText(teamName, opponentName, minute, isHomeTeam) {
  return `${minute}': TOR für ${isHomeTeam ? teamName : opponentName}!`;
}

export function getTeamStrengths(homeTeam, awayTeam) {
  const homeStrength = calculateTeamStrength(homeTeam);
  const awayStrength = Number.isFinite(awayTeam.averageStrength)
    ? awayTeam.averageStrength
    : calculateTeamStrength(awayTeam);

  return { homeStrength, awayStrength };
}

function getGoalChances(homeTeam, awayTeam, match) {
  const { homeStrength, awayStrength } = getTeamStrengths(homeTeam, awayTeam);
  const strengthDiff = homeStrength - awayStrength;
  const modifiers = getTacticGoalModifiers(match.tactic);
  const homeModifier = match.isUserHome === false
    ? modifiers.opponentAttackModifier
    : modifiers.ownAttackModifier;
  const awayModifier = match.isUserHome === false
    ? modifiers.ownAttackModifier
    : modifiers.opponentAttackModifier;

  return {
    homeGoalChance: clamp(
      matchConfig.baseGoalChancePerMinute + strengthDiff * matchConfig.strengthFactor,
      matchConfig.minGoalChancePerMinute,
      matchConfig.maxGoalChancePerMinute
    ) * homeModifier,
    awayGoalChance: clamp(
      matchConfig.baseGoalChancePerMinute - strengthDiff * matchConfig.strengthFactor,
      matchConfig.minGoalChancePerMinute,
      matchConfig.maxGoalChancePerMinute
    ) * awayModifier,
    homeStrength,
    awayStrength
  };
}

function startGoalVisual(match, teamName, scoringTeam) {
  match.goalSplash = {
    teamName,
    stepsRemaining: Math.ceil(goalSplashDurationMs / matchConfig.simulationStepMs)
  };
  match.phase = {
    type: "pressure",
    attackingTeam: scoringTeam,
    lane: weightedPick([
      { value: "left", weight: 1 },
      { value: "center", weight: 1.6 },
      { value: "right", weight: 1 }
    ]),
    stepsRemaining: Math.max(6, Math.ceil(goalSequenceDurationMs / matchConfig.simulationStepMs))
  };
}

export function updatePossession(match, ownStrength, opponentStrength, attackingTeam) {
  const strengthDiff = ownStrength - opponentStrength;
  const possessionBoost = attackingTeam === "home" ? 5 : -5;
  const shotBoost = (match.stats.homeShots - match.stats.awayShots) * 1.4;
  const goalBoost = (match.homeGoals - match.awayGoals) * 2;
  const homePossession = clamp(50 + strengthDiff * 0.65 + possessionBoost + shotBoost + goalBoost, 34, 66);
  match.stats.homePossessionTotal += homePossession;
  match.stats.possessionSamples += 1;
  match.stats.homePossession = Math.round(match.stats.homePossessionTotal / match.stats.possessionSamples);
  match.stats.awayPossession = 100 - match.stats.homePossession;
}

function registerGoal(match, minute, isHomeTeam, scorer) {
  if (isHomeTeam) {
    match.homeGoals += 1;
  } else {
    match.awayGoals += 1;
  }

  match.scorers.push({
    minute,
    team: isHomeTeam ? "home" : "away",
    name: scorer.name,
    position: scorer.position
  });
}

export function registerShot(match, isHomeTeam, onTarget) {
  if (isHomeTeam) {
    match.stats.homeShots += 1;
    if (onTarget) {
      match.stats.homeShotsOnTarget += 1;
    }
    return;
  }

  match.stats.awayShots += 1;
  if (onTarget) {
    match.stats.awayShotsOnTarget += 1;
  }
}

function registerLogicalGoal(homeTeam, awayTeam, match, minute, isHomeGoal) {
  const scoringTeam = isHomeGoal ? "home" : "away";
  const scorer = pickGoalScorer(isHomeGoal ? homeTeam : awayTeam, scoringTeam, match);
  registerShot(match, isHomeGoal, true);
  registerGoal(match, minute, isHomeGoal, scorer);
  updateTicker(match, createTickerText(homeTeam.name, awayTeam.name, minute, isHomeGoal));
  startGoalVisual(match, isHomeGoal ? homeTeam.name : awayTeam.name, scoringTeam);
}

export function simulateMatchLogicUntil(homeTeam, awayTeam, match, targetMinute) {
  match.processedMinute ??= 0;
  const finalTargetMinute = Math.max(
    match.processedMinute,
    Math.min(matchConfig.matchDurationMinutes, Math.floor(targetMinute))
  );

  while (match.processedMinute < finalTargetMinute) {
    match.processedMinute += 1;
    const minute = match.processedMinute;
    const { homeGoalChance, awayGoalChance } = getGoalChances(homeTeam, awayTeam, match);
    const homeGoal = Math.random() < homeGoalChance;
    const awayGoal = Math.random() < awayGoalChance;

    if (homeGoal) {
      registerLogicalGoal(homeTeam, awayTeam, match, minute, true);
    } else if (Math.random() < homeGoalChance * 1.8 + 0.012) {
      registerShot(match, true, Math.random() < 0.42);
    }

    if (awayGoal) {
      registerLogicalGoal(homeTeam, awayTeam, match, minute, false);
    } else if (Math.random() < awayGoalChance * 1.8 + 0.012) {
      registerShot(match, false, Math.random() < 0.42);
    }
  }
}

export function updateTicker(match, message) {
  match.tickerEvents = [message, ...match.tickerEvents].slice(0, matchConfig.tickerLimit);
}


