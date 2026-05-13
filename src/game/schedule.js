const SEASON_MATCHDAYS = 34;

function rotateTeams([fixedTeam, ...rotatingTeams]) {
  return [fixedTeam, rotatingTeams.at(-1), ...rotatingTeams.slice(0, -1)];
}

function createRoundPairings(teams) {
  const pairings = [];
  const roundsPerCycle = teams.length - 1;
  let rotatingTeams = [...teams];

  for (let round = 0; round < roundsPerCycle; round += 1) {
    const matches = [];

    for (let index = 0; index < teams.length / 2; index += 1) {
      const firstTeam = rotatingTeams[index];
      const secondTeam = rotatingTeams[rotatingTeams.length - 1 - index];
      const shouldSwapHomeTeam = (round + index) % 2 === 1;

      matches.push({
        homeTeamId: shouldSwapHomeTeam ? secondTeam.id : firstTeam.id,
        awayTeamId: shouldSwapHomeTeam ? firstTeam.id : secondTeam.id,
      });
    }

    pairings.push(matches);
    rotatingTeams = rotateTeams(rotatingTeams);
  }

  return pairings;
}

export function createSeasonSchedule(teams, matchdayCount = SEASON_MATCHDAYS) {
  if (teams.length < 2 || teams.length % 2 !== 0) {
    throw new Error('Der Spielplan benötigt eine gerade Anzahl von mindestens zwei Teams.');
  }

  const firstLeg = createRoundPairings(teams);
  const secondLeg = firstLeg.map((matches) =>
    matches.map((match) => ({ homeTeamId: match.awayTeamId, awayTeamId: match.homeTeamId })),
  );
  const cycle = [...firstLeg, ...secondLeg];

  return Array.from({ length: matchdayCount }, (_, index) => {
    const cycleMatches = cycle[index % cycle.length];
    const cycleNumber = Math.floor(index / cycle.length);

    return {
      matchday: index + 1,
      matches: cycleMatches.map((match, matchIndex) => ({
        id: `md-${index + 1}-m-${matchIndex + 1}`,
        matchday: index + 1,
        cycle: cycleNumber + 1,
        ...match,
      })),
    };
  });
}

export function getMatchday(schedule, matchday) {
  return schedule.find((entry) => entry.matchday === matchday) ?? null;
}

export function getNextUserFixture(state) {
  const matchday = getMatchday(state.schedule, state.currentMatchday);

  return matchday?.matches.find(
    (match) => match.homeTeamId === state.selectedClub.id || match.awayTeamId === state.selectedClub.id,
  ) ?? null;
}
