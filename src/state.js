import { loadGame, saveGame } from "./storage.js";

const basePlayers = [
  { id: "p1", name: "Tom Becker", strength: 36, isStarter: true },
  { id: "p2", name: "Luca Weber", strength: 34, isStarter: true },
  { id: "p3", name: "Mika Hartmann", strength: 31, isStarter: true },
  { id: "p4", name: "Noah Schubert", strength: 33, isStarter: true },
  { id: "p5", name: "Emil Kruger", strength: 32, isStarter: true },
  { id: "p6", name: "Finn Schulz", strength: 37, isStarter: true },
  { id: "p7", name: "Jonas Franke", strength: 35, isStarter: true },
  { id: "p8", name: "Ben Seidel", strength: 30, isStarter: true },
  { id: "p9", name: "Leo Kramer", strength: 39, isStarter: true },
  { id: "p10", name: "Nico Vogel", strength: 34, isStarter: true },
  { id: "p11", name: "Paul Dietrich", strength: 35, isStarter: true },
  { id: "p12", name: "Timo Lorenz", strength: 28, isStarter: false },
  { id: "p13", name: "Jan Huber", strength: 27, isStarter: false },
  { id: "p14", name: "Oskar Braun", strength: 29, isStarter: false }
];

function createInitialState(screen = "start") {
  return {
    currentDay: 1,
    money: 50000,
    clubName: "Felix FC",
    managerName: "Felix",
    currentScreen: screen,
    matchHistory: [],
    team: {
      id: "felix-fc",
      name: "Felix FC",
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
    match: null
  });
  saveGame(gameState);
  notify();
}

export function saveCurrentGame() {
  saveGame(gameState);
}

export function setScreen(screen) {
  gameState.currentScreen = screen;
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
