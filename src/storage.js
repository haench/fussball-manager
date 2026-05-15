const STORAGE_KEY = "fussball-manager.save.v1";
const SAVE_VERSION = 1;
const VALID_POSITIONS = new Set(["goalkeeper", "defender", "midfielder", "striker"]);
const VALID_FORMATIONS = new Set(["4-4-2", "4-3-3", "3-5-2"]);

function canUseLocalStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPlayer(value) {
  return isPlainObject(value)
    && typeof value.id === "string"
    && typeof value.name === "string"
    && Number.isFinite(value.strength)
    && typeof value.isStarter === "boolean"
    && (typeof value.position === "undefined" || VALID_POSITIONS.has(value.position));
}

function isMatchHistoryEntry(value) {
  return isPlainObject(value)
    && ["S", "N", "U"].includes(value.result)
    && Number.isFinite(value.day)
    && Number.isFinite(value.homeGoals)
    && Number.isFinite(value.awayGoals)
    && typeof value.opponentName === "string";
}

function normalizeSaveData(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  if (value.version !== SAVE_VERSION) {
    return null;
  }

  const { currentDay, money, clubName, managerName, team, opponent } = value;
  const matchHistory = Array.isArray(value.matchHistory) ? value.matchHistory : [];

  if (!Number.isFinite(currentDay)
    || !Number.isFinite(money)
    || typeof clubName !== "string"
    || typeof managerName !== "string"
    || !isPlainObject(team)
    || typeof team.id !== "string"
    || typeof team.name !== "string"
    || (typeof team.formation !== "undefined" && !VALID_FORMATIONS.has(team.formation))
    || !Array.isArray(team.players)
    || !team.players.every(isPlayer)
    || !isPlainObject(opponent)
    || typeof opponent.name !== "string"
    || !Number.isFinite(opponent.averageStrength)
    || !matchHistory.every(isMatchHistoryEntry)) {
    return null;
  }

  return {
    currentDay,
    money,
    clubName,
    managerName,
    matchHistory: clone(matchHistory).slice(0, 5),
    team: clone(team),
    opponent: clone(opponent)
  };
}

export function createSaveData(state) {
  return {
    version: SAVE_VERSION,
    currentDay: state.currentDay,
    money: state.money,
    clubName: state.clubName,
    managerName: state.managerName,
    matchHistory: clone(state.matchHistory ?? []).slice(0, 5),
    team: clone(state.team),
    opponent: clone(state.opponent)
  };
}

export function saveGame(state) {
  if (!canUseLocalStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createSaveData(state)));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const rawSave = window.localStorage.getItem(STORAGE_KEY);
    if (!rawSave) {
      return null;
    }

    return normalizeSaveData(JSON.parse(rawSave));
  } catch {
    return null;
  }
}
