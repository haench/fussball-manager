import { getPlayersByTeamId } from '../data/players.js';
import { calculateLineupBonus, getLineupPlayers } from './lineup.js';
import { calculateTacticEffect } from './tactics.js';

const HOME_ADVANTAGE = 4;

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

function pickWeighted(players, random) {
  const weightedPlayers = players.map((player) => ({
    player,
    weight: Math.max(1, player.shooting * (player.position === 'ST' ? 2.1 : player.position === 'Flügel' ? 1.5 : 1)),
  }));
  const totalWeight = weightedPlayers.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = random() * totalWeight;

  return weightedPlayers.find((entry) => {
    cursor -= entry.weight;
    return cursor <= 0;
  })?.player ?? weightedPlayers.at(-1).player;
}

function average(values) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function getSelectedPlayers(team, lineup) {
  const squad = getPlayersByTeamId(team.id);
  if (!lineup) return squad;

  const selectedPlayers = getLineupPlayers(squad, lineup).map(({ player }) => player).filter(Boolean);
  return selectedPlayers.length > 0 ? selectedPlayers : squad;
}

export function calculateTeamProfile(team, form = 0, tactics = undefined, lineup = null) {
  const squad = getPlayersByTeamId(team.id);
  const players = getSelectedPlayers(team, lineup);
  const tacticEffect = calculateTacticEffect(tactics);
  const lineupBonus = lineup ? calculateLineupBonus(squad, lineup) : 0;
  const attackPlayers = players.filter((player) => ['OM', 'Flügel', 'ST', 'ZM'].includes(player.position));
  const defensePlayers = players.filter((player) => ['TW', 'IV', 'AV', 'DM', 'ZM'].includes(player.position));

  return {
    team,
    players,
    tacticLabel: tacticEffect.label,
    strength: Math.round(average(players.map((player) => player.strength)) + form + lineupBonus),
    attack: average(attackPlayers.map((player) => (player.shooting + player.pace + player.passing) / 3)) + form + tacticEffect.attack + lineupBonus,
    defense: average(defensePlayers.map((player) => (player.defending + player.strength + player.goalkeeping) / 3)) + form + tacticEffect.defense + lineupBonus,
  };
}

function calculateGoals(chanceRating, random) {
  let goals = 0;
  const baseChance = Math.max(0.08, Math.min(0.58, chanceRating / 130));

  for (let chance = 0; chance < 6; chance += 1) {
    const fatigueModifier = chance > 3 ? 0.82 : 1;
    if (random() < baseChance * fatigueModifier) {
      goals += 1;
    }
  }

  return Math.min(goals, 6);
}

function createScorers(teamProfile, goals, random) {
  return Array.from({ length: goals }, () => pickWeighted(teamProfile.players, random).name);
}

function createTickerEvents({ homeTeam, awayTeam, homeGoals, awayGoals, homeScorers, awayScorers, random }) {
  const goalEvents = [
    ...homeScorers.map((scorer, index) => ({ team: homeTeam.name, scorer, type: 'goal', side: 'home', index })),
    ...awayScorers.map((scorer, index) => ({ team: awayTeam.name, scorer, type: 'goal', side: 'away', index })),
  ].map((event) => ({ ...event, minute: 8 + Math.floor(random() * 78) }))
    .sort((a, b) => a.minute - b.minute);

  let runningHomeGoals = 0;
  let runningAwayGoals = 0;
  const scoredEvents = goalEvents.map((event) => {
    if (event.side === 'home') {
      runningHomeGoals += 1;
    } else {
      runningAwayGoals += 1;
    }

    return {
      minute: event.minute,
      text: `Tor für ${event.team}! ${event.scorer} trifft zum ${runningHomeGoals}:${runningAwayGoals}.`,
    };
  });

  const events = [
    { minute: 1, text: `Anpfiff: ${homeTeam.name} empfängt ${awayTeam.name}.` },
    { minute: 18 + Math.floor(random() * 18), text: `${homeTeam.name} sucht mit Tempo den Weg in den Strafraum.` },
    { minute: 46, text: `Weiter geht's nach der Pause, beide Trainer justieren nach.` },
    { minute: 62 + Math.floor(random() * 16), text: `${awayTeam.name} antwortet mit einem kompakten Pressing.` },
    ...scoredEvents,
    { minute: 90, text: `Abpfiff: ${homeTeam.name} ${homeGoals}:${awayGoals} ${awayTeam.name}.` },
  ];

  return events.sort((a, b) => a.minute - b.minute || a.text.localeCompare(b.text));
}

export function simulateMatch({ match, teamsById, formByTeamId = {}, tacticsByTeamId = {}, lineupByTeamId = {} }) {
  const homeTeam = teamsById[match.homeTeamId];
  const awayTeam = teamsById[match.awayTeamId];
  const random = seededRandom(hashString(`${match.id}-${homeTeam.id}-${awayTeam.id}`));
  const homeProfile = calculateTeamProfile(homeTeam, formByTeamId[homeTeam.id] ?? 0, tacticsByTeamId[homeTeam.id], lineupByTeamId[homeTeam.id]);
  const awayProfile = calculateTeamProfile(awayTeam, formByTeamId[awayTeam.id] ?? 0, tacticsByTeamId[awayTeam.id], lineupByTeamId[awayTeam.id]);
  const homeChanceRating = homeProfile.attack + HOME_ADVANTAGE - awayProfile.defense / 2;
  const awayChanceRating = awayProfile.attack - homeProfile.defense / 2;
  const homeGoals = calculateGoals(homeChanceRating, random);
  const awayGoals = calculateGoals(awayChanceRating, random);
  const homeScorers = createScorers(homeProfile, homeGoals, random);
  const awayScorers = createScorers(awayProfile, awayGoals, random);

  return {
    ...match,
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    homeGoals,
    awayGoals,
    scorers: [
      ...homeScorers.map((name) => ({ teamId: homeTeam.id, team: homeTeam.name, name })),
      ...awayScorers.map((name) => ({ teamId: awayTeam.id, team: awayTeam.name, name })),
    ],
    tickerEvents: createTickerEvents({ homeTeam, awayTeam, homeGoals, awayGoals, homeScorers, awayScorers, random }),
    summary: `${homeTeam.name} spielte mit ${homeProfile.tacticLabel}, ${awayTeam.name} mit ${awayProfile.tacticLabel}.`,
    completed: true,
  };
}

export function simulateMatchday({ matchday, teamsById, formByTeamId = {}, tacticsByTeamId = {}, lineupByTeamId = {} }) {
  return matchday.matches.map((match) => simulateMatch({ match, teamsById, formByTeamId, tacticsByTeamId, lineupByTeamId }));
}
