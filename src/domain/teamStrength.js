export function getStarterPlayers(team) {
  const players = Array.isArray(team?.players) ? team.players : [];
  const starters = players.filter((player) => player.isStarter).slice(0, 11);

  if (starters.length) {
    return starters;
  }

  return [...players]
    .sort((left, right) => (right.strength ?? 0) - (left.strength ?? 0))
    .slice(0, 11);
}

export function calculateTeamStrength(team) {
  const sourcePlayers = getStarterPlayers(team);
  const sum = sourcePlayers.reduce((total, player) => total + (player.strength ?? 0), 0);
  return sourcePlayers.length ? Math.round((sum / sourcePlayers.length) * 10) / 10 : 0;
}
