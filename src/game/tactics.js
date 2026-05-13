export const tacticOptions = {
  playStyle: [
    { value: 'defensiv', label: 'Defensiv' },
    { value: 'ausgeglichen', label: 'Ausgeglichen' },
    { value: 'offensiv', label: 'Offensiv' },
  ],
  tempo: [
    { value: 'ruhig', label: 'Ruhig' },
    { value: 'normal', label: 'Normal' },
    { value: 'schnell', label: 'Schnell' },
  ],
  pressing: [
    { value: 'niedrig', label: 'Niedrig' },
    { value: 'normal', label: 'Normal' },
    { value: 'hoch', label: 'Hoch' },
  ],
  risk: [
    { value: 'sicher', label: 'Sicher' },
    { value: 'normal', label: 'Normal' },
    { value: 'mutig', label: 'Mutig' },
  ],
};

export const defaultTactics = {
  playStyle: 'ausgeglichen',
  tempo: 'normal',
  pressing: 'normal',
  risk: 'normal',
};

const tacticEffects = {
  playStyle: {
    defensiv: { attack: -2.5, defense: 4.5, label: 'defensiver Spielweise' },
    ausgeglichen: { attack: 1.5, defense: 1.5, label: 'ausgeglichener Spielweise' },
    offensiv: { attack: 5, defense: -2, label: 'offensiver Spielweise' },
  },
  tempo: {
    ruhig: { attack: -0.5, defense: 1.5, label: 'ruhigem Tempo' },
    normal: { attack: 1, defense: 0.5, label: 'normalem Tempo' },
    schnell: { attack: 3, defense: -1, label: 'schnellem Tempo' },
  },
  pressing: {
    niedrig: { attack: -0.5, defense: 1.5, label: 'niedrigem Pressing' },
    normal: { attack: 1, defense: 1, label: 'normalem Pressing' },
    hoch: { attack: 2.5, defense: -0.5, label: 'hohem Pressing' },
  },
  risk: {
    sicher: { attack: -1, defense: 2, label: 'sicherem Risiko' },
    normal: { attack: 1, defense: 1, label: 'normalem Risiko' },
    mutig: { attack: 3, defense: -1.5, label: 'mutigem Risiko' },
  },
};

export function normalizeTactics(tactics = defaultTactics) {
  if (typeof tactics === 'string') {
    return {
      ...defaultTactics,
      playStyle: tactics === 'kontrolliert' ? 'ausgeglichen' : tactics,
    };
  }

  return Object.fromEntries(
    Object.entries(defaultTactics).map(([key, fallback]) => {
      const allowedValues = tacticOptions[key].map((option) => option.value);
      return [key, allowedValues.includes(tactics[key]) ? tactics[key] : fallback];
    }),
  );
}

export function calculateTacticEffect(tactics = defaultTactics) {
  const normalized = normalizeTactics(tactics);
  const parts = Object.entries(normalized).map(([key, value]) => tacticEffects[key][value]);

  return {
    ...normalized,
    attack: parts.reduce((sum, part) => sum + part.attack, 0),
    defense: parts.reduce((sum, part) => sum + part.defense, 0),
    label: parts.map((part) => part.label).join(', '),
  };
}
