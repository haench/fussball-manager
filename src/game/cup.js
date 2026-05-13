import { teams } from '../data/teams.js';
import { simulateMatch } from './simulation.js';

const cupRoundLabels = ['1. Runde', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'];
const prizeByRoundLabel = {
  '1. Runde': 400_000,
  Achtelfinale: 800_000,
  Viertelfinale: 1_600_000,
  Halbfinale: 3_000_000,
  Finale: 6_000_000,
};

function hashString(value) {
  return [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 2166136261);
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function shuffle(entries, seed) {
  const random = seededRandom(hashString(seed));
  const copy = [...entries];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function getRoundLabel(participantCount) {
  if (participantCount <= 2) return 'Finale';
  if (participantCount <= 4) return 'Halbfinale';
  if (participantCount <= 8) return 'Viertelfinale';
  if (participantCount <= 16) return 'Achtelfinale';
  return '1. Runde';
}

function drawRound(participantIds, roundIndex) {
  const shuffled = shuffle(participantIds, `dfb-pokal-${roundIndex}-${participantIds.join('-')}`);
  const matches = [];
  const byes = [];

  for (let index = 0; index < shuffled.length; index += 2) {
    if (!shuffled[index + 1]) {
      byes.push(shuffled[index]);
      continue;
    }

    matches.push({
      id: `cup-r${roundIndex + 1}-m${matches.length + 1}`,
      roundIndex,
      homeTeamId: shuffled[index],
      awayTeamId: shuffled[index + 1],
    });
  }

  return { label: getRoundLabel(participantIds.length), matches, byes, completed: false };
}

export function createInitialCupState() {
  const participantIds = teams.map((team) => team.id);
  return {
    roundIndex: 0,
    activeParticipantIds: participantIds,
    rounds: [drawRound(participantIds, 0)],
    eliminatedTeamIds: [],
    winnerId: null,
    nextRoundMatchdays: [3, 8, 13, 18, 23],
  };
}

function resolveWinner(match, result) {
  if (result.homeGoals > result.awayGoals) return match.homeTeamId;
  if (result.awayGoals > result.homeGoals) return match.awayTeamId;
  return hashString(match.id) % 2 === 0 ? match.homeTeamId : match.awayTeamId;
}

export function simulateCupRound({ state, teamsById, formByTeamId = {}, tacticsByTeamId = {}, lineupByTeamId = {}, squadByTeamId = {} }) {
  const cup = state.cup ?? createInitialCupState();
  const round = cup.rounds[cup.roundIndex];

  if (!round || round.completed || cup.winnerId) return { results: [], messages: [] };

  const results = round.matches.map((match) => {
    const result = simulateMatch({ match, teamsById, formByTeamId, tacticsByTeamId, lineupByTeamId, squadByTeamId });
    const winnerId = resolveWinner(match, result);
    return {
      ...result,
      competition: 'DFB-Pokal',
      roundLabel: round.label,
      winnerId,
      penaltyNote: result.homeGoals === result.awayGoals ? `${teamsById[winnerId].name} gewinnt im Elfmeterschießen.` : '',
    };
  });

  const winnerIds = [...round.byes, ...results.map((result) => result.winnerId)];
  const eliminatedTeamIds = round.matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]).filter((teamId) => !winnerIds.includes(teamId));
  round.completed = true;
  round.results = results;
  cup.eliminatedTeamIds = [...cup.eliminatedTeamIds, ...eliminatedTeamIds];
  cup.activeParticipantIds = winnerIds;

  const userResult = results.find((result) => result.homeTeamId === state.selectedClub.id || result.awayTeamId === state.selectedClub.id);
  const messages = [`${round.label} im DFB-Pokal wurde ausgelost und gespielt.`];

  if (round.byes.includes(state.selectedClub.id)) {
    messages.push('Freilos im Pokal! Dein Team steht kampflos in der nächsten Runde.');
  }

  if (userResult?.winnerId === state.selectedClub.id || round.byes.includes(state.selectedClub.id)) {
    const prize = prizeByRoundLabel[round.label] ?? 500_000;
    state.transferBudget += prize;
    state.budget = state.transferBudget;
    messages.push(`Pokalprämie kassiert: ${prize.toLocaleString('de-DE')} €.`);
  } else if (userResult) {
    messages.push(`Aus im DFB-Pokal: ${userResult.homeTeam} ${userResult.homeGoals}:${userResult.awayGoals} ${userResult.awayTeam}.`);
  }

  if (winnerIds.length === 1) {
    cup.winnerId = winnerIds[0];
    messages.push(`DFB-Pokalsieger: ${teamsById[cup.winnerId].name}!`);
  } else {
    cup.roundIndex += 1;
    cup.rounds.push(drawRound(winnerIds, cup.roundIndex));
  }

  return { results, messages, userResult, winnerId: cup.winnerId };
}

export function shouldPlayCupRound(cup, matchdayNumber) {
  return Boolean(cup && cup.nextRoundMatchdays.includes(matchdayNumber) && !cup.winnerId);
}

export function getCupRoundLabels() {
  return cupRoundLabels;
}
