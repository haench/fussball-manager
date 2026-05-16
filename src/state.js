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

const fallbackAges = [21, 24, 19, 26, 30, 22, 25, 20, 23, 28, 27, 33, 18, 29, 21, 31, 20, 24, 19];
const maxTrainingFacilityLevel = 100;
const trainingUpgradeCostPerLevel = 5000;
const stadiumStandIds = ["north", "south", "east", "west"];
const ticketPriceLevels = ["low", "medium", "high"];
const standUpgradeCapacity = 100;
const standUpgradeCost = 30000;
const standUpgradeDurationDays = 5;

const basePlayers = [
  { id: "p1", name: "Tom Becker", strength: 16, isStarter: true, position: "goalkeeper" },
  { id: "p2", name: "Luca Weber", strength: 14, isStarter: true, position: "defender" },
  { id: "p3", name: "Mika Hartmann", strength: 11, isStarter: true, position: "defender" },
  { id: "p4", name: "Noah Schubert", strength: 13, isStarter: true, position: "defender" },
  { id: "p5", name: "Emil Krüger", strength: 12, isStarter: true, position: "defender" },
  { id: "p6", name: "Finn Schulz", strength: 17, isStarter: true, position: "midfielder" },
  { id: "p7", name: "Jonas Franke", strength: 15, isStarter: true, position: "midfielder" },
  { id: "p8", name: "Ben Seidel", strength: 10, isStarter: true, position: "midfielder" },
  { id: "p9", name: "Leo Kramer", strength: 19, isStarter: true, position: "striker" },
  { id: "p10", name: "Nico Vogel", strength: 14, isStarter: true, position: "midfielder" },
  { id: "p11", name: "Paul Dietrich", strength: 15, isStarter: true, position: "striker" },
  { id: "p12", name: "Timo Lorenz", strength: 18, isStarter: false, position: "goalkeeper" },
  { id: "p13", name: "Jan Huber", strength: 17, isStarter: false, position: "defender" },
  { id: "p14", name: "Oskar Braun", strength: 19, isStarter: false, position: "defender" },
  { id: "p15", name: "Anton Keller", strength: 11, isStarter: false, position: "midfielder" },
  { id: "p16", name: "Mats Ritter", strength: 19, isStarter: false, position: "midfielder" },
  { id: "p17", name: "Luis Sommer", strength: 12, isStarter: false, position: "striker" },
  { id: "p18", name: "Erik Brandt", strength: 10, isStarter: false, position: "striker" },
  { id: "p19", name: "Kilian Wolf", strength: 18, isStarter: false, position: "striker" }
];

function isValidPosition(position) {
  return positionOrder.includes(position);
}

function getFallbackPosition(index) {
  return fallbackPositions[index] ?? "midfielder";
}

function getFallbackAge(index) {
  return fallbackAges[index] ?? 24;
}

function createInitialTrainingFacility() {
  return {
    level: 20,
    upgradeInProgress: null
  };
}

function createInitialStadium() {
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

function normalizeTrainingFacility(trainingFacility) {
  const level = Number.isFinite(trainingFacility?.level)
    ? Math.max(0, Math.min(maxTrainingFacilityLevel, Math.round(trainingFacility.level)))
    : 20;
  const upgrade = trainingFacility?.upgradeInProgress;

  return {
    level,
    upgradeInProgress: upgrade
      && Number.isFinite(upgrade.targetLevel)
      && Number.isFinite(upgrade.daysRemaining)
      && Number.isFinite(upgrade.totalDays)
      ? {
        targetLevel: Math.max(level, Math.min(maxTrainingFacilityLevel, Math.round(upgrade.targetLevel))),
        cost: Number.isFinite(upgrade.cost) ? upgrade.cost : 0,
        daysRemaining: Math.max(0, Math.round(upgrade.daysRemaining)),
        totalDays: Math.max(1, Math.round(upgrade.totalDays))
      }
      : null
  };
}

function normalizeStand(stand, fallbackCapacity) {
  const capacity = Number.isFinite(stand?.capacity)
    ? Math.max(0, Math.round(stand.capacity))
    : fallbackCapacity;
  const upgrade = stand?.upgradeInProgress;

  return {
    capacity,
    upgradeInProgress: upgrade
      && Number.isFinite(upgrade.addCapacity)
      && Number.isFinite(upgrade.cost)
      && Number.isFinite(upgrade.daysRemaining)
      && Number.isFinite(upgrade.totalDays)
      ? {
        addCapacity: Math.max(1, Math.round(upgrade.addCapacity)),
        targetCapacity: Number.isFinite(upgrade.targetCapacity)
          ? Math.max(capacity, Math.round(upgrade.targetCapacity))
          : capacity + Math.max(1, Math.round(upgrade.addCapacity)),
        cost: Math.max(0, Math.round(upgrade.cost)),
        daysRemaining: Math.max(0, Math.round(upgrade.daysRemaining)),
        totalDays: Math.max(1, Math.round(upgrade.totalDays))
      }
      : null
  };
}

function normalizeLastMatchRevenue(lastMatchRevenue) {
  if (!lastMatchRevenue || typeof lastMatchRevenue !== "object") {
    return null;
  }

  return {
    attendance: Number.isFinite(lastMatchRevenue.attendance) ? Math.max(0, Math.round(lastMatchRevenue.attendance)) : 0,
    revenue: Number.isFinite(lastMatchRevenue.revenue) ? Math.max(0, Math.round(lastMatchRevenue.revenue)) : 0,
    capacity: Number.isFinite(lastMatchRevenue.capacity) ? Math.max(0, Math.round(lastMatchRevenue.capacity)) : 0,
    ticketPrice: Number.isFinite(lastMatchRevenue.ticketPrice) ? Math.max(0, Math.round(lastMatchRevenue.ticketPrice)) : 0,
    ticketPriceLevel: ticketPriceLevels.includes(lastMatchRevenue.ticketPriceLevel) ? lastMatchRevenue.ticketPriceLevel : "medium"
  };
}

function normalizeStadium(stadium) {
  const fallbackStadium = createInitialStadium();
  return {
    ticketPriceLevel: ticketPriceLevels.includes(stadium?.ticketPriceLevel) ? stadium.ticketPriceLevel : "medium",
    stands: stadiumStandIds.reduce((stands, standId) => {
      stands[standId] = normalizeStand(stadium?.stands?.[standId], fallbackStadium.stands[standId].capacity);
      return stands;
    }, {}),
    lastMatchRevenue: normalizeLastMatchRevenue(stadium?.lastMatchRevenue)
  };
}

function normalizePlayer(player, fallbackPlayer, index) {
  return {
    id: typeof player?.id === "string" ? player.id : fallbackPlayer.id,
    name: typeof player?.name === "string" ? player.name : fallbackPlayer.name,
    strength: Number.isFinite(player?.strength) ? player.strength : fallbackPlayer.strength,
    age: Number.isFinite(player?.age) ? player.age : fallbackPlayer.age ?? getFallbackAge(index),
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
    trainingFacility: normalizeTrainingFacility(team?.trainingFacility),
    stadium: normalizeStadium(team?.stadium),
    players
  };
}

function createInitialTeam() {
  return normalizeTeam({
    id: "felix-fc",
    name: "Felix FC",
    formation: DEFAULT_FORMATION,
    trainingFacility: createInitialTrainingFacility(),
    stadium: createInitialStadium(),
    players: structuredClone(basePlayers)
  });
}

function createInitialState(screen = "start") {
  return {
    currentDay: 1,
    money: 50000,
    clubName: "Felix FC",
    managerName: "Felix",
    currentScreen: screen,
    matchHistory: [],
    trainingMessages: [],
    trainingStatusMessage: "",
    trainingUpgradeTargetLevel: null,
    stadiumStatusMessage: "",
    stadiumUpgradeTargets: {},
    rosterMessage: "",
    team: createInitialTeam(),
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
    trainingMessages: Array.isArray(savedGame.trainingMessages) ? savedGame.trainingMessages : [],
    trainingStatusMessage: "",
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

export const trainingUpgradeConfig = {
  costPerLevel: trainingUpgradeCostPerLevel,
  maxLevel: maxTrainingFacilityLevel
};

function getMinimumTrainingUpgradeTarget(currentLevel) {
  return Math.min(maxTrainingFacilityLevel, currentLevel + 1);
}

export function getTrainingUpgradeCost(currentLevel, targetLevel) {
  return Math.max(0, targetLevel - currentLevel) * trainingUpgradeCostPerLevel;
}

export function getTrainingUpgradeDuration(currentLevel, targetLevel) {
  return Math.max(0, targetLevel - currentLevel);
}

export function getTrainingUpgradeTargetLevel(state = gameState) {
  const currentLevel = state.team.trainingFacility.level;
  const minimumTarget = getMinimumTrainingUpgradeTarget(currentLevel);

  if (currentLevel >= maxTrainingFacilityLevel) {
    return maxTrainingFacilityLevel;
  }

  if (!Number.isFinite(state.trainingUpgradeTargetLevel)) {
    state.trainingUpgradeTargetLevel = minimumTarget;
  }

  state.trainingUpgradeTargetLevel = Math.max(
    minimumTarget,
    Math.min(maxTrainingFacilityLevel, Math.round(state.trainingUpgradeTargetLevel))
  );
  return state.trainingUpgradeTargetLevel;
}

export function changeTrainingUpgradeTarget(delta) {
  const currentLevel = gameState.team.trainingFacility.level;

  if (currentLevel >= maxTrainingFacilityLevel || gameState.team.trainingFacility.upgradeInProgress) {
    return false;
  }

  const currentTarget = getTrainingUpgradeTargetLevel(gameState);
  gameState.trainingUpgradeTargetLevel = Math.max(
    getMinimumTrainingUpgradeTarget(currentLevel),
    Math.min(maxTrainingFacilityLevel, currentTarget + delta)
  );
  notify();
  return true;
}

export function getDevelopmentChance(player) {
  if (player.age <= 22) {
    return 0.25;
  }
  if (player.age <= 28) {
    return 0.12;
  }
  if (player.age <= 32) {
    return 0.05;
  }
  return 0.01;
}

export function developPlayersAfterMatch(state = gameState) {
  const facilityLevel = state.team.trainingFacility.level;
  const messages = [];

  state.team.players.forEach((player) => {
    if (player.strength >= facilityLevel || Math.random() >= getDevelopmentChance(player)) {
      return;
    }

    const previousStrength = player.strength;
    player.strength = Math.min(facilityLevel, player.strength + 1);
    messages.push(`${player.name} ist stärker geworden: ${previousStrength} → ${player.strength}`);
  });

  return messages;
}

export function progressTrainingFacilityUpgrade(state = gameState) {
  const facility = state.team.trainingFacility;

  if (!facility.upgradeInProgress) {
    return [];
  }

  facility.upgradeInProgress.daysRemaining -= 1;

  if (facility.upgradeInProgress.daysRemaining > 0) {
    return [];
  }

  const targetLevel = facility.upgradeInProgress.targetLevel;
  facility.level = targetLevel;
  facility.upgradeInProgress = null;
  return [`Trainingsanlage ausgebaut: Level ${targetLevel}`];
}

export function processTrainingAfterMatch(state = gameState) {
  const trainingMessages = [
    ...progressTrainingFacilityUpgrade(state),
    ...developPlayersAfterMatch(state)
  ];
  state.trainingMessages = trainingMessages;
  state.trainingStatusMessage = trainingMessages.length
    ? trainingMessages.join(" ")
    : "Keine Spielerentwicklung an diesem Spieltag.";
}

export function startTrainingFacilityUpgrade() {
  const facility = gameState.team.trainingFacility;

  if (facility.upgradeInProgress || facility.level >= maxTrainingFacilityLevel) {
    return false;
  }

  const targetLevel = getTrainingUpgradeTargetLevel(gameState);
  const cost = getTrainingUpgradeCost(facility.level, targetLevel);
  const durationDays = getTrainingUpgradeDuration(facility.level, targetLevel);

  if (durationDays <= 0) {
    return false;
  }

  if (gameState.money < cost) {
    gameState.trainingStatusMessage = "Nicht genug Geld für den Ausbau.";
    notify();
    return false;
  }

  gameState.money -= cost;
  facility.upgradeInProgress = {
    targetLevel,
    cost,
    daysRemaining: durationDays,
    totalDays: durationDays
  };
  gameState.trainingUpgradeTargetLevel = null;
  gameState.trainingStatusMessage = `Ausbau gestartet: Level ${targetLevel} in ${durationDays} Spieltagen.`;
  saveGame(gameState);
  notify();
  return true;
}

export const stadiumConfig = {
  standIds: stadiumStandIds,
  standLabels: {
    north: "Nord",
    south: "Süd",
    east: "Ost",
    west: "West"
  },
  ticketPrices: {
    low: 4,
    medium: 6,
    high: 8
  },
  ticketPriceFactors: {
    low: 1.1,
    medium: 1,
    high: 0.85
  },
  ticketPriceLabels: {
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch"
  },
  upgrade: {
    addCapacity: standUpgradeCapacity,
    cost: standUpgradeCost,
    durationDays: standUpgradeDurationDays
  }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getStadiumCapacity(team = gameState.team) {
  return stadiumStandIds.reduce((capacity, standId) => capacity + team.stadium.stands[standId].capacity, 0);
}

export function getTicketPrice(stadium = gameState.team.stadium) {
  return stadiumConfig.ticketPrices[stadium.ticketPriceLevel] ?? stadiumConfig.ticketPrices.medium;
}

export function getTicketPriceFactor(stadium = gameState.team.stadium) {
  return stadiumConfig.ticketPriceFactors[stadium.ticketPriceLevel] ?? stadiumConfig.ticketPriceFactors.medium;
}

export function getFormFactor(matchHistory = gameState.matchHistory) {
  const formDelta = (matchHistory ?? []).slice(0, 5).reduce((total, entry) => {
    if (entry.result === "S") {
      return total + 0.1;
    }
    if (entry.result === "N") {
      return total - 0.1;
    }
    return total;
  }, 0);

  return clamp(1 + formDelta, 0.5, 1.5);
}

export function calculateAttendanceAndRevenue(team = gameState.team, matchHistory = gameState.matchHistory) {
  const capacity = getStadiumCapacity(team);
  const ticketPrice = getTicketPrice(team.stadium);
  const ticketPriceFactor = getTicketPriceFactor(team.stadium);
  const formFactor = getFormFactor(matchHistory);
  const baseDemand = capacity * 0.75;
  const attendance = clamp(Math.round(baseDemand * formFactor * ticketPriceFactor), 0, capacity);

  return {
    attendance,
    revenue: attendance * ticketPrice,
    capacity,
    ticketPrice,
    ticketPriceLevel: team.stadium.ticketPriceLevel,
    formFactor,
    ticketPriceFactor
  };
}

export function setTicketPriceLevel(level) {
  if (!ticketPriceLevels.includes(level)) {
    return false;
  }

  gameState.team.stadium.ticketPriceLevel = level;
  gameState.stadiumStatusMessage = "";
  saveGame(gameState);
  notify();
  return true;
}

function getMinimumStandUpgradeTarget(currentCapacity) {
  return currentCapacity + standUpgradeCapacity;
}

function normalizeStandTarget(currentCapacity, targetCapacity) {
  const minimumTarget = getMinimumStandUpgradeTarget(currentCapacity);
  const roundedTarget = Math.ceil(targetCapacity / standUpgradeCapacity) * standUpgradeCapacity;
  return Math.max(minimumTarget, roundedTarget);
}

export function getStandUpgradeCost(currentCapacity, targetCapacity) {
  const steps = Math.max(0, Math.ceil((targetCapacity - currentCapacity) / standUpgradeCapacity));
  return steps * standUpgradeCost;
}

export function getStandUpgradeDuration(currentCapacity, targetCapacity) {
  const steps = Math.max(0, Math.ceil((targetCapacity - currentCapacity) / standUpgradeCapacity));
  return steps * standUpgradeDurationDays;
}

export function getStandUpgradeTarget(standId, state = gameState) {
  const stand = state.team.stadium.stands[standId];

  if (!stand) {
    return 0;
  }

  if (stand.upgradeInProgress) {
    return stand.upgradeInProgress.targetCapacity ?? stand.capacity + stand.upgradeInProgress.addCapacity;
  }

  state.stadiumUpgradeTargets ??= {};

  if (!Number.isFinite(state.stadiumUpgradeTargets[standId])) {
    state.stadiumUpgradeTargets[standId] = getMinimumStandUpgradeTarget(stand.capacity);
  }

  state.stadiumUpgradeTargets[standId] = normalizeStandTarget(stand.capacity, state.stadiumUpgradeTargets[standId]);
  return state.stadiumUpgradeTargets[standId];
}

export function changeStandUpgradeTarget(standId, delta) {
  const stand = gameState.team.stadium.stands[standId];

  if (!stand || stand.upgradeInProgress) {
    return false;
  }

  gameState.stadiumUpgradeTargets ??= {};
  gameState.stadiumUpgradeTargets[standId] = normalizeStandTarget(
    stand.capacity,
    getStandUpgradeTarget(standId) + delta
  );
  notify();
  return true;
}

export function startStandUpgrade(standId) {
  const stand = gameState.team.stadium.stands[standId];

  if (!stand || stand.upgradeInProgress) {
    return false;
  }

  const targetCapacity = getStandUpgradeTarget(standId);
  const addCapacity = targetCapacity - stand.capacity;
  const cost = getStandUpgradeCost(stand.capacity, targetCapacity);
  const durationDays = getStandUpgradeDuration(stand.capacity, targetCapacity);

  if (addCapacity <= 0 || durationDays <= 0) {
    return false;
  }

  if (gameState.money < cost) {
    gameState.stadiumStatusMessage = "Nicht genug Geld für den Stadionausbau.";
    notify();
    return false;
  }

  gameState.money -= cost;
  stand.upgradeInProgress = {
    targetCapacity,
    addCapacity,
    cost,
    daysRemaining: durationDays,
    totalDays: durationDays
  };
  delete gameState.stadiumUpgradeTargets[standId];
  gameState.stadiumStatusMessage = `${stadiumConfig.standLabels[standId]}-Tribüne wird ausgebaut.`;
  saveGame(gameState);
  notify();
  return true;
}

export function progressStadiumUpgrades(state = gameState) {
  const messages = [];

  stadiumStandIds.forEach((standId) => {
    const stand = state.team.stadium.stands[standId];
    if (!stand.upgradeInProgress) {
      return;
    }

    stand.upgradeInProgress.daysRemaining -= 1;

    if (stand.upgradeInProgress.daysRemaining > 0) {
      return;
    }

    const addCapacity = stand.upgradeInProgress.addCapacity;
    const targetCapacity = stand.upgradeInProgress.targetCapacity ?? stand.capacity + addCapacity;
    stand.capacity = targetCapacity;
    stand.upgradeInProgress = null;
    messages.push(`${stadiumConfig.standLabels[standId]}-Tribüne ausgebaut: +${addCapacity} Plätze`);
  });

  state.stadiumStatusMessage = messages.join(" ");
  return messages;
}

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
