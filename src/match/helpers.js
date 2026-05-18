import { AWAY_DEFAULT_FORMATION, DEFAULT_FORMATION, getFormationDefinition, isValidFormation } from "../formations.js";
export const goalSplashDurationMs = 1800;
export const goalSequenceDurationMs = 2600;
export const resetDurationMs = 1500;
export const pitchBounds = {
  minX: 0.06,
  maxX: 0.94,
  minY: 0.04,
  maxY: 0.96
};
export const lanes = {
  left: 0.24,
  center: 0.5,
  right: 0.76
};
export const homeFormations = {
  "4-4-2": [
    { x: 0.5, y: 0.92 },
    { x: 0.2, y: 0.79 },
    { x: 0.4, y: 0.78 },
    { x: 0.6, y: 0.78 },
    { x: 0.8, y: 0.79 },
    { x: 0.18, y: 0.58 },
    { x: 0.39, y: 0.56 },
    { x: 0.61, y: 0.56 },
    { x: 0.82, y: 0.58 },
    { x: 0.38, y: 0.34 },
    { x: 0.62, y: 0.34 }
  ],
  "4-3-3": [
    { x: 0.5, y: 0.92 },
    { x: 0.2, y: 0.79 },
    { x: 0.4, y: 0.78 },
    { x: 0.6, y: 0.78 },
    { x: 0.8, y: 0.79 },
    { x: 0.28, y: 0.6 },
    { x: 0.5, y: 0.56 },
    { x: 0.72, y: 0.6 },
    { x: 0.2, y: 0.38 },
    { x: 0.5, y: 0.33 },
    { x: 0.8, y: 0.38 }
  ],
  "3-5-2": [
    { x: 0.5, y: 0.92 },
    { x: 0.28, y: 0.78 },
    { x: 0.5, y: 0.77 },
    { x: 0.72, y: 0.78 },
    { x: 0.14, y: 0.58 },
    { x: 0.32, y: 0.56 },
    { x: 0.5, y: 0.54 },
    { x: 0.68, y: 0.56 },
    { x: 0.86, y: 0.58 },
    { x: 0.38, y: 0.34 },
    { x: 0.62, y: 0.34 }
  ]
};
export const breakoutPatterns = [
  { x: 0, y: 0, lane: 0 },
  { x: -0.24, y: 0.05, lane: 0.2 },
  { x: 0.12, y: -0.03, lane: -0.1 },
  { x: -0.06, y: 0.1, lane: 0.06 },
  { x: 0.22, y: -0.07, lane: -0.18 },
  { x: -0.28, y: 0.12, lane: 0.32 },
  { x: 0.08, y: -0.16, lane: -0.16 },
  { x: 0.3, y: 0.08, lane: -0.28 },
  { x: -0.2, y: -0.1, lane: 0.26 },
  { x: 0.03, y: 0.15, lane: 0 },
  { x: 0.24, y: -0.02, lane: -0.24 }
];
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function lerp(current, target, amount) {
  return current + (target - current) * amount;
}

export function weightedPick(options) {
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) {
      return option.value;
    }
  }

  return options[options.length - 1].value;
}

export function normalizeFormation(formation) {
  return isValidFormation(formation) ? formation : DEFAULT_FORMATION;
}

export function createRoleList(formation) {
  const definition = getFormationDefinition(formation);
  return [
    ...Array.from({ length: definition.goalkeeper }, () => "goalkeeper"),
    ...Array.from({ length: definition.defender }, () => "defender"),
    ...Array.from({ length: definition.midfielder }, () => "midfielder"),
    ...Array.from({ length: definition.striker }, () => "forward")
  ];
}

export function getBaseFormationPositions(teamSide, formation) {
  const formationId = normalizeFormation(formation);
  const positions = homeFormations[formationId] ?? homeFormations[DEFAULT_FORMATION];

  if (teamSide === "home") {
    return positions;
  }

  return positions.map((position) => ({
    x: position.x,
    y: 1 - position.y
  }));
}

export function getPlayerRole(players, index) {
  return players[index]?.role ?? "midfielder";
}

export function getPreferredCarrierIndex(players, phase) {
  const preferredRole = ["pressure", "centralAttack", "wideAttack", "counter"].includes(phase.type)
    ? "forward"
    : "midfielder";
  const matchingPlayers = players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.role === preferredRole);

  if (matchingPlayers.length) {
    return matchingPlayers[Math.floor(matchingPlayers.length / 2)].index;
  }

  const fallback = players.findIndex((player) => player.role === "midfielder");
  return fallback >= 0 ? fallback : 0;
}

export function createPlayers(teamSide, formationId) {
  const formation = normalizeFormation(formationId);
  const positions = getBaseFormationPositions(teamSide, formation);
  const playerRoles = createRoleList(formation);

  return positions.map((position, index) => ({
    id: `${teamSide}-${index}`,
    team: teamSide,
    role: playerRoles[index],
    lineIndex: index,
    formation,
    x: position.x,
    y: position.y,
    targetX: position.x,
    targetY: position.y,
    offsetX: randomBetween(-0.026, 0.026),
    offsetY: randomBetween(-0.022, 0.022),
    pace: randomBetween(0.86, 1.14)
  }));
}

export function toPosition(player) {
  return { x: player.x, y: player.y };
}

export function getAttackingDirection(teamSide) {
  return teamSide === "home" ? -1 : 1;
}

export function getOwnGoalZone(teamSide) {
  return teamSide === "home"
    ? { x: 0.5, y: 0.92, minY: 0.84, maxY: 0.98 }
    : { x: 0.5, y: 0.08, minY: 0.02, maxY: 0.16 };
}

export function getOpponentPenaltyArea(teamSide) {
  return teamSide === "home"
    ? { minX: 0.31, maxX: 0.69, minY: 0.03, maxY: 0.18, centerX: 0.5, centerY: 0.12 }
    : { minX: 0.31, maxX: 0.69, minY: 0.82, maxY: 0.97, centerX: 0.5, centerY: 0.88 };
}

export function getDefensivePenaltyArea(teamSide) {
  return teamSide === "home" ? getOpponentPenaltyArea("away") : getOpponentPenaltyArea("home");
}

export function tacticSettings(tactic) {
  return {
    aggressive: {
      blockShift: 0.06,
      support: 1.24,
      width: 1.12,
      compactness: 0.88,
      phaseSpeed: 1.08
    },
    normal: {
      blockShift: 0,
      support: 1,
      width: 1,
      compactness: 1,
      phaseSpeed: 1
    },
    defensive: {
      blockShift: -0.07,
      support: 0.72,
      width: 0.86,
      compactness: 1.18,
      phaseSpeed: 0.92
    }
  }[tactic] ?? tacticSettings("normal");
}

export function getTacticGoalModifiers(tactic) {
  return {
    aggressive: {
      ownAttackModifier: 1.35,
      opponentAttackModifier: 1.25
    },
    normal: {
      ownAttackModifier: 1,
      opponentAttackModifier: 1
    },
    defensive: {
      ownAttackModifier: 0.75,
      opponentAttackModifier: 0.65
    }
  }[tactic] ?? getTacticGoalModifiers("normal");
}

export function getFormationPositions(teamSide, tactic = "normal", formation = DEFAULT_FORMATION) {
  const positions = getBaseFormationPositions(teamSide, formation);
  const playerRoles = createRoleList(formation);
  const direction = getAttackingDirection(teamSide);
  const settings = tacticSettings(tactic);

  return positions.map((position, index) => {
    if (playerRoles[index] === "goalkeeper") {
      return position;
    }

    return {
      x: position.x,
      y: clamp(position.y + direction * settings.blockShift, pitchBounds.minY, pitchBounds.maxY)
    };
  });
}

export function createNextPhase(previousTeam = "home", tactic = "normal", elapsedMinutes = 0) {
  const settings = tacticSettings(tactic);
  const attackingTeam = Math.random() < 0.58
    ? previousTeam
    : previousTeam === "home" ? "away" : "home";
  const phaseType = weightedPick([
    { value: "shape", weight: tactic === "defensive" ? 3.2 : 2.1 },
    { value: "buildUp", weight: 3 },
    { value: "wideAttack", weight: tactic === "aggressive" ? 2.6 : 1.8 },
    { value: "centralAttack", weight: tactic === "defensive" ? 1.1 : 2 },
    { value: "pressure", weight: tactic === "aggressive" ? 1.7 : 0.8 },
    { value: "counter", weight: elapsedMinutes > 10 ? 1.6 : 0.9 }
  ]);

  return {
    type: phaseType,
    attackingTeam,
    lane: weightedPick([
      { value: "left", weight: phaseType === "wideAttack" ? 2.2 : 1 },
      { value: "center", weight: phaseType === "centralAttack" ? 2.4 : 1.3 },
      { value: "right", weight: phaseType === "wideAttack" ? 2.2 : 1 }
    ]),
    stepsRemaining: Math.round(randomBetween(8, 18) / settings.phaseSpeed)
  };
}

export function mirrorTeam(teamSide) {
  return teamSide === "home" ? "away" : "home";
}

export function attackY(teamSide, depth) {
  const direction = getAttackingDirection(teamSide);
  return teamSide === "home" ? 0.92 - depth : 0.08 + depth * Math.abs(direction);
}

export function roleAdvance(role, phaseType, settings) {
  const base = {
    goalkeeper: 0,
    defender: 0.14,
    midfielder: 0.3,
    forward: 0.5
  }[role];
  const phaseBoost = {
    shape: 0,
    buildUp: 0.08,
    wideAttack: 0.18,
    centralAttack: 0.24,
    pressure: 0.38,
    counter: 0.34,
    reset: 0
  }[phaseType] ?? 0;

  return (base + phaseBoost * settings.support);
}

export function lanePullX(baseX, laneX, role, phaseType) {
  if (phaseType === "shape" || phaseType === "reset") {
    return baseX;
  }

  const pull = {
    goalkeeper: 0.04,
    defender: phaseType === "counter" ? 0.12 : 0.18,
    midfielder: 0.34,
    forward: phaseType === "pressure" ? 0.48 : 0.38
  }[role];

  return lerp(baseX, laneX, pull);
}

export function applyWidth(baseX, phaseType, settings) {
  const width = {
    shape: 1,
    buildUp: 0.95,
    wideAttack: 1.32,
    centralAttack: 0.62,
    pressure: 0.78,
    counter: 1.08,
    reset: 1
  }[phaseType] * settings.width;

  return 0.5 + (baseX - 0.5) * width;
}

export function getPhaseFreedom(phaseType, isAttacking) {
  const freedom = {
    shape: 0.02,
    buildUp: 0.07,
    wideAttack: 0.12,
    centralAttack: 0.15,
    pressure: 0.2,
    counter: 0.16,
    reset: 0
  }[phaseType] ?? 0.06;

  return isAttacking ? freedom : freedom * 0.72;
}

export function createBrokenTarget(target, index, role, phaseType, isAttacking, teamSide, laneX, settings) {
  if (role === "goalkeeper") {
    return target;
  }

  const pattern = breakoutPatterns[index] ?? breakoutPatterns[0];
  const freedom = getPhaseFreedom(phaseType, isAttacking);
  const supportFactor = isAttacking ? settings.support : 1 / settings.compactness;
  const laneDirection = laneX < 0.42 ? -1 : laneX > 0.58 ? 1 : 0;
  const yMirror = teamSide === "home" ? 1 : -1;
  const clusterPull = ["centralAttack", "pressure"].includes(phaseType)
    ? lerp(target.x, laneX, isAttacking ? 0.28 : 0.16) - target.x
    : 0;

  return {
    x: clamp(
      target.x + clusterPull + (pattern.x + pattern.lane * laneDirection) * freedom * supportFactor,
      pitchBounds.minX,
      pitchBounds.maxX
    ),
    y: clamp(
      target.y + pattern.y * freedom * supportFactor * yMirror,
      pitchBounds.minY,
      pitchBounds.maxY
    )
  };
}

export function getAttackingTargets(teamSide, phase, tactic, players) {
  const settings = tacticSettings(tactic);
  const formation = getFormationPositions(teamSide, tactic, players[0]?.formation);
  const laneX = lanes[phase.lane] ?? lanes.center;

  if (phase.type === "pressure") {
    return getPressureTargets(teamSide, true, laneX, settings, players);
  }

  if (phase.type === "counter") {
    return getCounterTargets(teamSide, true, laneX, settings, players);
  }

  return formation.map((base, index) => {
    const role = getPlayerRole(players, index);
    if (role === "goalkeeper") {
      return getGoalkeeperTarget(teamSide, laneX);
    }

    const depth = roleAdvance(role, phase.type, settings);
    const targetX = lanePullX(applyWidth(base.x, phase.type, settings), laneX, role, phase.type);

    return createBrokenTarget({
      x: clamp(targetX, pitchBounds.minX, pitchBounds.maxX),
      y: clamp(attackY(teamSide, depth), pitchBounds.minY, pitchBounds.maxY)
    }, index, role, phase.type, true, teamSide, laneX, settings);
  });
}

export function getDefendingTargets(teamSide, phase, tactic, players) {
  const settings = tacticSettings(tactic);
  const formation = getFormationPositions(teamSide, tactic, players[0]?.formation);
  const laneX = lanes[phase.lane] ?? lanes.center;
  const ownBox = getDefensivePenaltyArea(teamSide);
  const deepLine = teamSide === "home" ? 0.78 : 0.22;

  if (phase.type === "counter") {
    return getCounterTargets(teamSide, false, laneX, settings, players);
  }

  return formation.map((base, index) => {
    const role = getPlayerRole(players, index);
    if (role === "goalkeeper") {
      return getGoalkeeperTarget(teamSide, laneX);
    }

    const lineY = {
      defender: deepLine,
      midfielder: lerp(deepLine, 0.5, 0.35),
      forward: lerp(deepLine, 0.5, 0.62)
    }[role];
    const compactX = lerp(0.5 + (base.x - 0.5) * (0.72 / settings.compactness), laneX, 0.24);
    const pressureY = phase.type === "pressure"
      ? lerp(lineY, ownBox.centerY, role === "defender" ? 0.72 : 0.48)
      : lineY;

    return createBrokenTarget({
      x: clamp(compactX, pitchBounds.minX, pitchBounds.maxX),
      y: clamp(pressureY, pitchBounds.minY, pitchBounds.maxY)
    }, index, role, phase.type, false, teamSide, laneX, settings);
  });
}

export function getGoalkeeperTarget(teamSide, laneX) {
  const zone = getOwnGoalZone(teamSide);
  return {
    x: clamp(lerp(zone.x, laneX, 0.12), 0.43, 0.57),
    y: zone.y
  };
}

export function getPressureTargets(teamSide, isAttacking, laneX, settings, players) {
  const opponentBox = getOpponentPenaltyArea(teamSide);
  const ownBox = getDefensivePenaltyArea(teamSide);
  const attackingY = opponentBox.centerY;
  const defendingY = teamSide === "home" ? ownBox.minY + 0.07 : ownBox.maxY - 0.07;
  const defensiveCluster = [
    { x: 0.5, y: 0 },
    { x: -0.18, y: 0.02 },
    { x: 0.18, y: 0.02 },
    { x: -0.12, y: 0.1 },
    { x: 0.12, y: 0.1 },
    { x: -0.24, y: 0.18 },
    { x: 0.24, y: 0.18 },
    { x: -0.1, y: 0.24 },
    { x: 0.1, y: 0.24 },
    { x: -0.3, y: 0.3 },
    { x: 0.3, y: 0.3 }
  ];
  const attackingCluster = [
    { x: 0, y: 0 },
    { x: -0.22, y: 0.28 },
    { x: 0.22, y: 0.28 },
    { x: -0.12, y: 0.22 },
    { x: 0.12, y: 0.22 },
    { x: -0.22, y: 0.14 },
    { x: 0.22, y: 0.14 },
    { x: 0, y: 0.12 },
    { x: -0.18, y: 0.04 },
    { x: 0, y: 0.02 },
    { x: 0.18, y: 0.04 }
  ];

  return players.map((player, index) => {
    const role = player.role;
    if (role === "goalkeeper") {
      return getGoalkeeperTarget(teamSide, laneX);
    }

    if (isAttacking) {
      const point = attackingCluster[index] ?? attackingCluster[0];
      const yDirection = teamSide === "home" ? 1 : -1;
      const targetY = attackingY + point.y * yDirection * settings.support;
      return createBrokenTarget({
        x: clamp(lerp(opponentBox.centerX + point.x, laneX, 0.22), pitchBounds.minX, pitchBounds.maxX),
        y: clamp(targetY, pitchBounds.minY, pitchBounds.maxY)
      }, index, role, "pressure", true, teamSide, laneX, settings);
    }

    const baseX = 0.5 + (defensiveCluster[index]?.x ?? 0) * 0.82;
    const yDirection = teamSide === "home" ? 1 : -1;
    return createBrokenTarget({
      x: clamp(lerp(baseX, laneX, 0.18), pitchBounds.minX, pitchBounds.maxX),
      y: clamp(defendingY + ((defensiveCluster[index]?.y ?? 0.1) * yDirection * 0.55), pitchBounds.minY, pitchBounds.maxY)
    }, index, role, "pressure", false, teamSide, laneX, settings);
  });
}

export function getCounterTargets(teamSide, isAttacking, laneX, settings, players) {
  const formation = getFormationPositions(teamSide, "normal", players[0]?.formation);
  return formation.map((base, index) => {
    const role = getPlayerRole(players, index);
    if (role === "goalkeeper") {
      return getGoalkeeperTarget(teamSide, laneX);
    }

    if (isAttacking) {
      const depth = {
        defender: 0.28,
        midfielder: 0.5,
        forward: 0.68
      }[role] * settings.support;
      return createBrokenTarget({
        x: clamp(lerp(base.x, laneX, role === "forward" ? 0.55 : 0.3), pitchBounds.minX, pitchBounds.maxX),
        y: clamp(attackY(teamSide, depth), pitchBounds.minY, pitchBounds.maxY)
      }, index, role, "counter", true, teamSide, laneX, settings);
    }

    const recoveryY = teamSide === "home" ? 0.7 : 0.3;
    return createBrokenTarget({
      x: clamp(lerp(base.x, laneX, 0.2), pitchBounds.minX, pitchBounds.maxX),
      y: clamp(lerp(base.y, recoveryY, 0.65), pitchBounds.minY, pitchBounds.maxY)
    }, index, role, "counter", false, teamSide, laneX, settings);
  });
}

export function getPhaseTargetPositions(phase, attackingTeam, defendingTeam, tactic = "normal", playersByTeam = null) {
  const players = playersByTeam ?? {
    home: createPlayers("home", DEFAULT_FORMATION),
    away: createPlayers("away", AWAY_DEFAULT_FORMATION)
  };
  const attackingPlayers = players[attackingTeam];
  const defendingPlayers = players[defendingTeam];
  const attackingTargets = getAttackingTargets(attackingTeam, phase, tactic, attackingPlayers);
  const defendingTargets = getDefendingTargets(defendingTeam, phase, tactic, defendingPlayers);
  const ballTarget = getBallTarget(phase, attackingTeam, attackingTargets, attackingPlayers);

  return {
    home: attackingTeam === "home" ? attackingTargets : defendingTargets,
    away: attackingTeam === "away" ? attackingTargets : defendingTargets,
    ball: ballTarget
  };
}

export function getBallTarget(phase, attackingTeam, attackingTargets, attackingPlayers) {
  const laneX = lanes[phase.lane] ?? lanes.center;
  const carrierIndex = getPreferredCarrierIndex(attackingPlayers, phase);
  const carrier = attackingTargets[carrierIndex] ?? attackingTargets[0];
  const opponentBox = getOpponentPenaltyArea(attackingTeam);

  if (phase.type === "pressure") {
    return {
      x: clamp(lerp(carrier.x, laneX, 0.25), opponentBox.minX, opponentBox.maxX),
      y: attackingTeam === "home"
        ? clamp(opponentBox.maxY - 0.02, opponentBox.minY, opponentBox.maxY)
        : clamp(opponentBox.minY + 0.02, opponentBox.minY, opponentBox.maxY)
    };
  }

  return {
    x: clamp(lerp(carrier.x, laneX, 0.35), pitchBounds.minX, pitchBounds.maxX),
    y: clamp(carrier.y, pitchBounds.minY, pitchBounds.maxY)
  };
}


