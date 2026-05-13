import { createDevelopmentPlayer, getPotentialLabel } from './development.js';

const firstNames = ['Lio', 'Matti', 'Noah', 'Emil', 'Theo', 'Ben', 'Finn', 'Jona'];
const surnames = ['Funke', 'Sommer', 'Wiese', 'Kraft', 'Berg', 'Keller', 'Stein', 'Vogel'];
const positions = ['TW', 'IV', 'AV', 'DM', 'ZM', 'OM', 'Flügel', 'ST'];

function hashString(value) {
  return [...value].reduce((hash, character) => (hash * 33 + character.charCodeAt(0)) >>> 0, 5381);
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1103515245 + 12345) >>> 0;
    return value / 4294967296;
  };
}

function createYouthPlayer({ state, week, academyLevel }) {
  const random = seededRandom(hashString(`${state.selectedClub.id}-youth-${week}-${academyLevel}`));
  const isSuperTalent = random() < 0.03 + academyLevel * 0.025;
  const strength = Math.round(50 + random() * 12 + academyLevel * 1.4 + (isSuperTalent ? 8 : 0));
  const potentialRating = Math.min(94, Math.round(strength + 10 + random() * 12 + academyLevel * 2 + (isSuperTalent ? 10 : 0)));
  const position = positions[Math.floor(random() * positions.length)];
  const name = `${firstNames[Math.floor(random() * firstNames.length)]} ${surnames[Math.floor(random() * surnames.length)]}`;

  return createDevelopmentPlayer({
    id: `youth-${state.selectedClub.id}-${week}`,
    name,
    teamId: state.selectedClub.id,
    position,
    age: 16 + Math.floor(random() * 3),
    strength,
    pace: Math.min(92, strength + Math.round(random() * 10)),
    shooting: position === 'TW' ? 12 : Math.min(90, strength + Math.round(random() * 8) - 2),
    passing: Math.min(90, strength + Math.round(random() * 8)),
    defending: ['TW', 'IV', 'AV', 'DM'].includes(position) ? Math.min(90, strength + Math.round(random() * 8)) : Math.max(35, strength - 12),
    goalkeeping: position === 'TW' ? Math.min(92, strength + Math.round(random() * 10)) : 6,
    marketValue: Math.round((strength ** 2) * (isSuperTalent ? 3_000 : 1_500) / 50_000) * 50_000,
    salary: 18_000 + strength * 500,
    potential: getPotentialLabel(potentialRating, strength),
    potentialRating,
    form: 58,
    fitness: 86,
    morale: 68,
    isYouthPlayer: true,
    isSuperTalent,
  });
}

export function createInitialYouthState() {
  return {
    lastIntakeMatchday: 0,
    intakeInterval: 4,
    promotedPlayerIds: [],
  };
}

export function maybeGenerateYouthPlayer(state, matchdayNumber) {
  if (!state.selectedClub || matchdayNumber - (state.youthState?.lastIntakeMatchday ?? 0) < (state.youthState?.intakeInterval ?? 4)) {
    return [];
  }

  const academyLevel = state.clubUpgrades?.youthAcademy ?? 0;
  const player = createYouthPlayer({ state, week: matchdayNumber, academyLevel });
  state.squad = [...state.squad, player];
  state.currentWageSum += player.salary ?? 0;
  state.youthPlayers = [player, ...(state.youthPlayers ?? [])].slice(0, 8);
  state.youthState = { ...createInitialYouthState(), ...state.youthState, lastIntakeMatchday: matchdayNumber };

  return [player.isSuperTalent
    ? `💎 Supertalent entdeckt: ${player.name} (${player.position}, Stärke ${player.strength}, Talent ${player.potential}) stößt zum Kader.`
    : `Jugendspieler entdeckt: ${player.name} (${player.position}, Stärke ${player.strength}) trainiert ab sofort mit.`];
}
