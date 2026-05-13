import { createDevelopmentPlayer, getPotentialLabel } from '../game/development.js';
import { DATA_MODES, teams } from './teams.js';

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

const fantasyPrefixes = [
  'Ari', 'Hanno', 'Rudi', 'Mika', 'Niko', 'Sami', 'Henri', 'Dario', 'Benno', 'Noah', 'Silas', 'Theo', 'Wes', 'Erik', 'Lio', 'Oskar', 'Fiete', 'Malte',
  'Eddi', 'Kalle', 'Ilja', 'Willi', 'Kimi', 'Waldi', 'Falk', 'Robin', 'Sven', 'Wim', 'Gero', 'Kilian', 'Moritz', 'Quirin', 'Reno', 'Sten', 'Timo', 'Wenzel',
];

function roundToNearest(value, step) {
  return Math.round(value / step) * step;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createFantasyPlayers(teamList = teams) {
  return teamList.flatMap((team, teamIndex) => {
    const seed = {
      prefix: fantasyPrefixes[teamIndex] ?? `Talent${teamIndex + 1}`,
      valueBoost: clamp(team.budget / 45_000_000, 0.42, 1.65),
      salaryBoost: clamp(team.budget / 48_000_000, 0.45, 1.55),
    };

    return rosterBlueprint.map((blueprint, playerIndex) => {
      const budgetTier = Math.round((team.budget - 28_000_000) / 9_000_000);
      const strengthOffset = clamp(budgetTier, -7, 4) + (playerIndex % 3) - 1;
      const strength = clamp(blueprint.strength + strengthOffset, 58, 86);
      const potential = clamp(blueprint.potential + Math.floor(budgetTier / 2), strength, 90);

      return {
        id: `${team.id}-${playerIndex + 1}`,
        name: `${seed.prefix} ${blueprint.suffix}`,
        teamId: team.id,
        position: blueprint.position,
        strength,
        pace: clamp(blueprint.pace + strengthOffset, 25, 95),
        shooting: clamp(blueprint.shooting + strengthOffset, 10, 95),
        passing: clamp(blueprint.passing + strengthOffset, 10, 95),
        defending: clamp(blueprint.defending + strengthOffset, 10, 95),
        goalkeeping: clamp(blueprint.goalkeeping + (blueprint.position === 'TW' ? strengthOffset : 0), 1, 95),
        age: blueprint.age + (teamIndex % 4) - 1,
        marketValue: roundToNearest((strength ** 2) * 1_250 * seed.valueBoost, 50_000),
        salary: roundToNearest(strength * 1_850 * seed.salaryBoost, 1_000),
        potential: getPotentialLabel(potential, strength),
        potentialRating: potential,
        form: 55 + (playerIndex % 5),
        fitness: 82 - (playerIndex % 4),
        morale: 60 + (playerIndex % 6),
        dataMode: DATA_MODES.FANTASY,
        nameMode: DATA_MODES.FANTASY,
      };
    });
  });
}

function normalizeNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(clamp(number, min, max));
}

function normalizeImportedPlayer(player, index, teamIds) {
  const teamId = typeof player?.teamId === 'string' && teamIds.has(player.teamId) ? player.teamId : [...teamIds][index % teamIds.size];
  const strength = normalizeNumber(player?.strength, 66, 1, 99);
  const potentialRating = normalizeNumber(player?.potentialRating ?? player?.potential, strength, strength, 99);

  return {
    id: typeof player?.id === 'string' && player.id.trim() ? player.id.trim() : `${teamId}-import-${index + 1}`,
    name: typeof player?.name === 'string' && player.name.trim() ? player.name.trim() : `Import Spieler ${index + 1}`,
    teamId,
    position: supportedPositions.includes(player?.position) ? player.position : 'ZM',
    strength,
    pace: normalizeNumber(player?.pace, strength, 1, 99),
    shooting: normalizeNumber(player?.shooting, strength, 1, 99),
    passing: normalizeNumber(player?.passing, strength, 1, 99),
    defending: normalizeNumber(player?.defending, strength, 1, 99),
    goalkeeping: normalizeNumber(player?.goalkeeping, player?.position === 'TW' ? strength : 10, 1, 99),
    age: normalizeNumber(player?.age, 24, 16, 45),
    marketValue: normalizeNumber(player?.marketValue, strength ** 2 * 1_000, 0, 500_000_000),
    salary: normalizeNumber(player?.salary, strength * 1_500, 0, 10_000_000),
    potential: getPotentialLabel(potentialRating, strength),
    potentialRating,
    form: normalizeNumber(player?.form, 55, 1, 99),
    fitness: normalizeNumber(player?.fitness, 82, 1, 99),
    morale: normalizeNumber(player?.morale, 60, 1, 99),
    dataMode: DATA_MODES.REAL_IMPORT,
    nameMode: DATA_MODES.REAL_IMPORT,
  };
}

export let players = createFantasyPlayers();

export function useFantasyPlayers(teamList = teams) {
  players = createFantasyPlayers(teamList);
  return players;
}

export function useImportedPlayers(playerList, teamList = teams) {
  if (!Array.isArray(playerList) || playerList.length === 0) {
    throw new Error('Die JSON-Datei benötigt ein players-Array.');
  }

  const teamIds = new Set(teamList.map((team) => team.id));
  players = playerList.map((player, index) => normalizeImportedPlayer(player, index, teamIds));
  return players;
}

export function getPlayersByTeamId(teamId) {
  return players.filter((player) => player.teamId === teamId).map(createDevelopmentPlayer);
}
