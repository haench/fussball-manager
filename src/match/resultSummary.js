export function getResultSummary(match) {
  const userGoals = match.isUserHome === false ? match.awayGoals : match.homeGoals;
  const opponentGoals = match.isUserHome === false ? match.homeGoals : match.awayGoals;
  if (userGoals > opponentGoals) {
    return { label: "Sieg", headline: "Sieg!", tone: "win" };
  }
  if (userGoals < opponentGoals) {
    return { label: "Niederlage", headline: "Niederlage", tone: "loss" };
  }
  return { label: "Unentschieden", headline: "Unentschieden", tone: "draw" };
}
