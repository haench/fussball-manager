export const DEFAULT_FORMATION = "4-4-2";
export const AWAY_DEFAULT_FORMATION = "4-3-3";

export const formationDefinitions = {
  "4-4-2": {
    goalkeeper: 1,
    defender: 4,
    midfielder: 4,
    striker: 2
  },
  "4-3-3": {
    goalkeeper: 1,
    defender: 4,
    midfielder: 3,
    striker: 3
  },
  "3-5-2": {
    goalkeeper: 1,
    defender: 3,
    midfielder: 5,
    striker: 2
  }
};

export const formationIds = Object.keys(formationDefinitions);

export function isValidFormation(formation) {
  return formationIds.includes(formation);
}

export function getFormationDefinition(formation) {
  return formationDefinitions[formation] ?? formationDefinitions[DEFAULT_FORMATION];
}
