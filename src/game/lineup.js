export const formations = {
  '4-4-2': [
    { id: 'gk', label: 'TW', role: 'GK', line: 'goalkeeper' },
    { id: 'lb', label: 'LV', role: 'FB', line: 'defense' },
    { id: 'cb1', label: 'IV', role: 'CB', line: 'defense' },
    { id: 'cb2', label: 'IV', role: 'CB', line: 'defense' },
    { id: 'rb', label: 'RV', role: 'FB', line: 'defense' },
    { id: 'lm', label: 'LM', role: 'W', line: 'midfield' },
    { id: 'cm1', label: 'ZM', role: 'CM', line: 'midfield' },
    { id: 'cm2', label: 'ZM', role: 'CM', line: 'midfield' },
    { id: 'rm', label: 'RM', role: 'W', line: 'midfield' },
    { id: 'st1', label: 'ST', role: 'ST', line: 'attack' },
    { id: 'st2', label: 'ST', role: 'ST', line: 'attack' },
  ],
  '4-3-3': [
    { id: 'gk', label: 'TW', role: 'GK', line: 'goalkeeper' },
    { id: 'lb', label: 'LV', role: 'FB', line: 'defense' },
    { id: 'cb1', label: 'IV', role: 'CB', line: 'defense' },
    { id: 'cb2', label: 'IV', role: 'CB', line: 'defense' },
    { id: 'rb', label: 'RV', role: 'FB', line: 'defense' },
    { id: 'dm', label: 'DM', role: 'DM', line: 'midfield' },
    { id: 'cm1', label: 'ZM', role: 'CM', line: 'midfield' },
    { id: 'cm2', label: 'ZM', role: 'CM', line: 'midfield' },
    { id: 'lw', label: 'LF', role: 'W', line: 'attack' },
    { id: 'st', label: 'ST', role: 'ST', line: 'attack' },
    { id: 'rw', label: 'RF', role: 'W', line: 'attack' },
  ],
  '4-2-3-1': [
    { id: 'gk', label: 'TW', role: 'GK', line: 'goalkeeper' },
    { id: 'lb', label: 'LV', role: 'FB', line: 'defense' },
    { id: 'cb1', label: 'IV', role: 'CB', line: 'defense' },
    { id: 'cb2', label: 'IV', role: 'CB', line: 'defense' },
    { id: 'rb', label: 'RV', role: 'FB', line: 'defense' },
    { id: 'dm1', label: 'DM', role: 'DM', line: 'midfield' },
    { id: 'dm2', label: 'DM', role: 'DM', line: 'midfield' },
    { id: 'lom', label: 'LOM', role: 'W', line: 'attack' },
    { id: 'om', label: 'OM', role: 'AM', line: 'attack' },
    { id: 'rom', label: 'ROM', role: 'W', line: 'attack' },
    { id: 'st', label: 'ST', role: 'ST', line: 'attack' },
  ],
  '3-5-2': [
    { id: 'gk', label: 'TW', role: 'GK', line: 'goalkeeper' },
    { id: 'cb1', label: 'IV', role: 'CB', line: 'defense' },
    { id: 'cb2', label: 'IV', role: 'CB', line: 'defense' },
    { id: 'cb3', label: 'IV', role: 'CB', line: 'defense' },
    { id: 'lwb', label: 'LAV', role: 'WB', line: 'midfield' },
    { id: 'cm1', label: 'ZM', role: 'CM', line: 'midfield' },
    { id: 'dm', label: 'DM', role: 'DM', line: 'midfield' },
    { id: 'cm2', label: 'ZM', role: 'CM', line: 'midfield' },
    { id: 'rwb', label: 'RAV', role: 'WB', line: 'midfield' },
    { id: 'st1', label: 'ST', role: 'ST', line: 'attack' },
    { id: 'st2', label: 'ST', role: 'ST', line: 'attack' },
  ],
};

export const defaultFormation = '4-4-2';

const perfectPositionsByRole = {
  GK: ['TW'],
  CB: ['IV'],
  FB: ['AV'],
  WB: ['AV', 'Flügel'],
  DM: ['DM'],
  CM: ['ZM'],
  AM: ['OM'],
  W: ['Flügel'],
  ST: ['ST'],
};

const acceptablePositionsByRole = {
  GK: [],
  CB: ['AV', 'DM'],
  FB: ['IV', 'DM', 'Flügel'],
  WB: ['ZM', 'DM'],
  DM: ['IV', 'ZM'],
  CM: ['DM', 'OM'],
  AM: ['ZM', 'Flügel', 'ST'],
  W: ['AV', 'OM', 'ST'],
  ST: ['OM', 'Flügel'],
};

const roleScoreByPosition = {
  GK: (player) => player.goalkeeping + player.strength,
  CB: (player) => player.defending * 1.4 + player.strength + player.pace * 0.2,
  FB: (player) => player.defending + player.pace + player.passing * 0.4,
  WB: (player) => player.pace + player.passing + player.defending * 0.6,
  DM: (player) => player.defending + player.passing + player.strength * 0.5,
  CM: (player) => player.passing * 1.3 + player.defending * 0.5 + player.shooting * 0.4,
  AM: (player) => player.passing + player.shooting + player.pace * 0.5,
  W: (player) => player.pace * 1.2 + player.shooting * 0.8 + player.passing * 0.6,
  ST: (player) => player.shooting * 1.5 + player.pace * 0.6 + player.strength * 0.4,
};

export function getFormationSlots(formation = defaultFormation) {
  return formations[formation] ?? formations[defaultFormation];
}

export function getPositionFit(player, slot) {
  if (!player) return 'empty';
  if (perfectPositionsByRole[slot.role].includes(player.position)) return 'perfect';
  if (acceptablePositionsByRole[slot.role].includes(player.position)) return 'acceptable';
  return 'poor';
}

function calculatePlayerSlotScore(player, slot) {
  const fit = getPositionFit(player, slot);
  const fitBonus = { perfect: 40, acceptable: 15, poor: -35 }[fit];
  return player.strength * 1.8 + roleScoreByPosition[slot.role](player) + fitBonus;
}

export function buildBestLineup(squad, formation = defaultFormation) {
  const availablePlayers = [...squad];
  const assignments = {};

  getFormationSlots(formation).forEach((slot) => {
    const bestPlayer = availablePlayers
      .map((player) => ({ player, score: calculatePlayerSlotScore(player, slot) }))
      .sort((a, b) => b.score - a.score || b.player.strength - a.player.strength)[0]?.player;

    if (bestPlayer) {
      assignments[slot.id] = bestPlayer.id;
      availablePlayers.splice(availablePlayers.findIndex((player) => player.id === bestPlayer.id), 1);
    }
  });

  return { formation, assignments };
}

export function createInitialLineup(squad, formation = defaultFormation) {
  return buildBestLineup(squad, formation);
}

export function getLineupPlayers(squad, lineup) {
  if (!lineup) return [];
  const playersById = Object.fromEntries(squad.map((player) => [player.id, player]));

  return getFormationSlots(lineup.formation).map((slot) => ({
    slot,
    player: playersById[lineup.assignments?.[slot.id]] ?? null,
  }));
}

export function calculateLineupBonus(squad, lineup) {
  const selected = getLineupPlayers(squad, lineup);
  const filledSlots = selected.filter(({ player }) => player);

  if (filledSlots.length === 0) return -8;

  const fitPoints = filledSlots.reduce((sum, { player, slot }) => {
    const fit = getPositionFit(player, slot);
    return sum + ({ perfect: 1.2, acceptable: 0.5, poor: -1.5 }[fit] ?? 0);
  }, 0);

  return Math.max(-10, Math.min(8, fitPoints - Math.max(0, 11 - filledSlots.length) * 1.5));
}
