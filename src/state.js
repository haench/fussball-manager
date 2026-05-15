import { loadGame, saveGame } from "./storage.js";
import { DEFAULT_FORMATION, formationDefinitions, getFormationDefinition, isValidFormation } from "./formations.js";

export const positionOrder = ["goalkeeper", "defender", "midfielder", "striker"];

export const positionShortLabels = {
  goalkeeper: "TW",
  defender: "VT",
  midfielder: "MF",
  striker: "ST"
};

export const positionLabels = {
  goalkeeper: "Torwart",
  defender: "Verteidigung",
  midfielder: "Mittelfeld",
  striker: "Sturm"
};

const fallbackPositions = [
  "goalkeeper",
  "defender",
  "defender",
  "defender",
  "defender",
  "midfielder",
  "midfielder",
  "midfielder",
  "striker",
  "midfielder",
  "striker",
  "goalkeeper",
  "defender",
  "defender",
  "midfielder",
  "midfielder",
  "striker",
  "striker",
  "striker"
];

const basePlayers = [
  { id: "p1", name: "Tom Becker", strength: 36, isStarter: true, position: "goalkeeper" },
  { id: "p2", name: "Luca Weber", strength: 34, isStarter: true, position: "defender" },
  { id: "p3", name: "Mika Hartmann", strength: 31, isStarter: true, position: "defender" },
  { id: "p4", name: "Noah Schubert", strength: 33, isStarter: true, position: "defender" },
  { id: "p5", name: "Emil Krüger", strength: 32, isStarter: true, position: "defender" },
  { id: "p6", name: "Finn Schulz", strength: 37, isStarter: true, position: "midfielder" },
  { id: "p7", name: "Jonas Franke", strength: 35, isStarter: true, position: "midfielder" },
  { id: "p8", name: "Ben Seidel", strength: 30, isStarter: true, position: "midfielder" },
  { id: "p9", name: "Leo Kramer", strength: 39, isStarter: true, position: "striker" },
  { id: "p10", name: "Nico Vogel", strength: 34, isStarter: true, position: "midfielder" },
  { id: "p11", name: "Paul Dietrich", strength: 35, isStarter: true, position: "striker" },
  { id: "p12", name: "Timo Lorenz", strength: 28, isStarter: false, position: "goalkeeper" },
  { id: "p13", name: "Jan Huber", strength: 27, isStarter: false, position: "defender" },
  { id: "p14", name: "Oskar Braun", strength: 29, isStarter: false, position: "defender" },
  { id: "p15", name: "Anton Keller", strength: 31, isStarter: false, position: "midfielder" },
  { id: "p16", name: "Mats Ritter", strength: 29, isStarter: false, position: "midfielder" },
  { id: "p17", name: "Luis Sommer", strength: 32, isStarter: false, position: "striker" },
  { id: "p18", name: "Erik Brandt", strength: 30, isStarter: false, position: "striker" },
  { id: "p19", name: "Kilian Wolf", strength: 28, isStarter: false, position: "striker" }
];

function isValidPosition(position) {
  return positionOrder.includes(position);
}

function getFallbackPosition(index) {
  return fallbackPositions[index] ?? "midfielder";
}

function normalizePlayer(player, fallbackPlayer, index) {
  return {
    id: typeof player?.id === "string" ? player.id : fallbackPlayer.id,
    name: typeof player?.name === "string" ? player.name : fallbackPlayer.name,
    strength: Number.isFinite(player?.strength) ? player.strength : fallbackPlayer.strength,
    isStarter: typeof player?.isStarter === "boolean" ? player.isStarter : fallbackPlayer.isStarter,
    position: isValidPosition(player?.position)
      ? player.position
      : fallbackPlayer.position ?? getFallbackPosition(index)
  };
}

export function normalizeTeam(team) {
  const savedPlayers = Array.isArray(team?.players) ? team.players : [];
  const savedPlayersById = new Map(savedPlayers.map((player) => [player.id, player]));
  const players = basePlayers.map((fallbackPlayer, index) => {
    return normalizePlayer(savedPlayersById.get(fallbackPlayer.id), fallbackPlayer, index);
  });

  savedPlayers.forEach((player, index) => {
    if (players.some((knownPlayer) => knownPlayer.id === player.id)) {
      return;
    }

    players.push(normalizePlayer(player, {
      id: player.id,
      name: player.name,
      strength: player.strength,
      isStarter: false,
      position: getFallbackPosition(index)
    }, index));
  });

  return {
    id: typeof team?.id === "string" ? team.id : "felix-fc",
    name: typeof team?.name === "string" ? team.name : "Felix FC",
    formation: isValidFormation(team?.formation) ? team.formation : DEFAULT_FORMATION,
    players
  };
}

function createInitialState(screen = "start") {
  return {
    currentDay: 1,
    money: 50000,
    clubName: "Felix FC",
    managerName: "Felix",
    currentScreen: screen,
    matchHistory: [],
    rosterMessage: "",
    team: {
      id: "felix-fc",
      name: "Felix FC",
      formation: DEFAULT_FORMATION,
      players: structuredClone(basePlayers)
    },
    opponent: {
      name: "SV Neustadt",
      averageStrength: 32
    },
    match: null
  };
}

export const gameState = createInitialState();

const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener(gameState));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setState(updater) {
  if (typeof updater === "function") {
    updater(gameState);
  } else {
    Object.assign(gameState, updater);
  }
  notify();
}

export function createNewGame() {
  Object.assign(gameState, createInitialState("club"));
  saveGame(gameState);
  notify();
}

export function continueGame() {
  const savedGame = loadGame();

  if (!savedGame) {
    createNewGame();
    return;
  }

  Object.assign(gameState, createInitialState("club"), savedGame, {
    currentScreen: "club",
    team: normalizeTeam(savedGame.team),
    match: null
  });
  saveGame(gameState);
  notify();
}

export function saveCurrentGame() {
  saveGame(gameState);
}

export function getStarterCount(team = gameState.team) {
  return team.players.filter((player) => player.isStarter).length;
}

export function isLineupValid(team = gameState.team) {
  if (getStarterCount(team) !== 11) {
    return false;
  }

  const counts = getLineupPositionCounts(team);
  const formation = getFormationDefinition(team.formation);
  return Object.entries(formation).every(([position, playerCount]) => counts[position] === playerCount);
}

export function getLineupPositionCounts(team = gameState.team) {
  return positionOrder.reduce((counts, position) => {
    counts[position] = team.players.filter((player) => player.isStarter && player.position === position).length;
    return counts;
  }, {});
}

export function isLineupPositionallyBalanced(team = gameState.team) {
  return isLineupValid(team);
}

export function getLineupPositionWarning(team = gameState.team) {
  return isLineupPositionallyBalanced(team)
    ? ""
    : `Die Startelf passt nicht zur gewählten Besetzung ${team.formation}.`;
}

export function sortPlayersByPosition(players) {
  return [...players].sort((leftPlayer, rightPlayer) => {
    const positionDiff = positionOrder.indexOf(leftPlayer.position) - positionOrder.indexOf(rightPlayer.position);

    if (positionDiff !== 0) {
      return positionDiff;
    }

    if (rightPlayer.strength !== leftPlayer.strength) {
      return rightPlayer.strength - leftPlayer.strength;
    }

    return leftPlayer.name.localeCompare(rightPlayer.name, "de");
  });
}

export function setPlayerStarter(playerId, isStarter) {
  const player = gameState.team.players.find((teamPlayer) => teamPlayer.id === playerId);

  if (!player) {
    return false;
  }

  if (isStarter && !player.isStarter && getStarterCount() >= 11) {
    gameState.rosterMessage = "Erst einen Startspieler auf die Bank setzen.";
    notify();
    return false;
  }

  player.isStarter = isStarter;
  const starterCount = getStarterCount();
  gameState.rosterMessage = isLineupValid()
    ? ""
    : starterCount !== 11
      ? `Es müssen genau 11 Spieler in der Startelf sein. Aktuell: ${starterCount}/11.`
      : getLineupPositionWarning();
  saveGame(gameState);
  notify();
  return true;
}

function applyBestElevenForFormation(team) {
  const formation = getFormationDefinition(team.formation);
  const bestPlayerIds = new Set();

  Object.entries(formation).forEach(([position, playerCount]) => {
    team.players
      .filter((player) => player.position === position)
      .sort((leftPlayer, rightPlayer) => rightPlayer.strength - leftPlayer.strength)
      .slice(0, playerCount)
      .forEach((player) => bestPlayerIds.add(player.id));
  });

  if (bestPlayerIds.size < 11) {
    team.players
      .filter((player) => !bestPlayerIds.has(player.id))
      .sort((leftPlayer, rightPlayer) => rightPlayer.strength - leftPlayer.strength)
      .slice(0, 11 - bestPlayerIds.size)
      .forEach((player) => bestPlayerIds.add(player.id));
  }

  team.players.forEach((player) => {
    player.isStarter = bestPlayerIds.has(player.id);
  });
}

export function autoPickBestEleven() {
  applyBestElevenForFormation(gameState.team);
  gameState.rosterMessage = "";
  saveGame(gameState);
  notify();
}

export function setFormation(formation) {
  if (!isValidFormation(formation)) {
    return false;
  }

  gameState.team.formation = formation;
  applyBestElevenForFormation(gameState.team);
  gameState.rosterMessage = "";
  saveGame(gameState);
  notify();
  return true;
}

export { formationDefinitions };

export function setScreen(screen) {
  gameState.currentScreen = screen;
  gameState.rosterMessage = "";
  notify();
}

export function setMatch(match) {
  gameState.match = match;
  notify();
}

export function updateMatch(updater) {
  if (!gameState.match) {
    return;
  }
  updater(gameState.match);
  notify();
}

export function incrementDay() {
  gameState.currentDay += 1;
  notify();
}

export function resetGame() {
  const initialState = createInitialState();
  Object.assign(gameState, initialState);
  notify();
}
