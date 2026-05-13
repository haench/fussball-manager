import { getPlayersByTeamId } from '../data/players.js';
import { leagues, teamsByLeague } from '../data/teams.js';

export { leagues };
export const clubs = teamsByLeague;

export const initialGameState = {
  selectedClub: null,
  currentLeague: null,
  currentMatchday: 1,
  budget: 0,
  squad: [],
  table: [],
};

export const gameState = structuredClone(initialGameState);

export function createInitialSquad(teamId) {
  return getPlayersByTeamId(teamId);
}

export function createInitialTable(league, selectedClubId) {
  return clubs[league]
    .map((club, index) => ({
      position: index + 1,
      club: club.name,
      played: 0,
      points: club.id === selectedClubId ? 3 : Math.max(0, 2 - index),
      goalDifference: club.id === selectedClubId ? 2 : 0,
    }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference)
    .map((row, index) => ({ ...row, position: index + 1 }));
}

export function startNewGame(club) {
  Object.assign(gameState, {
    selectedClub: club,
    currentLeague: club.league,
    currentMatchday: 1,
    budget: club.budget,
    squad: createInitialSquad(club.id),
    table: createInitialTable(club.league, club.id),
  });

  return gameState;
}
