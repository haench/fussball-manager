export const clubUpgradeDefinitions = {
  stadium: {
    label: 'Stadionkapazität',
    description: 'Mehr Plätze erhöhen die Einnahmen an Heimspieltagen.',
    baseCost: 1_800_000,
    maxLevel: 5,
    effectLabel: (level) => `+${level * 2_500} Plätze · bis zu ${((level * 0.22) * 100).toFixed(0)} % mehr Heim-Einnahmen`,
  },
  fanshop: {
    label: 'Fanshop',
    description: 'Merchandising bringt jede Woche zusätzliche Einnahmen.',
    baseCost: 1_250_000,
    maxLevel: 5,
    effectLabel: (level) => `${(level * 150_000).toLocaleString('de-DE')} € pro Woche`,
  },
  youthAcademy: {
    label: 'Jugendakademie',
    description: 'Bessere Scouts und Trainer erhöhen die Chance auf Top-Talente.',
    baseCost: 1_500_000,
    maxLevel: 5,
    effectLabel: (level) => `+${level * 7} % Talentchance`,
  },
  trainingGround: {
    label: 'Trainingsplatz',
    description: 'Moderne Plätze beschleunigen die Entwicklung deiner Spieler.',
    baseCost: 1_600_000,
    maxLevel: 5,
    effectLabel: (level) => `+${level * 10} % Entwicklungsbonus`,
  },
  medicalDepartment: {
    label: 'Medizinische Abteilung',
    description: 'Bessere Betreuung senkt Fitnessverluste und Verletzungsrisiko.',
    baseCost: 1_400_000,
    maxLevel: 5,
    effectLabel: (level) => `${level * 8} % weniger Belastung`,
  },
};

export function createInitialClubUpgrades() {
  return Object.fromEntries(Object.keys(clubUpgradeDefinitions).map((key) => [key, 0]));
}

export function getUpgradeCost(upgradeKey, level = 0) {
  const definition = clubUpgradeDefinitions[upgradeKey];
  if (!definition) return 0;
  return Math.round(definition.baseCost * (1 + level * 0.65));
}

export function buyClubUpgrade(state, upgradeKey) {
  const definition = clubUpgradeDefinitions[upgradeKey];
  if (!definition) return { accepted: false, message: 'Diese Verbesserung gibt es nicht.' };

  const currentLevel = state.clubUpgrades?.[upgradeKey] ?? 0;
  if (currentLevel >= definition.maxLevel) {
    return { accepted: false, message: `${definition.label} ist bereits maximal ausgebaut.` };
  }

  const cost = getUpgradeCost(upgradeKey, currentLevel);
  if (state.transferBudget < cost) {
    return { accepted: false, message: `Für ${definition.label} fehlen ${cost.toLocaleString('de-DE')} €.` };
  }

  state.transferBudget -= cost;
  state.budget = state.transferBudget;
  state.clubUpgrades = { ...createInitialClubUpgrades(), ...state.clubUpgrades, [upgradeKey]: currentLevel + 1 };

  return {
    accepted: true,
    message: `${definition.label} auf Stufe ${currentLevel + 1} ausgebaut: ${definition.effectLabel(currentLevel + 1)}.`,
  };
}

export function calculateWeeklyUpgradeIncome(state, userMatch = null) {
  const upgrades = { ...createInitialClubUpgrades(), ...state.clubUpgrades };
  const fanshopIncome = upgrades.fanshop * 150_000;
  const isHomeMatch = userMatch?.homeTeamId === state.selectedClub?.id;
  const stadiumIncome = isHomeMatch ? 550_000 + upgrades.stadium * 220_000 : 0;

  return {
    fanshopIncome,
    stadiumIncome,
    total: fanshopIncome + stadiumIncome,
  };
}

export function getTrainingGroundDevelopmentBonus(state) {
  return 1 + ((state.clubUpgrades?.trainingGround ?? 0) * 0.1);
}

export function getMedicalFatigueReduction(state) {
  return Math.min(0.4, (state.clubUpgrades?.medicalDepartment ?? 0) * 0.08);
}
