import { achievementDefinitions } from './achievements.js';
import { getSeasonGoalStatus, getTableZone } from './table.js';

function isCompleteMatch(match) {
  return Boolean(match?.completed && match.homeGoals != null && match.awayGoals != null);
}

export function isFinalMatchdayComplete(state) {
  if (!state?.schedule?.length) return false;

  const scheduledMatchIds = new Set(state.schedule.flatMap((matchday) => matchday.matches.map((match) => match.id)));
  const completedMatchIds = new Set((state.completedMatches ?? []).filter(isCompleteMatch).map((match) => match.id));

  return scheduledMatchIds.size > 0 && [...scheduledMatchIds].every((matchId) => completedMatchIds.has(matchId));
}

function countScorers(matches) {
  const scorersByKey = new Map();

  matches.forEach((match) => {
    (match.scorers ?? []).forEach((scorer) => {
      const key = `${scorer.teamId}:${scorer.name}`;
      const current = scorersByKey.get(key) ?? {
        name: scorer.name,
        team: scorer.team,
        teamId: scorer.teamId,
        goals: 0,
      };

      scorersByKey.set(key, { ...current, goals: current.goals + 1 });
    });
  });

  return [...scorersByKey.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}

function getRowsByZone(table, league) {
  return table.reduce((zones, row) => {
    const zone = getTableZone(row, league, table.length).key;
    zones[zone] = [...(zones[zone] ?? []), row];
    return zones;
  }, {});
}

function getUnlockedAchievements(state) {
  return (state.achievements?.unlocked ?? []).map((key) => ({
    key,
    ...achievementDefinitions[key],
  })).filter((achievement) => achievement.label);
}

export function getSeasonEndSummary(state) {
  const goalStatus = getSeasonGoalStatus(state);
  const zones = getRowsByZone(state.table ?? [], state.currentLeague);
  const champion = state.table?.[0] ?? null;
  const userRow = state.table?.find((row) => row.teamId === state.selectedClub?.id) ?? null;
  const topScorers = countScorers(state.completedMatches ?? []);
  const goalAchieved = Boolean(goalStatus.goal && goalStatus.isInTarget);
  const cupWon = state.cup?.winnerId === state.selectedClub?.id;
  const promoted = state.currentLeague === '2. Bundesliga' ? (zones.promotion ?? []) : [];
  const relegated = zones.demotion ?? [];
  const relegation = zones.relegation ?? [];
  const bigSuccess = Boolean(
    goalAchieved
      || cupWon
      || (state.currentLeague === 'Bundesliga' && userRow?.position === 1)
      || (state.currentLeague === '2. Bundesliga' && userRow?.position <= 2),
  );

  return {
    isComplete: isFinalMatchdayComplete(state),
    userRow,
    champion,
    goal: goalStatus.goal,
    goalAchieved,
    goalStatus,
    promoted,
    relegated,
    relegation,
    topScorers,
    unlockedAchievements: getUnlockedAchievements(state),
    cupWon,
    bigSuccess,
  };
}
