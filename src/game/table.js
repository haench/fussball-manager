import { teamsByLeague } from '../data/teams.js';

const BUNDESLIGA_GOAL_RULES = [
  { minBudget: 80_000_000, type: 'champion', label: 'Meister werden', targetLabel: 'Platz 1', minPosition: 1, maxPosition: 1 },
  { minBudget: 46_000_000, type: 'international', label: 'international qualifizieren', targetLabel: 'Platz 1–6', minPosition: 1, maxPosition: 6 },
  { minBudget: 0, type: 'survival', label: 'Klassenerhalt', targetLabel: 'Platz 1–15', minPosition: 1, maxPosition: 15 },
];

const SECOND_LEAGUE_GOAL_RULES = [
  { minBudget: 18_000_000, type: 'promotion', label: 'Aufstieg', targetLabel: 'Platz 1–2', minPosition: 1, maxPosition: 2 },
  { minBudget: 0, type: 'survival', label: 'Klassenerhalt', targetLabel: 'Platz 1–15', minPosition: 1, maxPosition: 15 },
];

function getLeagueTeams(leagueOrTeams) {
  if (Array.isArray(leagueOrTeams)) return leagueOrTeams;
  return teamsByLeague[leagueOrTeams] ?? [];
}

function createInitialRows(leagueOrTeams) {
  return getLeagueTeams(leagueOrTeams).map((club) => ({
    position: 0,
    club: club.name,
    teamId: club.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }));
}

export function sortTableRows(rows) {
  return [...rows]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.club.localeCompare(b.club),
    )
    .map((row, index) => ({ ...row, position: index + 1 }));
}

export function calculateLeagueTable(leagueOrTeams, completedMatches = []) {
  const rowsByTeamId = Object.fromEntries(createInitialRows(leagueOrTeams).map((row) => [row.teamId, row]));

  completedMatches.forEach((match) => {
    const homeRow = rowsByTeamId[match.homeTeamId];
    const awayRow = rowsByTeamId[match.awayTeamId];

    if (!homeRow || !awayRow || match.homeGoals == null || match.awayGoals == null) {
      return;
    }

    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.goalsFor += match.homeGoals;
    homeRow.goalsAgainst += match.awayGoals;
    awayRow.goalsFor += match.awayGoals;
    awayRow.goalsAgainst += match.homeGoals;

    if (match.homeGoals > match.awayGoals) {
      homeRow.won += 1;
      awayRow.lost += 1;
      homeRow.points += 3;
    } else if (match.awayGoals > match.homeGoals) {
      awayRow.won += 1;
      homeRow.lost += 1;
      awayRow.points += 3;
    } else {
      homeRow.drawn += 1;
      awayRow.drawn += 1;
      homeRow.points += 1;
      awayRow.points += 1;
    }
  });

  Object.values(rowsByTeamId).forEach((row) => {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  });

  return sortTableRows(Object.values(rowsByTeamId));
}

export function createInitialTable(leagueOrTeams) {
  return calculateLeagueTable(leagueOrTeams, []);
}

export function getTableZone(row, league) {
  if (!row) return { key: 'neutral', label: 'Mittelfeld' };

  if (league === '2. Bundesliga') {
    if (row.position <= 2) return { key: 'promotion', label: 'Aufstieg' };
    if (row.position === 3) return { key: 'relegation', label: 'Relegation' };
    if (row.position >= 16) return { key: 'demotion', label: 'Abstieg' };
    return { key: 'neutral', label: 'Mittelfeld' };
  }

  if (row.position === 1) return { key: 'title', label: 'Meisterschaft' };
  if (row.position <= 4) return { key: 'top', label: 'Topplätze' };
  if (row.position === 16) return { key: 'relegation', label: 'Relegation' };
  if (row.position >= 17) return { key: 'demotion', label: 'Abstieg' };
  return { key: 'neutral', label: 'Mittelfeld' };
}

export function createSeasonGoal(club) {
  const rules = club.league === '2. Bundesliga' ? SECOND_LEAGUE_GOAL_RULES : BUNDESLIGA_GOAL_RULES;
  const rule = rules.find((entry) => club.budget >= entry.minBudget) ?? rules.at(-1);

  return {
    type: rule.type,
    label: rule.label,
    targetLabel: rule.targetLabel,
    minPosition: rule.minPosition,
    maxPosition: rule.maxPosition,
  };
}

export function getSeasonGoalStatus(state) {
  const goal = state.seasonGoal ?? (state.selectedClub ? createSeasonGoal(state.selectedClub) : null);
  const currentRow = state.table.find((row) => row.teamId === state.selectedClub?.id) ?? null;
  const targetBoundaryRow = state.table.find((row) => row.position === goal?.maxPosition) ?? null;
  const currentPosition = currentRow?.position ?? null;
  const isInTarget = currentPosition != null && goal != null && currentPosition >= goal.minPosition && currentPosition <= goal.maxPosition;
  const pointsBehind = isInTarget || !currentRow || !targetBoundaryRow
    ? 0
    : Math.max(0, targetBoundaryRow.points - currentRow.points + 1);

  return {
    goal,
    currentRow,
    currentPosition,
    isInTarget,
    pointsBehind,
  };
}
