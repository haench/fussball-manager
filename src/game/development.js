export const potentialLabels = ['niedrig', 'mittel', 'hoch', 'riesig'];

const potentialGrowth = {
  niedrig: 0.22,
  mittel: 0.4,
  hoch: 0.68,
  riesig: 0.95,
};

function clampRating(value) {
  return Math.max(1, Math.min(99, Math.round(value)));
}

function developmentRoom(player) {
  const ceiling = player.potentialRating ?? player.strength + 4;
  return Math.max(0, ceiling - player.strength);
}

export function getPotentialLabel(potentialRating, strength) {
  const room = potentialRating - strength;

  if (potentialRating >= 86 || room >= 14) return 'riesig';
  if (potentialRating >= 80 || room >= 9) return 'hoch';
  if (potentialRating >= 74 || room >= 5) return 'mittel';
  return 'niedrig';
}

export function createDevelopmentPlayer(player) {
  const potentialRating = player.potentialRating ?? (typeof player.potential === 'number' ? player.potential : player.strength + 6);

  return {
    ...player,
    potential: potentialLabels.includes(player.potential) ? player.potential : getPotentialLabel(potentialRating, player.strength),
    potentialRating,
    form: player.form ?? 55,
    fitness: player.fitness ?? 82,
    morale: player.morale ?? 60,
  };
}

export function applyMatchMood(squad, match, teamId, { fatigueReduction = 0 } = {}) {
  if (!match || !teamId) return [];

  const goalsFor = match.homeTeamId === teamId ? match.homeGoals : match.awayGoals;
  const goalsAgainst = match.homeTeamId === teamId ? match.awayGoals : match.homeGoals;
  const won = goalsFor > goalsAgainst;
  const goodGame = won || goalsFor >= 3;
  const toughGame = goalsFor < goalsAgainst;

  squad.forEach((player) => {
    const fatigueLoss = (goodGame ? 4 : 6) * (1 - fatigueReduction);
    player.fitness = clampRating((player.fitness ?? 82) - fatigueLoss);
    player.form = clampRating((player.form ?? 55) + (goodGame ? 7 : toughGame ? -5 : 1));
    player.morale = clampRating((player.morale ?? 60) + (won ? 8 : toughGame ? -6 : 2));
  });

  if (goodGame) {
    return ['Gutes Spiel! Form und Moral deiner Spieler sind gestiegen.'];
  }

  if (toughGame) {
    return ['Schwieriges Spiel: Einige Spieler brauchen jetzt Aufmunterung.'];
  }

  return ['Ordentliches Spiel: Die Stimmung bleibt stabil.'];
}

export function applyMonthlyDevelopment(squad, { trainingGroundBonus = 1 } = {}) {
  const messages = [];

  squad.forEach((player) => {
    const room = developmentRoom(player);
    if (room <= 0) return;

    const ageBonus = player.age <= 20 ? 0.5 : player.age <= 23 ? 0.3 : player.age <= 26 ? 0.12 : -0.12;
    const moodBonus = ((player.form ?? 55) - 50) / 120 + ((player.morale ?? 60) - 50) / 140;
    const fitnessBonus = ((player.fitness ?? 82) - 70) / 180;
    const growthChance = ((potentialGrowth[player.potential] ?? potentialGrowth.mittel) + ageBonus + moodBonus + fitnessBonus) * trainingGroundBonus;

    if (growthChance >= 0.9 || (player.age <= 21 && ['hoch', 'riesig'].includes(player.potential) && growthChance >= 0.78)) {
      player.strength = clampRating(player.strength + 1);
      player.marketValue = Math.round((player.marketValue ?? 0) * 1.04 / 50000) * 50000;
      messages.push(`Dein Talent ${player.name} ist stärker geworden!`);
      messages.push(`${player.name} hat jetzt Stärke ${player.strength}.`);
    }
  });

  return messages;
}
