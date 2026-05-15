const defaultMatchConfig = {
  matchDurationMinutes: 90,
  matchDurationMs: 30000,
  simulationStepMs: 15,
  baseGoalChancePerMinute: 0.018,
  minGoalChancePerMinute: 0.004,
  maxGoalChancePerMinute: 0.05,
  strengthFactor: 0.0005,
  tickerLimit: 2
};

export const uiTheme = {
  colors: {
    navy: "#06224a",
    navySoft: "#10396f",
    blue: "#1f84ff",
    sky: "#77d1ff",
    green: "#8cd71f",
    greenDark: "#347b0d",
    gold: "#ffc83d",
    red: "#ea2f32",
    silver: "#b9c8d8",
    panelBorder: "rgba(255, 255, 255, 0.16)",
    text: "#f6fbff",
    muted: "#b9d0eb"
  },
  radii: {
    panel: "28px",
    button: "24px",
    marker: "999px"
  },
  shadows: {
    panel: "0 18px 40px rgba(3, 13, 31, 0.35)",
    button: "0 16px 24px rgba(3, 13, 31, 0.38)",
    marker: "0 8px 18px rgba(0, 0, 0, 0.35)"
  },
  buttonHeight: "88px",
  resultColors: {
    win: "#8cd71f",
    draw: "#c8d6e7",
    loss: "#ea2f32"
  }
};

export const uiCopy = {
  clubTagline: "Baue deinen Verein Schritt für Schritt zum Spitzenclub auf.",
  inactiveTiles: ["Kader", "Training", "Jugend", "Stadion"],
  tacticButtons: ["Aggressiv", "Normal", "Defensiv"]
};

function readNumberParam(searchParams, key, fallback) {
  const rawValue = searchParams.get(key);
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function createMatchConfig() {
  if (typeof window === "undefined") {
    return { ...defaultMatchConfig };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const legacyDurationSeconds = readNumberParam(searchParams, "matchDuration", defaultMatchConfig.matchDurationMs / 1000);
  const matchDurationMs = readNumberParam(searchParams, "matchDurationMs", legacyDurationSeconds * 1000);

  return {
    ...defaultMatchConfig,
    matchDurationMs,
    simulationStepMs: readNumberParam(searchParams, "tickMs", defaultMatchConfig.simulationStepMs)
  };
}

export const matchConfig = createMatchConfig();
