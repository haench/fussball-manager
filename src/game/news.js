import { teamsByLeague } from '../data/teams.js';
import { getSeasonGoalStatus } from './table.js';

const MAX_NEWS_ITEMS = 12;

function createNewsItem(matchday, type, title, text) {
  return {
    id: `${matchday}-${type}-${title.toLocaleLowerCase('de-DE').replace(/[^a-z0-9äöüß]+/gi, '-').replace(/(^-|-$)/g, '')}`,
    matchday,
    type,
    title,
    text,
  };
}

function getUserGoals(match, teamId) {
  if (!match || !teamId) return { for: 0, against: 0, opponentId: null, opponentName: '' };

  const isHome = match.homeTeamId === teamId;
  return {
    for: isHome ? match.homeGoals : match.awayGoals,
    against: isHome ? match.awayGoals : match.homeGoals,
    opponentId: isHome ? match.awayTeamId : match.homeTeamId,
    opponentName: isHome ? match.awayTeam : match.homeTeam,
  };
}

function getBestHighWin(results) {
  return [...results]
    .map((match) => ({
      winner: match.homeGoals > match.awayGoals ? match.homeTeam : match.awayGoals > match.homeGoals ? match.awayTeam : null,
      diff: Math.abs(match.homeGoals - match.awayGoals),
      winnerGoals: Math.max(match.homeGoals, match.awayGoals),
    }))
    .filter((entry) => entry.winner && entry.diff >= 3)
    .sort((a, b) => b.diff - a.diff || b.winnerGoals - a.winnerGoals)[0] ?? null;
}

function findDoubleScoringStriker(state, results) {
  const strikerNames = new Set(state.squad.filter((player) => player.position === 'ST').map((player) => player.name));
  const userScorers = results
    .flatMap((match) => match.scorers ?? [])
    .filter((scorer) => scorer.teamId === state.selectedClub?.id && strikerNames.has(scorer.name));
  const scorerCounts = userScorers.reduce((counts, scorer) => {
    counts[scorer.name] = (counts[scorer.name] ?? 0) + 1;
    return counts;
  }, {});

  return Object.entries(scorerCounts).find(([, goals]) => goals >= 2)?.[0] ?? null;
}

function isTopClubOrRival(state, opponentId) {
  const leagueTeams = teamsByLeague[state.currentLeague] ?? [];
  const topClubIds = new Set([...leagueTeams].sort((a, b) => b.budget - a.budget).slice(0, 2).map((team) => team.id));
  const userRow = state.table.find((row) => row.teamId === state.selectedClub?.id);
  const opponentRow = state.table.find((row) => row.teamId === opponentId);
  const isTableRival = userRow && opponentRow && Math.abs(userRow.position - opponentRow.position) <= 1;
  const isBudgetRival = leagueTeams.some(
    (team) => team.id === opponentId && Math.abs(team.budget - (state.selectedClub?.budget ?? 0)) <= 8_000_000,
  );

  return topClubIds.has(opponentId) || isTableRival || isBudgetRival;
}

function findTiredPlayer(squad) {
  return [...squad]
    .filter((player) => (player.fitness ?? 100) <= 64)
    .sort((a, b) => (a.fitness ?? 100) - (b.fitness ?? 100))[0] ?? null;
}

function findTransferTarget(squad) {
  return [...squad]
    .filter((player) => player.age <= 29)
    .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))[0] ?? null;
}

export function createInitialNewsItems(clubName) {
  return [
    createNewsItem(0, 'start', 'Saison startet', `${clubName} ist bereit. Die Fans freuen sich auf viele schöne Fußballmomente!`),
  ];
}

export function generateMatchdayNews({ state, matchday, results, userResult }) {
  const items = [];
  const matchdayNumber = matchday?.matchday ?? state.currentMatchday;
  const highWin = getBestHighWin(results);
  const doubleScorer = findDoubleScoringStriker(state, results);
  const goalStatus = getSeasonGoalStatus(state);
  const userGoals = getUserGoals(userResult, state.selectedClub?.id);
  const tiredPlayer = findTiredPlayer(state.squad);
  const transferTarget = matchdayNumber % 3 === 0 ? findTransferTarget(state.squad) : null;

  if (highWin) {
    items.push(createNewsItem(
      matchdayNumber,
      'high-win',
      'Großer Jubel',
      `${highWin.winner} gewinnt deutlich mit ${highWin.winnerGoals} Toren. Die Kinder im Stadion klatschen begeistert!`,
    ));
  }

  if (userResult && userGoals.for < userGoals.against && isTopClubOrRival(state, userGoals.opponentId)) {
    items.push(createNewsItem(
      matchdayNumber,
      'tough-loss',
      'Kopf hoch',
      `${state.selectedClub.name} verliert gegen ${userGoals.opponentName}. Das Team bleibt mutig und trainiert weiter zusammen.`,
    ));
  }

  if (doubleScorer) {
    items.push(createNewsItem(
      matchdayNumber,
      'double-striker',
      'Doppelpack',
      `${doubleScorer} trifft zweimal. Seine Mitspieler feiern ihn mit einem breiten Lächeln.`,
    ));
  }

  if (goalStatus.goal && goalStatus.currentRow) {
    const boardText = goalStatus.isInTarget
      ? `Der Vorstand ist zufrieden: Platz ${goalStatus.currentPosition} passt prima zum Saisonziel.`
      : `Der Vorstand macht Mut: Mit Teamgeist kann ${state.selectedClub.name} das Ziel noch schaffen.`;
    items.push(createNewsItem(matchdayNumber, 'board', 'Vorstand schaut hin', boardText));
  }

  if (state.currentLeague === '2. Bundesliga' && goalStatus.currentPosition && goalStatus.currentPosition <= 3) {
    items.push(createNewsItem(
      matchdayNumber,
      'promotion-dream',
      'Aufstiegstraum',
      `Die Fans von ${state.selectedClub.name} träumen vom Aufstieg und singen fröhlich im Block.`,
    ));
  }

  if (tiredPlayer) {
    items.push(createNewsItem(
      matchdayNumber,
      'injury',
      'Kleine Pause',
      `${tiredPlayer.name} hat eine kleine Verletzung und ruht sich aus. Gute Besserung!`,
    ));
  }

  if (transferTarget) {
    items.push(createNewsItem(
      matchdayNumber,
      'transfer-offer',
      'Transferanfrage',
      `Ein anderer Verein fragt freundlich nach ${transferTarget.name}. Dein Managerteam entscheidet ganz in Ruhe.`,
    ));
  }

  return items.slice(0, 5);
}

export function addNewsItems(state, items) {
  const combinedItems = [...items, ...(state.newsItems ?? [])];
  const seenIds = new Set();

  state.newsItems = combinedItems
    .filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    })
    .slice(0, MAX_NEWS_ITEMS);
  return state.newsItems;
}
