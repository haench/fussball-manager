import { DEFAULT_FORMATION, AWAY_DEFAULT_FORMATION, getFormationDefinition } from "./formations.js";

export const leagueSize = 18;
export const totalMatchDays = 34;
export const seasonStartYear = 2026;

const leagueIds = ["liga1", "liga2", "liga3"];
const positionMap = {
  "Torhüter": "goalkeeper",
  "Torhueter": "goalkeeper",
  "Verteidigung": "defender",
  "Mittelfeld": "midfielder",
  "Sturm": "striker",
  TW: "goalkeeper",
  VT: "defender",
  MF: "midfielder",
  ST: "striker"
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizePosition(position) {
  return positionMap[position] ?? positionMap[String(position ?? "").trim()] ?? "midfielder";
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createStanding(teamId) {
  return {
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0
  };
}

function createUserTrainingFacility() {
  return { level: 20, upgradeInProgress: null };
}

function createUserYouthAcademy() {
  return {
    level: 20,
    upgradeInProgress: null,
    pendingOffer: null,
    offersThisSeason: 0,
    seasonDay: 1
  };
}

function createUserStadium() {
  return {
    ticketPriceLevel: "medium",
    stands: {
      north: { capacity: 100, upgradeInProgress: null },
      south: { capacity: 100, upgradeInProgress: null },
      east: { capacity: 200, upgradeInProgress: null },
      west: { capacity: 200, upgradeInProgress: null }
    },
    lastMatchRevenue: null
  };
}

export function autoPickBestEleven(team) {
  const formation = getFormationDefinition(team.formation ?? DEFAULT_FORMATION);
  const selectedIds = new Set();

  Object.entries(formation).forEach(([position, count]) => {
    team.players
      .filter((player) => player.position === position)
      .sort((left, right) => right.strength - left.strength)
      .slice(0, count)
      .forEach((player) => selectedIds.add(player.id));
  });

  if (selectedIds.size < 11) {
    team.players
      .filter((player) => !selectedIds.has(player.id))
      .sort((left, right) => right.strength - left.strength)
      .slice(0, 11 - selectedIds.size)
      .forEach((player) => selectedIds.add(player.id));
  }

  team.players.forEach((player) => {
    player.isStarter = selectedIds.has(player.id);
  });
}

export function calculateTeamStrength(team) {
  const starters = team.players.filter((player) => player.isStarter).slice(0, 11);
  const sourcePlayers = starters.length ? starters : [...team.players].sort((left, right) => right.strength - left.strength).slice(0, 11);
  const sum = sourcePlayers.reduce((total, player) => total + player.strength, 0);
  return sourcePlayers.length ? Math.round((sum / sourcePlayers.length) * 10) / 10 : 0;
}

export function normalizeImportedTeam(club, leagueId, teamIndex, isUserTeam = false) {
  const teamId = typeof club.id === "string" && club.id
    ? club.id
    : `${leagueId}-${slugify(club.name || `team-${teamIndex + 1}`)}`;
  const players = (club.players ?? []).map((player, playerIndex) => ({
    id: typeof player.id === "string" ? player.id : `${teamId}-player-${playerIndex + 1}`,
    name: player.name ?? `${player.firstName ?? "Spieler"} ${player.lastName ?? playerIndex + 1}`,
    number: Number.isFinite(player.number) ? player.number : playerIndex + 1,
    position: normalizePosition(player.position),
    age: Number.isFinite(player.age) ? player.age : 24,
    strength: Number.isFinite(player.strength) ? player.strength : 50,
    potential: Number.isFinite(player.potential) ? player.potential : player.strength ?? 50,
    fitness: Number.isFinite(player.fitness) ? player.fitness : 100,
    morale: Number.isFinite(player.morale) ? player.morale : 70,
    nationalities: Array.isArray(player.nationalities) ? player.nationalities : ["Deutschland"],
    fatigue: Number.isFinite(player.fatigue) ? player.fatigue : 0,
    salaryPerMatchDay: Number.isFinite(player.salaryPerMatchDay)
      ? player.salaryPerMatchDay
      : Math.max(250, Math.round((player.strength ?? 50) * 35)),
    isStarter: false
  }));

  const team = {
    id: teamId,
    name: club.name ?? `Team ${teamIndex + 1}`,
    leagueId,
    players,
    formation: isUserTeam ? DEFAULT_FORMATION : AWAY_DEFAULT_FORMATION,
    strength: 0,
    finances: {
      balance: isUserTeam ? 50000 : 500000,
      weeklyWages: players.reduce((total, player) => total + (player.salaryPerMatchDay ?? 0), 0)
    },
    season: {
      goalsFor: 0,
      goalsAgainst: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0
    }
  };

  if (isUserTeam) {
    team.trainingFacility = createUserTrainingFacility();
    team.youthAcademy = createUserYouthAcademy();
    team.stadium = createUserStadium();
  }

  autoPickBestEleven(team);
  team.strength = calculateTeamStrength(team);
  return team;
}

export function generateRoundRobinSchedule(leagueId, teamIds) {
  if (teamIds.length !== leagueSize) {
    throw new Error(`Liga ${leagueId} benötigt exakt ${leagueSize} Teams.`);
  }

  const rotation = [...teamIds];
  const firstLeg = [];
  const rounds = teamIds.length - 1;

  for (let round = 0; round < rounds; round += 1) {
    const matches = [];
    for (let index = 0; index < teamIds.length / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[rotation.length - 1 - index];
      const swap = (round + index) % 2 === 1;
      matches.push({
        homeTeamId: swap ? right : left,
        awayTeamId: swap ? left : right
      });
    }
    firstLeg.push(matches);
    rotation.splice(1, 0, rotation.pop());
  }

  return [
    ...firstLeg.flatMap((matches, roundIndex) => matches.map((match, matchIndex) => ({
      id: `${leagueId}-${roundIndex + 1}-${matchIndex + 1}`,
      leagueId,
      matchDay: roundIndex + 1,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeGoals: null,
      awayGoals: null,
      played: false,
      isUserMatch: false
    }))),
    ...firstLeg.flatMap((matches, roundIndex) => matches.map((match, matchIndex) => ({
      id: `${leagueId}-${roundIndex + 18}-${matchIndex + 1}`,
      leagueId,
      matchDay: roundIndex + 18,
      homeTeamId: match.awayTeamId,
      awayTeamId: match.homeTeamId,
      homeGoals: null,
      awayGoals: null,
      played: false,
      isUserMatch: false
    })))
  ];
}

export function initializeLeagueWorld(sourceData) {
  if (!Array.isArray(sourceData?.competitions) || sourceData.competitions.length < 3) {
    throw new Error("Liga-Datenquelle enthält nicht mindestens drei Wettbewerbe.");
  }

  const teams = [];
  const reserveTeams = [];
  const leagues = sourceData.competitions.slice(0, 3).map((competition, leagueIndex) => {
    const leagueId = leagueIds[leagueIndex];
    const clubs = competition.clubs ?? [];
    if (clubs.length < leagueSize) {
      throw new Error(`${competition.name ?? leagueId} enthält nur ${clubs.length} Vereine.`);
    }

    const usedClubs = clubs.slice(0, leagueSize);
    const selectedTeamCandidateId = leagueIndex === 2 ? (usedClubs[0].id ?? `${leagueId}-${slugify(usedClubs[0].name)}`) : null;
    usedClubs.forEach((club, clubIndex) => {
      teams.push(normalizeImportedTeam(club, leagueId, clubIndex, leagueIndex === 2 && clubIndex === 0));
    });

    clubs.slice(leagueSize).forEach((club, reserveIndex) => {
      reserveTeams.push(normalizeImportedTeam(club, leagueId, leagueSize + reserveIndex, false));
    });

    const teamIds = teams.filter((team) => team.leagueId === leagueId).map((team) => team.id);
    return {
      id: leagueId,
      name: competition.name ?? `${leagueIndex + 1}. Liga`,
      level: leagueIndex + 1,
      teamIds,
      matchDay: 1,
      totalMatchDays,
      schedule: generateRoundRobinSchedule(leagueId, teamIds),
      standings: teamIds.map(createStanding),
      selectedTeamCandidateId
    };
  });

  const selectedTeamId = leagues[2].selectedTeamCandidateId;
  leagues.forEach((league) => {
    league.schedule.forEach((match) => {
      match.isUserMatch = match.homeTeamId === selectedTeamId || match.awayTeamId === selectedTeamId;
    });
    delete league.selectedTeamCandidateId;
  });

  return {
    selectedTeamId,
    season: {
      year: seasonStartYear,
      currentMatchDay: 1,
      isFinished: false
    },
    leagues,
    teams,
    database: {
      reserveTeams
    }
  };
}

export function getUserTeam(state) {
  return state.teams?.find((team) => team.id === state.selectedTeamId) ?? state.team;
}

export function getTeamById(state, teamId) {
  return state.teams?.find((team) => team.id === teamId) ?? null;
}

export function getLeagueById(state, leagueId) {
  return state.leagues?.find((league) => league.id === leagueId) ?? null;
}

export function getUserLeague(state) {
  const userTeam = getUserTeam(state);
  return userTeam ? getLeagueById(state, userTeam.leagueId) : null;
}

export function getUserStanding(state) {
  const league = getUserLeague(state);
  return league?.standings.find((standing) => standing.teamId === state.selectedTeamId) ?? null;
}

export function getStandingPosition(state, teamId = state.selectedTeamId) {
  const team = getTeamById(state, teamId);
  const league = team ? getLeagueById(state, team.leagueId) : null;
  const index = league?.standings.findIndex((standing) => standing.teamId === teamId) ?? -1;
  return index >= 0 ? index + 1 : null;
}

export function getNextUserMatch(state) {
  const league = getUserLeague(state);
  if (!league) {
    return null;
  }

  const matchDay = state.season?.currentMatchDay ?? league.matchDay;
  return league.schedule.find((match) => (
    match.matchDay === matchDay
    && !match.played
    && (match.homeTeamId === state.selectedTeamId || match.awayTeamId === state.selectedTeamId)
  )) ?? null;
}

export function getMatchTeams(state, match) {
  return {
    homeTeam: getTeamById(state, match?.homeTeamId),
    awayTeam: getTeamById(state, match?.awayTeamId)
  };
}

export function recalculateStandings(league, teams) {
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const standingsByTeam = new Map(league.teamIds.map((teamId) => [teamId, createStanding(teamId)]));

  league.schedule.filter((match) => match.played).forEach((match) => {
    const home = standingsByTeam.get(match.homeTeamId);
    const away = standingsByTeam.get(match.awayTeamId);
    if (!home || !away) {
      return;
    }

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeGoals;
    home.goalsAgainst += match.awayGoals;
    away.goalsFor += match.awayGoals;
    away.goalsAgainst += match.homeGoals;

    if (match.homeGoals > match.awayGoals) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (match.homeGoals < match.awayGoals) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  standingsByTeam.forEach((standing) => {
    standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    const team = teamMap.get(standing.teamId);
    if (team) {
      team.season = {
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        wins: standing.wins,
        draws: standing.draws,
        losses: standing.losses,
        points: standing.points
      };
    }
  });

  league.standings = [...standingsByTeam.values()].sort((left, right) => {
    const leftTeamName = teamMap.get(left.teamId)?.name ?? left.teamId;
    const rightTeamName = teamMap.get(right.teamId)?.name ?? right.teamId;
    return right.points - left.points
      || right.goalDifference - left.goalDifference
      || right.goalsFor - left.goalsFor
      || right.wins - left.wins
      || leftTeamName.localeCompare(rightTeamName, "de");
  });
}

function expectedGoals(homeTeam, awayTeam) {
  const strengthDiff = (homeTeam.strength ?? calculateTeamStrength(homeTeam)) - (awayTeam.strength ?? calculateTeamStrength(awayTeam));
  return {
    home: clamp(1.25 + strengthDiff * 0.035 + 0.22, 0.25, 3.2),
    away: clamp(1.05 - strengthDiff * 0.03, 0.2, 2.9)
  };
}

function sampleGoals(expected) {
  const roll = Math.random();
  const adjusted = expected + (Math.random() - 0.5) * 0.45;
  if (roll < Math.max(0.16, 0.42 - adjusted * 0.1)) return 0;
  if (roll < Math.max(0.42, 0.68 - adjusted * 0.05)) return 1;
  if (roll < Math.max(0.72, 0.88 - adjusted * 0.03)) return 2;
  if (roll < 0.96) return 3;
  return Math.random() < 0.75 ? 4 : 5;
}

export function simulateBackgroundMatch(homeTeam, awayTeam) {
  const goals = expectedGoals(homeTeam, awayTeam);
  return {
    homeGoals: sampleGoals(goals.home),
    awayGoals: sampleGoals(goals.away)
  };
}

export function finishUserMatch(state, result) {
  const league = getUserLeague(state);
  const match = league?.schedule.find((fixture) => fixture.id === result.matchId);
  if (!match || match.played) {
    return false;
  }

  match.homeGoals = result.homeGoals;
  match.awayGoals = result.awayGoals;
  match.played = true;
  recalculateStandings(league, state.teams);
  return true;
}

export function completeMatchDay(state) {
  const currentMatchDay = state.season?.currentMatchDay ?? 1;
  const completedSeasonYear = state.season?.year ?? 2026;
  state.teams.forEach((team) => {
    team.strength = calculateTeamStrength(team);
  });

  state.leagues.forEach((league) => {
    league.schedule
      .filter((match) => match.matchDay === currentMatchDay && !match.played)
      .forEach((match) => {
        const { homeTeam, awayTeam } = getMatchTeams(state, match);
        const result = simulateBackgroundMatch(homeTeam, awayTeam);
        match.homeGoals = result.homeGoals;
        match.awayGoals = result.awayGoals;
        match.played = true;
    });
    recalculateStandings(league, state.teams);
  });

  const completedLeagues = state.leagues.map((league) => ({
    id: league.id,
    name: league.name,
    level: league.level,
    teamIds: [...league.teamIds],
    matchDay: currentMatchDay,
    totalMatchDays: league.totalMatchDays,
    schedule: league.schedule.map((match) => ({ ...match })),
    standings: league.standings.map((standing) => ({ ...standing }))
  }));
  const completedMatchDay = {
    seasonYear: completedSeasonYear,
    matchDay: currentMatchDay,
    leagues: completedLeagues
  };

  if (currentMatchDay >= totalMatchDays) {
    advanceSeason(state);
    return completedMatchDay;
  }

  state.season.currentMatchDay += 1;
  state.currentDay = state.season.currentMatchDay;
  state.leagues.forEach((league) => {
    league.matchDay = state.season.currentMatchDay;
  });
  return completedMatchDay;
}

function resetLeagueForNewSeason(league, teams) {
  league.teamIds = teams
    .filter((team) => team.leagueId === league.id)
    .sort((left, right) => right.strength - left.strength || left.name.localeCompare(right.name, "de"))
    .slice(0, leagueSize)
    .map((team) => team.id);
  league.matchDay = 1;
  league.schedule = generateRoundRobinSchedule(league.id, league.teamIds);
  league.standings = league.teamIds.map(createStanding);
}

export function advanceSeason(state) {
  const liga1 = getLeagueById(state, "liga1");
  const liga2 = getLeagueById(state, "liga2");
  const liga3 = getLeagueById(state, "liga3");

  const promoteToLiga1 = liga2.standings.slice(0, 2).map((standing) => standing.teamId);
  const demoteToLiga2 = liga1.standings.slice(-2).map((standing) => standing.teamId);
  const promoteToLiga2 = liga3.standings.slice(0, 2).map((standing) => standing.teamId);
  const demoteToLiga3 = liga2.standings.slice(-2).map((standing) => standing.teamId);

  state.teams.forEach((team) => {
    if (promoteToLiga1.includes(team.id)) team.leagueId = "liga1";
    if (demoteToLiga2.includes(team.id)) team.leagueId = "liga2";
    if (promoteToLiga2.includes(team.id)) team.leagueId = "liga2";
    if (demoteToLiga3.includes(team.id)) team.leagueId = "liga3";
    team.season = {
      goalsFor: 0,
      goalsAgainst: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0
    };
    team.strength = calculateTeamStrength(team);
  });

  state.season.year += 1;
  state.season.currentMatchDay = 1;
  state.season.isFinished = false;
  state.currentDay = 1;
  state.leagues.forEach((league) => resetLeagueForNewSeason(league, state.teams));
  state.leagues.forEach((league) => {
    league.schedule.forEach((match) => {
      match.isUserMatch = match.homeTeamId === state.selectedTeamId || match.awayTeamId === state.selectedTeamId;
    });
  });
}
