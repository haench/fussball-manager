export { calculateTeamStrength } from "./domain/teamStrength.js";
export { createInitialMatchState } from "./match/matchState.js";
export { pickGoalScorer, simulateMatchLogicUntil } from "./match/resultEngine.js";
export {
  prepareGoalScoringSequence,
  resetToKickoffShape,
  simulateStep
} from "./match/animationEngine.js";
export { getResultSummary } from "./match/resultSummary.js";
export {
  getAttackingDirection,
  getTacticGoalModifiers,
  getFormationPositions,
  getOpponentPenaltyArea,
  getOwnGoalZone,
  getPhaseTargetPositions
} from "./match/helpers.js";

import { simulateMatchLogicUntil } from "./match/resultEngine.js";
import { simulateStep } from "./match/animationEngine.js";

export function simulateMinute(team, opponent, match) {
  simulateMatchLogicUntil(team, opponent, match, (match.processedMinute ?? 0) + 1);
  simulateStep(team, opponent, match, 1);
  match.displayMinute = Math.round(match.simulatedMinutes);
  match.minute = match.displayMinute;
}
