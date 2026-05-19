import { continueAfterMatch, setTactic, skipMatch, startMatch } from "../gameLoop.js";
import {
  acceptYouthOffer,
  autoPickBestEleven,
  changeStandUpgradeTarget,
  changeTrainingUpgradeTarget,
  changeYouthUpgradeTarget,
  continueGame,
  createNewGame,
  finishPostMatchReport,
  generateTransferMarketPlayers,
  gameState,
  rejectYouthOffer,
  setFormation,
  setPlayerStarter,
  setScreen,
  setTicketPriceLevel,
  startStandUpgrade,
  startTrainingFacilityUpgrade,
  startYouthAcademyUpgrade
} from "../state.js";
import {
  acceptExternalOffer,
  buyPlayer,
  cancelSell,
  rejectExternalOffer,
  sellPlayer
} from "../domain/transferMarket.js";

export function bindEvents({ leagueSourceData }) {
  document.querySelector('[data-action="start-new"]')?.addEventListener("click", () => createNewGame(leagueSourceData));
  document.querySelector('[data-action="show-club"]')?.addEventListener("click", () => continueGame(leagueSourceData));
  document.querySelector('[data-action="show-standings"]')?.addEventListener("click", () => setScreen("standings"));
  document.querySelector('[data-action="show-season-schedule"]')?.addEventListener("click", () => setScreen("seasonSchedule"));
  document.querySelector('[data-action="show-roster"]')?.addEventListener("click", () => setScreen("roster"));
  document.querySelector('[data-action="show-training"]')?.addEventListener("click", () => setScreen("training"));
  document.querySelector('[data-action="show-youth"]')?.addEventListener("click", () => setScreen("youth"));
  document.querySelector('[data-action="show-stadium"]')?.addEventListener("click", () => setScreen("stadium"));
  document.querySelector('[data-action="show-finance-report"]')?.addEventListener("click", () => setScreen("financeReport"));
  document.querySelector('[data-action="show-matchday-standings-report"]')?.addEventListener("click", () => {
    if (gameState.postMatchReport?.standings?.length) {
      setScreen("matchdayStandingsReport");
      return;
    }
    setScreen("financeReport");
  });
  document.querySelector('[data-action="finish-post-match"]')?.addEventListener("click", () => finishPostMatchReport());
  document.querySelector('[data-action="back-club"]')?.addEventListener("click", () => setScreen("club"));
  document.querySelector('[data-action="upgrade-training"]')?.addEventListener("click", () => startTrainingFacilityUpgrade());
  document.querySelector('[data-action="upgrade-youth"]')?.addEventListener("click", () => startYouthAcademyUpgrade());
  document.querySelector('[data-action="accept-youth"]')?.addEventListener("click", () => acceptYouthOffer());
  document.querySelector('[data-action="reject-youth"]')?.addEventListener("click", () => rejectYouthOffer());
  document.querySelectorAll('[data-action="change-training-target"]').forEach((button) => {
    button.addEventListener("click", () => changeTrainingUpgradeTarget(Number(button.dataset.delta)));
  });
  document.querySelectorAll('[data-action="change-youth-target"]').forEach((button) => {
    button.addEventListener("click", () => changeYouthUpgradeTarget(Number(button.dataset.delta)));
  });
  document.querySelectorAll('[data-action="set-ticket-price"]').forEach((button) => {
    button.addEventListener("click", () => setTicketPriceLevel(button.dataset.ticketPriceLevel));
  });
  document.querySelectorAll('[data-action="change-stand-target"]').forEach((button) => {
    button.addEventListener("click", () => {
      changeStandUpgradeTarget(button.dataset.standId, Number(button.dataset.delta));
    });
  });
  document.querySelectorAll('[data-action="upgrade-stand"]').forEach((button) => {
    button.addEventListener("click", () => startStandUpgrade(button.dataset.standId));
  });
  document.querySelector('[data-action="auto-pick"]')?.addEventListener("click", () => autoPickBestEleven());
  document.querySelectorAll('[data-action="set-formation"]').forEach((button) => {
    button.addEventListener("click", () => setFormation(button.dataset.formation));
  });
  document.querySelectorAll('[data-action="toggle-starter"]').forEach((button) => {
    button.addEventListener("click", () => {
      setPlayerStarter(button.dataset.playerId, button.dataset.starter === "true");
    });
  });
  document.querySelector('[data-action="next-match"]')?.addEventListener("click", () => startMatch());
  document.querySelector('[data-action="continue"]')?.addEventListener("click", () => continueAfterMatch());
  document.querySelectorAll('[data-action="set-tactic"]').forEach((button) => {
    button.addEventListener("click", () => setTactic(button.dataset.tactic));
  });
  document.querySelector('[data-action="skip-match"]')?.addEventListener("click", () => skipMatch());

  // ── Transfermarkt ────────────────────────────────────────────────────
  document.querySelector('[data-action="show-transfermarket"]')?.addEventListener("click", () => setScreen("transferMarket"));
  document.querySelector('[data-action="show-transfer-buy"]')?.addEventListener("click", () => {
    generateTransferMarketPlayers();
    setScreen("transferMarket-buy");
  });
  document.querySelector('[data-action="show-transfer-sell"]')?.addEventListener("click", () => setScreen("transferMarket-sell"));
  document.querySelector('[data-action="accept-offer"]')?.addEventListener("click", () => acceptExternalOffer());
  document.querySelector('[data-action="reject-offer"]')?.addEventListener("click", () => rejectExternalOffer());
  document.querySelector('[data-action="back-transfer"]')?.addEventListener("click", () => setScreen("transferMarket"));
  document.querySelectorAll('[data-action="sell-player"]').forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      sellPlayer(button.dataset.playerId);
    });
  });
  document.querySelectorAll('[data-action="cancel-sell"]').forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      cancelSell(button.dataset.playerId);
    });
  });
  document.querySelectorAll('[data-action="buy-player"]').forEach((button) => {
    button.addEventListener("click", () => {
      const player = gameState.transferMarket?.availablePlayers?.find((entry) => entry.id === button.dataset.playerId);
      if (!player) return;
      buyPlayer(player);
    });
  });
}
