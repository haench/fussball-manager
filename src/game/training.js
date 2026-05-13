export const trainingFocusOptions = [
  { value: 'Angriff', label: 'Angriff', description: 'Mehr Mut vor dem Tor und bessere Schüsse.' },
  { value: 'Abwehr', label: 'Abwehr', description: 'Sicher stehen, Bälle klären und zusammen verteidigen.' },
  { value: 'Fitness', label: 'Fitness', description: 'Frische Beine sammeln und Müdigkeit abbauen.' },
  { value: 'Technik', label: 'Technik', description: 'Pässe, Ballgefühl und kleine Tricks üben.' },
  { value: 'Teamgeist', label: 'Teamgeist', description: 'Alle halten zusammen und die Stimmung steigt.' },
];

const focusMessages = {
  Angriff: 'Dein Team übt mutige Angriffe und Torabschlüsse.',
  Abwehr: 'Dein Team trainiert Zweikämpfe und gutes Verschieben.',
  Fitness: 'Dein Team sammelt frische Beine für den nächsten Spieltag.',
  Technik: 'Dein Team verbessert Pässe, Dribblings und Ballgefühl.',
  Teamgeist: 'Dein Team macht Vertrauensspiele und jubelt zusammen.',
};

function clampMood(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeTrainingFocus(focus) {
  return trainingFocusOptions.some((option) => option.value === focus) ? focus : 'Teamgeist';
}

export function applyWeeklyTraining(squad, focus) {
  const normalizedFocus = normalizeTrainingFocus(focus);

  squad.forEach((player) => {
    if (normalizedFocus === 'Fitness') {
      player.fitness = clampMood((player.fitness ?? 80) + 8);
      player.form = clampMood((player.form ?? 50) + 1);
      return;
    }

    if (normalizedFocus === 'Teamgeist') {
      player.morale = clampMood((player.morale ?? 55) + 7);
      player.fitness = clampMood((player.fitness ?? 80) - 1);
      return;
    }

    player.form = clampMood((player.form ?? 50) + 3);
    player.fitness = clampMood((player.fitness ?? 80) - 3);
    player.morale = clampMood((player.morale ?? 55) + 1);
  });

  return focusMessages[normalizedFocus];
}

export function planAutomaticTraining(state) {
  const averageFitness = state.squad.reduce((sum, player) => sum + (player.fitness ?? 80), 0) / Math.max(1, state.squad.length);
  const averageMorale = state.squad.reduce((sum, player) => sum + (player.morale ?? 55), 0) / Math.max(1, state.squad.length);
  const recentGoals = state.liveMatch
    ? (state.liveMatch.homeTeamId === state.selectedClub.id ? state.liveMatch.homeGoals : state.liveMatch.awayGoals)
    : 1;
  const recentGoalsAgainst = state.liveMatch
    ? (state.liveMatch.homeTeamId === state.selectedClub.id ? state.liveMatch.awayGoals : state.liveMatch.homeGoals)
    : 1;

  if (averageFitness < 68) return 'Fitness';
  if (averageMorale < 50) return 'Teamgeist';
  if (recentGoalsAgainst >= 3) return 'Abwehr';
  if (recentGoals === 0) return 'Angriff';
  return 'Technik';
}
