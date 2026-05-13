import { gameState, initialGameState } from './state.js';

export const SAVE_VERSION = 1;
export const SAVE_STORAGE_KEY = 'fussball-manager:save';

function getLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function createStateWithDefaults(savedState) {
  const defaults = structuredClone(initialGameState);

  return {
    ...defaults,
    ...savedState,
    transferFilters: {
      ...defaults.transferFilters,
      ...(savedState.transferFilters ?? {}),
    },
    clubUpgrades: {
      ...defaults.clubUpgrades,
      ...(savedState.clubUpgrades ?? {}),
    },
    cup: {
      ...defaults.cup,
      ...(savedState.cup ?? {}),
    },
    youthState: {
      ...defaults.youthState,
      ...(savedState.youthState ?? {}),
    },
    achievements: {
      ...defaults.achievements,
      ...(savedState.achievements ?? {}),
    },
  };
}

export function createSavePayload(state = gameState) {
  return {
    saveVersion: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    gameState: structuredClone(state),
  };
}

export function saveGameState(state = gameState) {
  const storage = getLocalStorage();

  if (!storage || !state.selectedClub) {
    return false;
  }

  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(createSavePayload(state)));
  return true;
}

export function loadSavedGameState() {
  const storage = getLocalStorage();
  const rawSave = storage?.getItem(SAVE_STORAGE_KEY);

  if (!rawSave) {
    return null;
  }

  try {
    const save = JSON.parse(rawSave);

    if (save?.saveVersion !== SAVE_VERSION || !save?.gameState) {
      return null;
    }

    Object.assign(gameState, createStateWithDefaults(save.gameState));
    return gameState;
  } catch {
    return null;
  }
}

export function hasSavedGame() {
  return Boolean(getLocalStorage()?.getItem(SAVE_STORAGE_KEY));
}

export function deleteSavedGame() {
  const storage = getLocalStorage();

  if (!storage) {
    return false;
  }

  storage.removeItem(SAVE_STORAGE_KEY);
  return true;
}
