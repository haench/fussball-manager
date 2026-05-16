import { matchConfig } from "./config.js";
import { AWAY_DEFAULT_FORMATION, DEFAULT_FORMATION, getFormationDefinition, isValidFormation } from "./formations.js";

const goalSplashDurationMs = 1800;
const goalSequenceDurationMs = 2600;
const resetDurationMs = 1500;
const pitchBounds = {
  minX: 0.06,
  maxX: 0.94,
  minY: 0.04,
  maxY: 0.96
};
const lanes = {
  left: 0.24,
  center: 0.5,
  right: 0.76
};
const homeFormations = {
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
const breakoutPatterns = [
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function lerp(current, target, amount) {
  return current + (target - current) * amount;
}

function weightedPick(options) {
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

function normalizeFormation(formation) {
  return isValidFormation(formation) ? formation : DEFAULT_FORMATION;
}

function createRoleList(formation) {
  const definition = getFormationDefinition(formation);
  return [
    ...Array.from({ length: definition.goalkeeper }, () => "goalkeeper"),
    ...Array.from({ length: definition.defender }, () => "defender"),
    ...Array.from({ length: definition.midfielder }, () => "midfielder"),
    ...Array.from({ length: definition.striker }, () => "forward")
  ];
}

function getBaseFormationPositions(teamSide, formation) {
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

function getPlayerRole(players, index) {
  return players[index]?.role ?? "midfielder";
}

function getPreferredCarrierIndex(players, phase) {
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

function getStarterPlayers(team) {
  return team.players.filter((player) => player.isStarter).slice(0, 11);
}

export function calculateTeamStrength(team) {
  const starters = getStarterPlayers(team);
  const sum = starters.reduce((total, player) => total + player.strength, 0);
  return starters.length ? sum / starters.length : 0;
}

function createPlayers(teamSide, formationId) {
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

export function createInitialMatchState(team, opponent) {
  const homeFormation = normalizeFormation(team.formation);
  const awayFormation = AWAY_DEFAULT_FORMATION;
  const players = {
    home: createPlayers("home", homeFormation),
    away: createPlayers("away", awayFormation)
  };

  return {
    minute: 0,
    displayMinute: 0,
    simulatedMinutes: 0,
    status: "playing",
    homeGoals: 0,
    awayGoals: 0,
    tickerEvents: [],
    attendance: 0,
    stadiumRevenue: null,
    tactic: "normal",
    formations: {
      home: homeFormation,
      away: awayFormation
    },
    stats: {
      homeShots: 0,
      awayShots: 0,
      homeShotsOnTarget: 0,
      awayShotsOnTarget: 0,
      homePossession: 50,
      awayPossession: 50,
      homePossessionTotal: 0,
      possessionSamples: 0
    },
    scorers: [],
    players,
    ball: {
      x: 0.5,
      y: 0.5,
      targetX: 0.5,
      targetY: 0.5
    },
    phase: createNextPhase("home", "normal", 0),
    currentEvent: null,
    goalPlan: null,
    goalScene: null,
    goalSplash: null,
    resetStepsRemaining: 0,
    positions: {
      home: players.home.map(toPosition),
      away: players.away.map(toPosition),
      ball: { x: 0.5, y: 0.5 }
    }
  };
}

function toPosition(player) {
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

function getDefensivePenaltyArea(teamSide) {
  return teamSide === "home" ? getOpponentPenaltyArea("away") : getOpponentPenaltyArea("home");
}

function tacticSettings(tactic) {
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

function createNextPhase(previousTeam = "home", tactic = "normal", elapsedMinutes = 0) {
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

function mirrorTeam(teamSide) {
  return teamSide === "home" ? "away" : "home";
}

function attackY(teamSide, depth) {
  const direction = getAttackingDirection(teamSide);
  return teamSide === "home" ? 0.92 - depth : 0.08 + depth * Math.abs(direction);
}

function roleAdvance(role, phaseType, settings) {
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

function lanePullX(baseX, laneX, role, phaseType) {
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

function applyWidth(baseX, phaseType, settings) {
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

function getPhaseFreedom(phaseType, isAttacking) {
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

function createBrokenTarget(target, index, role, phaseType, isAttacking, teamSide, laneX, settings) {
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

function getAttackingTargets(teamSide, phase, tactic, players) {
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

function getDefendingTargets(teamSide, phase, tactic, players) {
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

function getGoalkeeperTarget(teamSide, laneX) {
  const zone = getOwnGoalZone(teamSide);
  return {
    x: clamp(lerp(zone.x, laneX, 0.12), 0.43, 0.57),
    y: zone.y
  };
}

function getPressureTargets(teamSide, isAttacking, laneX, settings, players) {
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

function getCounterTargets(teamSide, isAttacking, laneX, settings, players) {
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

function getBallTarget(phase, attackingTeam, attackingTargets, attackingPlayers) {
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

function applyTargets(match, targets, speed = 0.18) {
  applyTeamTargets(match.players.home, targets.home, speed);
  applyTeamTargets(match.players.away, targets.away, speed);
  match.ball.x = lerp(match.ball.x, targets.ball.x, speed * 1.25);
  match.ball.y = lerp(match.ball.y, targets.ball.y, speed * 1.25);
  syncPositions(match);
}

function applyTeamTargets(players, targets, speed) {
  players.forEach((player, index) => {
    const target = targets[index];
    const roleNoise = player.role === "goalkeeper" ? 0.25 : 1;
    player.targetX = clamp(target.x + player.offsetX * roleNoise, pitchBounds.minX, pitchBounds.maxX);
    player.targetY = clamp(target.y + player.offsetY * roleNoise, pitchBounds.minY, pitchBounds.maxY);
    player.x = lerp(player.x, player.targetX, clamp(speed * player.pace, 0.08, 0.42));
    player.y = lerp(player.y, player.targetY, clamp(speed * player.pace, 0.08, 0.42));
  });
}

function syncPositions(match) {
  match.positions.home = match.players.home.map(toPosition);
  match.positions.away = match.players.away.map(toPosition);
  match.positions.ball = {
    x: match.ball.x,
    y: match.ball.y
  };
}

function createTickerText(teamName, opponentName, minute, isHomeTeam) {
  return `${minute}': TOR für ${isHomeTeam ? teamName : opponentName}!`;
}

function updatePossession(match, ownStrength, opponentStrength, attackingTeam) {
  const strengthDiff = ownStrength - opponentStrength;
  const possessionBoost = attackingTeam === "home" ? 5 : -5;
  const shotBoost = (match.stats.homeShots - match.stats.awayShots) * 1.4;
  const goalBoost = (match.homeGoals - match.awayGoals) * 2;
  const homePossession = clamp(50 + strengthDiff * 0.65 + possessionBoost + shotBoost + goalBoost, 34, 66);
  match.stats.homePossessionTotal += homePossession;
  match.stats.possessionSamples += 1;
  match.stats.homePossession = Math.round(match.stats.homePossessionTotal / match.stats.possessionSamples);
  match.stats.awayPossession = 100 - match.stats.homePossession;
}

function registerGoal(match, minute, isHomeTeam) {
  if (isHomeTeam) {
    match.homeGoals += 1;
  } else {
    match.awayGoals += 1;
  }

  match.scorers.push({
    minute,
    team: isHomeTeam ? "home" : "away"
  });
}

function registerShot(match, isHomeTeam, onTarget) {
  if (isHomeTeam) {
    match.stats.homeShots += 1;
    if (onTarget) {
      match.stats.homeShotsOnTarget += 1;
    }
    return;
  }

  match.stats.awayShots += 1;
  if (onTarget) {
    match.stats.awayShotsOnTarget += 1;
  }
}

function updateTicker(match, message) {
  match.tickerEvents = [message, ...match.tickerEvents].slice(0, matchConfig.tickerLimit);
}

function updateGoalSplash(match) {
  if (!match.goalSplash) {
    return;
  }

  match.goalSplash.stepsRemaining -= 1;

  if (match.goalSplash.stepsRemaining <= 0) {
    match.goalSplash = null;
  }
}

export function prepareGoalScoringSequence(match, scoringTeam) {
  const stepCount = Math.max(10, Math.ceil(goalSequenceDurationMs / matchConfig.simulationStepMs));
  match.goalPlan = {
    scoringTeam,
    stageIndex: 0,
    stages: [
      { type: "buildUp", stepsRemaining: Math.max(3, Math.round(stepCount * 0.2)) },
      { type: Math.random() < 0.55 ? "wideAttack" : "centralAttack", stepsRemaining: Math.max(3, Math.round(stepCount * 0.24)) },
      { type: "pressure", stepsRemaining: Math.max(4, Math.round(stepCount * 0.34)) },
      { type: "pressure", stepsRemaining: Math.max(3, Math.round(stepCount * 0.22)), shot: true }
    ],
    lane: weightedPick([
      { value: "left", weight: 1 },
      { value: "center", weight: 1.6 },
      { value: "right", weight: 1 }
    ])
  };
  match.phase = {
    type: "buildUp",
    attackingTeam: scoringTeam,
    lane: match.goalPlan.lane,
    stepsRemaining: stepCount
  };
}

export function resetToKickoffShape(match) {
  match.phase = {
    type: "reset",
    attackingTeam: mirrorTeam(match.phase?.attackingTeam ?? "home"),
    lane: "center",
    stepsRemaining: Math.max(8, Math.ceil(resetDurationMs / matchConfig.simulationStepMs))
  };
  match.resetStepsRemaining = match.phase.stepsRemaining;
  match.ball.targetX = 0.5;
  match.ball.targetY = 0.5;
}

function advanceGoalPlan(team, opponent, match, eventMinute) {
  const stage = match.goalPlan.stages[match.goalPlan.stageIndex];
  const scoringTeam = match.goalPlan.scoringTeam;
  const defendingTeam = mirrorTeam(scoringTeam);
  const phase = {
    type: stage.type,
    attackingTeam: scoringTeam,
    lane: match.goalPlan.lane,
    stepsRemaining: stage.stepsRemaining
  };
  const targets = getPhaseTargetPositions(phase, scoringTeam, defendingTeam, match.tactic, match.players);
  const opponentBox = getOpponentPenaltyArea(scoringTeam);

  if (stage.shot) {
    targets.ball = {
      x: opponentBox.centerX,
      y: scoringTeam === "home" ? opponentBox.minY + 0.01 : opponentBox.maxY - 0.01
    };
  }

  applyTargets(match, targets, stage.shot ? 0.28 : 0.22);
  stage.stepsRemaining -= 1;

  if (stage.stepsRemaining > 0) {
    return;
  }

  if (stage.shot) {
    const isHomeGoal = scoringTeam === "home";
    registerShot(match, isHomeGoal, true);
    registerGoal(match, eventMinute, isHomeGoal);
    updateTicker(match, createTickerText(team.name, opponent.name, eventMinute, isHomeGoal));
    match.goalSplash = {
      teamName: isHomeGoal ? team.name : opponent.name,
      stepsRemaining: Math.ceil(goalSplashDurationMs / matchConfig.simulationStepMs)
    };
    match.goalPlan = null;
    resetToKickoffShape(match);
    return;
  }

  match.goalPlan.stageIndex += 1;
}

function runResetShape(match) {
  const phase = {
    type: "reset",
    attackingTeam: match.phase.attackingTeam,
    lane: "center"
  };
  const targets = {
    home: getFormationPositions("home", match.tactic, match.formations.home),
    away: getFormationPositions("away", match.tactic, match.formations.away),
    ball: { x: 0.5, y: 0.5 }
  };
  applyTargets(match, targets, 0.2);
  match.resetStepsRemaining -= 1;

  if (match.resetStepsRemaining <= 0) {
    match.phase = createNextPhase(match.phase.attackingTeam, match.tactic, match.simulatedMinutes);
  }
}

function maybePrepareGoal(team, opponent, match, homePhase, deltaMinutes) {
  if (match.goalPlan || match.resetStepsRemaining > 0) {
    return;
  }

  const ownStrength = calculateTeamStrength(team);
  const opponentStrength = opponent.averageStrength;
  const strengthDiff = ownStrength - opponentStrength;
  const modifiers = getTacticGoalModifiers(match.tactic);
  const homeGoalChance = clamp(
    matchConfig.baseGoalChancePerMinute + strengthDiff * matchConfig.strengthFactor,
    matchConfig.minGoalChancePerMinute,
    matchConfig.maxGoalChancePerMinute
  ) * modifiers.ownAttackModifier;
  const awayGoalChance = clamp(
    matchConfig.baseGoalChancePerMinute - strengthDiff * matchConfig.strengthFactor,
    matchConfig.minGoalChancePerMinute,
    matchConfig.maxGoalChancePerMinute
  ) * modifiers.opponentAttackModifier;
  const activeChance = (homePhase ? homeGoalChance : awayGoalChance) * deltaMinutes;

  if (Math.random() < activeChance) {
    prepareGoalScoringSequence(match, homePhase ? "home" : "away");
    return;
  }

  const shotChance = activeChance + (match.phase.type === "pressure" ? 0.055 : 0.026) * deltaMinutes;
  if (Math.random() < shotChance) {
    registerShot(match, homePhase, Math.random() < 0.58);
  }
}

export function simulateStep(team, opponent, match, deltaMinutes) {
  const ownStrength = calculateTeamStrength(team);
  const opponentStrength = opponent.averageStrength;

  match.simulatedMinutes = clamp(match.simulatedMinutes + deltaMinutes, 0, matchConfig.matchDurationMinutes);
  const eventMinute = Math.max(1, Math.min(matchConfig.matchDurationMinutes, Math.round(match.simulatedMinutes)));
  updateGoalSplash(match);

  if (match.goalPlan) {
    advanceGoalPlan(team, opponent, match, eventMinute);
    updatePossession(match, ownStrength, opponentStrength, match.goalPlan?.scoringTeam ?? match.phase.attackingTeam);
    return;
  }

  if (match.resetStepsRemaining > 0) {
    runResetShape(match);
    return;
  }

  if (!match.phase || match.phase.stepsRemaining <= 0) {
    match.phase = createNextPhase(match.phase?.attackingTeam ?? "home", match.tactic, match.simulatedMinutes);
  }

  const attackingTeam = match.phase.attackingTeam;
  const defendingTeam = mirrorTeam(attackingTeam);
  const targets = getPhaseTargetPositions(match.phase, attackingTeam, defendingTeam, match.tactic, match.players);
  const phaseSpeed = match.phase.type === "counter" ? 0.26 : match.phase.type === "pressure" ? 0.23 : 0.18;

  applyTargets(match, targets, phaseSpeed);
  updatePossession(match, ownStrength, opponentStrength, attackingTeam);
  match.phase.stepsRemaining -= 1;
  maybePrepareGoal(team, opponent, match, attackingTeam === "home", deltaMinutes);
}

export function simulateMinute(team, opponent, match) {
  simulateStep(team, opponent, match, 1);
  match.displayMinute = Math.round(match.simulatedMinutes);
  match.minute = match.displayMinute;
}

export function getResultSummary(match) {
  if (match.homeGoals > match.awayGoals) {
    return { label: "Sieg", headline: "Sieg!", tone: "win" };
  }
  if (match.homeGoals < match.awayGoals) {
    return { label: "Niederlage", headline: "Niederlage", tone: "loss" };
  }
  return { label: "Unentschieden", headline: "Unentschieden", tone: "draw" };
}
