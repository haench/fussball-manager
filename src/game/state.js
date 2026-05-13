export const leagues = ['Bundesliga', '2. Bundesliga'];

export const clubs = {
  Bundesliga: [
    { name: 'Bayern München', league: 'Bundesliga', budget: 150_000_000 },
    { name: 'Borussia Dortmund', league: 'Bundesliga', budget: 95_000_000 },
    { name: 'Bayer Leverkusen', league: 'Bundesliga', budget: 88_000_000 },
    { name: 'RB Leipzig', league: 'Bundesliga', budget: 80_000_000 },
    { name: 'VfB Stuttgart', league: 'Bundesliga', budget: 45_000_000 },
    { name: 'Eintracht Frankfurt', league: 'Bundesliga', budget: 55_000_000 },
  ],
  '2. Bundesliga': [
    { name: 'Hamburger SV', league: '2. Bundesliga', budget: 22_000_000 },
    { name: 'FC Schalke 04', league: '2. Bundesliga', budget: 24_000_000 },
    { name: 'Hertha BSC', league: '2. Bundesliga', budget: 18_000_000 },
    { name: '1. FC Nürnberg', league: '2. Bundesliga', budget: 12_000_000 },
    { name: 'Hannover 96', league: '2. Bundesliga', budget: 15_000_000 },
    { name: 'Fortuna Düsseldorf', league: '2. Bundesliga', budget: 14_000_000 },
  ],
};

export const initialGameState = {
  selectedClub: null,
  currentLeague: null,
  currentMatchday: 1,
  budget: 0,
  squad: [],
  table: [],
};

export const gameState = structuredClone(initialGameState);

export function createInitialSquad(clubName) {
  return [
    { id: 1, name: `${clubName} Keeper`, position: 'Tor', strength: 73 },
    { id: 2, name: `${clubName} Libero`, position: 'Abwehr', strength: 70 },
    { id: 3, name: `${clubName} Abräumer`, position: 'Mittelfeld', strength: 71 },
    { id: 4, name: `${clubName} Spielmacher`, position: 'Mittelfeld', strength: 75 },
    { id: 5, name: `${clubName} Torjäger`, position: 'Sturm', strength: 76 },
  ];
}

export function createInitialTable(league, selectedClubName) {
  return clubs[league]
    .map((club, index) => ({
      position: index + 1,
      club: club.name,
      played: 0,
      points: club.name === selectedClubName ? 3 : Math.max(0, 2 - index),
      goalDifference: club.name === selectedClubName ? 2 : 0,
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
    squad: createInitialSquad(club.name),
    table: createInitialTable(club.league, club.name),
  });

  return gameState;
}
