import { createDevelopmentPlayer, getPotentialLabel } from '../game/development.js';

export const supportedPositions = ['TW', 'IV', 'AV', 'DM', 'ZM', 'OM', 'Flügel', 'ST'];

const rosterBlueprint = [
  { suffix: 'Fänger', position: 'TW', age: 28, strength: 74, pace: 42, shooting: 18, passing: 58, defending: 36, goalkeeping: 81, potential: 78 },
  { suffix: 'Rückhalt', position: 'TW', age: 21, strength: 66, pace: 45, shooting: 15, passing: 54, defending: 32, goalkeeping: 73, potential: 80 },
  { suffix: 'Mauer', position: 'IV', age: 30, strength: 72, pace: 55, shooting: 31, passing: 60, defending: 79, goalkeeping: 12, potential: 73 },
  { suffix: 'Block', position: 'IV', age: 26, strength: 70, pace: 58, shooting: 28, passing: 57, defending: 76, goalkeeping: 10, potential: 76 },
  { suffix: 'Grätsche', position: 'IV', age: 23, strength: 68, pace: 61, shooting: 30, passing: 56, defending: 73, goalkeeping: 9, potential: 79 },
  { suffix: 'Flanke', position: 'AV', age: 24, strength: 70, pace: 76, shooting: 38, passing: 66, defending: 67, goalkeeping: 10, potential: 77 },
  { suffix: 'Sprint', position: 'AV', age: 22, strength: 68, pace: 81, shooting: 35, passing: 64, defending: 65, goalkeeping: 9, potential: 80 },
  { suffix: 'Staubsauger', position: 'DM', age: 27, strength: 73, pace: 62, shooting: 45, passing: 71, defending: 75, goalkeeping: 11, potential: 76 },
  { suffix: 'Anker', position: 'DM', age: 25, strength: 69, pace: 60, shooting: 42, passing: 68, defending: 72, goalkeeping: 10, potential: 77 },
  { suffix: 'Motor', position: 'ZM', age: 25, strength: 74, pace: 67, shooting: 57, passing: 78, defending: 64, goalkeeping: 9, potential: 80 },
  { suffix: 'Takt', position: 'ZM', age: 28, strength: 71, pace: 64, shooting: 54, passing: 76, defending: 61, goalkeeping: 8, potential: 74 },
  { suffix: 'Idee', position: 'OM', age: 23, strength: 75, pace: 70, shooting: 69, passing: 80, defending: 42, goalkeeping: 8, potential: 83 },
  { suffix: 'Zauber', position: 'OM', age: 20, strength: 68, pace: 72, shooting: 65, passing: 74, defending: 36, goalkeeping: 7, potential: 84 },
  { suffix: 'Wirbel', position: 'Flügel', age: 22, strength: 73, pace: 84, shooting: 66, passing: 68, defending: 39, goalkeeping: 7, potential: 82 },
  { suffix: 'Turbo', position: 'Flügel', age: 24, strength: 70, pace: 86, shooting: 63, passing: 65, defending: 37, goalkeeping: 7, potential: 78 },
  { suffix: 'Kurve', position: 'Flügel', age: 19, strength: 66, pace: 82, shooting: 60, passing: 64, defending: 35, goalkeeping: 6, potential: 83 },
  { suffix: 'Knipser', position: 'ST', age: 26, strength: 76, pace: 73, shooting: 82, passing: 59, defending: 34, goalkeeping: 8, potential: 81 },
  { suffix: 'Joker', position: 'ST', age: 21, strength: 69, pace: 75, shooting: 76, passing: 55, defending: 31, goalkeeping: 7, potential: 82 },
];

const teamSeeds = {
  alpental: { prefix: 'Ari', valueBoost: 1.45, salaryBoost: 1.4 },
  hafenstadt: { prefix: 'Hanno', valueBoost: 1.25, salaryBoost: 1.2 },
  ruhrstadt: { prefix: 'Rudi', valueBoost: 1.18, salaryBoost: 1.12 },
  mainburg: { prefix: 'Mika', valueBoost: 1.1, salaryBoost: 1.08 },
  neckarau: { prefix: 'Niko', valueBoost: 1, salaryBoost: 1 },
  spreewald: { prefix: 'Sami', valueBoost: 0.92, salaryBoost: 0.94 },
  elbe: { prefix: 'Eddi', valueBoost: 0.68, salaryBoost: 0.72 },
  kohlenpott: { prefix: 'Kalle', valueBoost: 0.64, salaryBoost: 0.68 },
  isar: { prefix: 'Ilja', valueBoost: 0.6, salaryBoost: 0.64 },
  weinstadt: { prefix: 'Willi', valueBoost: 0.56, salaryBoost: 0.6 },
  kuesten: { prefix: 'Kimi', valueBoost: 0.52, salaryBoost: 0.56 },
  waldhain: { prefix: 'Waldi', valueBoost: 0.48, salaryBoost: 0.52 },
};

function roundToNearest(value, step) {
  return Math.round(value / step) * step;
}

export const players = Object.entries(teamSeeds).flatMap(([teamId, seed], teamIndex) =>
  rosterBlueprint.map((blueprint, playerIndex) => {
    const strengthOffset = Math.max(-6, 3 - teamIndex) + (playerIndex % 3) - 1;
    const strength = Math.min(86, Math.max(58, blueprint.strength + strengthOffset));
    const potential = Math.min(90, Math.max(strength, blueprint.potential + Math.floor((3 - teamIndex) / 2)));

    return {
      id: `${teamId}-${playerIndex + 1}`,
      name: `${seed.prefix} ${blueprint.suffix}`,
      teamId,
      position: blueprint.position,
      strength,
      pace: Math.min(95, Math.max(25, blueprint.pace + strengthOffset)),
      shooting: Math.min(95, Math.max(10, blueprint.shooting + strengthOffset)),
      passing: Math.min(95, Math.max(10, blueprint.passing + strengthOffset)),
      defending: Math.min(95, Math.max(10, blueprint.defending + strengthOffset)),
      goalkeeping: Math.min(95, Math.max(1, blueprint.goalkeeping + (blueprint.position === 'TW' ? strengthOffset : 0))),
      age: blueprint.age + (teamIndex % 4) - 1,
      marketValue: roundToNearest((strength ** 2) * 1_250 * seed.valueBoost, 50_000),
      salary: roundToNearest(strength * 1_850 * seed.salaryBoost, 1_000),
      potential: getPotentialLabel(potential, strength),
      potentialRating: potential,
      form: 55 + (playerIndex % 5),
      fitness: 82 - (playerIndex % 4),
      morale: 60 + (playerIndex % 6),
    };
  }),
);

export function getPlayersByTeamId(teamId) {
  return players.filter((player) => player.teamId === teamId).map(createDevelopmentPlayer);
}

