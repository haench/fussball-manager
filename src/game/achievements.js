export const achievementDefinitions = {
  firstWin: { label: 'Erster Sieg', description: 'Gewinne dein erstes Pflichtspiel.' },
  fiveWinsInRow: { label: '5 Siege in Folge', description: 'Baue eine Siegesserie von fünf Spielen auf.' },
  promotion: { label: 'Aufstieg', description: 'Beende die Saison in der 2. Bundesliga auf einem Aufstiegsplatz.' },
  championship: { label: 'Meisterschaft', description: 'Werde Tabellenführer am Saisonende.' },
  cupWin: { label: 'Pokalsieg', description: 'Gewinne den DFB-Pokal.' },
  talent80: { label: 'Talent auf Stärke 80', description: 'Entwickle einen jungen Spieler auf Stärke 80.' },
  sold50m: { label: '50-Mio.-Transfer', description: 'Verkaufe einen Spieler für mindestens 50 Mio. €.' },
};

export function createInitialAchievementState() {
  return {
    unlocked: [],
    winStreak: 0,
  };
}

function unlock(state, key, messages) {
  if (state.achievements.unlocked.includes(key)) return;
  state.achievements.unlocked = [...state.achievements.unlocked, key];
  messages.push(`🏆 Erfolg freigeschaltet: ${achievementDefinitions[key].label}!`);
  state.feedbackEffects = ['confetti', ...(state.feedbackEffects ?? [])].slice(0, 3);
}

export function evaluateAchievements(state, context = {}) {
  state.achievements = { ...createInitialAchievementState(), ...state.achievements };
  const messages = [];

  if (context.userResult) {
    const goalsFor = context.userResult.homeTeamId === state.selectedClub.id ? context.userResult.homeGoals : context.userResult.awayGoals;
    const goalsAgainst = context.userResult.homeTeamId === state.selectedClub.id ? context.userResult.awayGoals : context.userResult.homeGoals;
    const won = goalsFor > goalsAgainst;
    state.achievements.winStreak = won ? state.achievements.winStreak + 1 : 0;
    if (won) unlock(state, 'firstWin', messages);
    if (state.achievements.winStreak >= 5) unlock(state, 'fiveWinsInRow', messages);
  }

  if (context.salePrice >= 50_000_000) unlock(state, 'sold50m', messages);
  if (state.squad.some((player) => player.age <= 23 && player.strength >= 80)) unlock(state, 'talent80', messages);

  const userRow = state.table.find((row) => row.teamId === state.selectedClub?.id);
  if (context.seasonFinished && userRow) {
    if (state.currentLeague === '2. Bundesliga' && userRow.position <= 2) unlock(state, 'promotion', messages);
    if (state.currentLeague === 'Bundesliga' && userRow.position === 1) unlock(state, 'championship', messages);
  }

  if (context.cupWinnerId === state.selectedClub?.id) unlock(state, 'cupWin', messages);

  return messages;
}
