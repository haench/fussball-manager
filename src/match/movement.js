import { clamp, lerp, pitchBounds, toPosition } from './helpers.js';

export function applyTargets(match, targets, speed = 0.18) {
  applyTeamTargets(match.players.home, targets.home, speed);
  applyTeamTargets(match.players.away, targets.away, speed);
  match.ball.x = lerp(match.ball.x, targets.ball.x, speed * 1.25);
  match.ball.y = lerp(match.ball.y, targets.ball.y, speed * 1.25);
  syncPositions(match);
}

export function applyTeamTargets(players, targets, speed) {
  players.forEach((player, index) => {
    const target = targets[index];
    const roleNoise = player.role === "goalkeeper" ? 0.25 : 1;
    player.targetX = clamp(target.x + player.offsetX * roleNoise, pitchBounds.minX, pitchBounds.maxX);
    player.targetY = clamp(target.y + player.offsetY * roleNoise, pitchBounds.minY, pitchBounds.maxY);
    player.x = lerp(player.x, player.targetX, clamp(speed * player.pace, 0.08, 0.42));
    player.y = lerp(player.y, player.targetY, clamp(speed * player.pace, 0.08, 0.42));
  });
}

export function syncPositions(match) {
  match.positions.home = match.players.home.map(toPosition);
  match.positions.away = match.players.away.map(toPosition);
  match.positions.ball = {
    x: match.ball.x,
    y: match.ball.y
  };
}


