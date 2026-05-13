export const teams = [
  { id: 'alpental', name: 'Alpental Adler', league: 'Bundesliga', budget: 82_000_000, nameMode: 'fantasy' },
  { id: 'hafenstadt', name: 'Hafenstadt Möwen', league: 'Bundesliga', budget: 64_000_000, nameMode: 'fantasy' },
  { id: 'ruhrstadt', name: 'Ruhrstadt Funken', league: 'Bundesliga', budget: 58_000_000, nameMode: 'fantasy' },
  { id: 'mainburg', name: 'Mainburg Wölfe', league: 'Bundesliga', budget: 52_000_000, nameMode: 'fantasy' },
  { id: 'neckarau', name: 'Neckarau Kometen', league: 'Bundesliga', budget: 46_000_000, nameMode: 'fantasy' },
  { id: 'spreewald', name: 'Spreewald Füchse', league: 'Bundesliga', budget: 40_000_000, nameMode: 'fantasy' },
  { id: 'elbe', name: 'Elbe Piraten', league: '2. Bundesliga', budget: 24_000_000, nameMode: 'fantasy' },
  { id: 'kohlenpott', name: 'Kohlenpott Knappen', league: '2. Bundesliga', budget: 22_000_000, nameMode: 'fantasy' },
  { id: 'isar', name: 'Isar Sterne', league: '2. Bundesliga', budget: 20_000_000, nameMode: 'fantasy' },
  { id: 'weinstadt', name: 'Weinstadt Trauben', league: '2. Bundesliga', budget: 18_000_000, nameMode: 'fantasy' },
  { id: 'kuesten', name: 'Küsten Kicker', league: '2. Bundesliga', budget: 16_000_000, nameMode: 'fantasy' },
  { id: 'waldhain', name: 'Waldhain Eulen', league: '2. Bundesliga', budget: 14_000_000, nameMode: 'fantasy' },
];

export const leagues = [...new Set(teams.map((team) => team.league))];

export const teamsByLeague = teams.reduce((groupedTeams, team) => {
  groupedTeams[team.league] = [...(groupedTeams[team.league] ?? []), team];
  return groupedTeams;
}, {});
