export const DATA_MODES = Object.freeze({
  FANTASY: 'fantasy',
  REAL_IMPORT: 'realImport',
});

export const TEAMS_PER_LEAGUE = 18;

const fantasyLeagueDefinitions = [
  {
    league: 'Bundesliga',
    budgets: [82, 76, 70, 64, 60, 56, 52, 49, 46, 43, 40, 38, 36, 34, 32, 30, 28, 26],
    clubs: [
      ['alpental', 'Alpental Adler'],
      ['hafenstadt', 'Hafenstadt Möwen'],
      ['ruhrstadt', 'Ruhrstadt Funken'],
      ['mainburg', 'Mainburg Wölfe'],
      ['neckarau', 'Neckarau Kometen'],
      ['spreewald', 'Spreewald Füchse'],
      ['heide', 'Heide Hirsche'],
      ['donau', 'Donau Drachen'],
      ['bergfeld', 'Bergfeld Bären'],
      ['nordhain', 'Nordhain Raben'],
      ['sonnenau', 'Sonnenau Falken'],
      ['taunus', 'Taunus Titanen'],
      ['weser', 'Weser Wellen'],
      ['erzstadt', 'Erzstadt Echos'],
      ['linden', 'Linden Löwen'],
      ['ostmark', 'Ostmark Otter'],
      ['felsen', 'Felsen Füchse'],
      ['moortal', 'Moortal Monarchen'],
    ],
  },
  {
    league: '2. Bundesliga',
    budgets: [24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7],
    clubs: [
      ['elbe', 'Elbe Piraten'],
      ['kohlenpott', 'Kohlenpott Knappen'],
      ['isar', 'Isar Sterne'],
      ['weinstadt', 'Weinstadt Trauben'],
      ['kuesten', 'Küsten Kicker'],
      ['waldhain', 'Waldhain Eulen'],
      ['flussheim', 'Flussheim Forellen'],
      ['rotbach', 'Rotbach Renner'],
      ['silbersee', 'Silbersee Segler'],
      ['windorf', 'Windorf Wirbel'],
      ['grenzau', 'Grenzau Geckos'],
      ['kirchberg', 'Kirchberg Kraniche'],
      ['moorburg', 'Moorburg Marder'],
      ['quellstadt', 'Quellstadt Quallen'],
      ['rheintal', 'Rheintal Rehe'],
      ['steinfurt', 'Steinfurt Störche'],
      ['tannen', 'Tannen Tiger'],
      ['wiesen', 'Wiesen Wiesel'],
    ],
  },
];

export const fantasyTeams = fantasyLeagueDefinitions.flatMap(({ league, clubs, budgets }) =>
  clubs.map(([id, name], index) => ({
    id,
    name,
    league,
    budget: budgets[index] * 1_000_000,
    dataMode: DATA_MODES.FANTASY,
    nameMode: DATA_MODES.FANTASY,
  })),
);

export let activeDataMode = DATA_MODES.FANTASY;
export let teams = structuredClone(fantasyTeams);
export let leagues = createLeagues(teams);
export let teamsByLeague = groupTeamsByLeague(teams);

function createLeagues(teamList) {
  return [...new Set(teamList.map((team) => team.league))];
}

function groupTeamsByLeague(teamList) {
  return teamList.reduce((groupedTeams, team) => {
    groupedTeams[team.league] = [...(groupedTeams[team.league] ?? []), team];
    return groupedTeams;
  }, {});
}

function normalizeText(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeBudget(value, fallback) {
  const budget = Number(value);
  return Number.isFinite(budget) && budget > 0 ? Math.round(budget) : fallback;
}

export function validateTeamModel(teamList) {
  if (!Array.isArray(teamList) || teamList.length === 0) {
    throw new Error('Die JSON-Datei benötigt ein teams-Array.');
  }

  const seenIds = new Set();
  const normalizedTeams = teamList.map((team, index) => {
    const id = normalizeText(team?.id, `import-team-${index + 1}`).toLocaleLowerCase('de-DE').replace(/[^a-z0-9-]/g, '-');

    if (seenIds.has(id)) {
      throw new Error(`Team-ID mehrfach vergeben: ${id}`);
    }

    seenIds.add(id);

    return {
      id,
      name: normalizeText(team?.name, `Import Team ${index + 1}`),
      league: normalizeText(team?.league, 'Import Liga'),
      budget: normalizeBudget(team?.budget, 10_000_000),
      dataMode: DATA_MODES.REAL_IMPORT,
      nameMode: DATA_MODES.REAL_IMPORT,
    };
  });

  const leagueSizes = groupTeamsByLeague(normalizedTeams);
  Object.entries(leagueSizes).forEach(([league, leagueTeams]) => {
    if (leagueTeams.length > TEAMS_PER_LEAGUE) {
      throw new Error(`${league} enthält ${leagueTeams.length} Teams. Unterstützt sind maximal ${TEAMS_PER_LEAGUE}.`);
    }

    if (leagueTeams.length < 2 || leagueTeams.length % 2 !== 0) {
      throw new Error(`${league} benötigt eine gerade Anzahl von mindestens zwei Teams.`);
    }
  });

  return normalizedTeams;
}

export function useFantasyTeams() {
  activeDataMode = DATA_MODES.FANTASY;
  teams = structuredClone(fantasyTeams);
  leagues = createLeagues(teams);
  teamsByLeague = groupTeamsByLeague(teams);
  return teams;
}

export function useImportedTeams(teamList) {
  activeDataMode = DATA_MODES.REAL_IMPORT;
  teams = validateTeamModel(teamList);
  leagues = createLeagues(teams);
  teamsByLeague = groupTeamsByLeague(teams);
  return teams;
}
