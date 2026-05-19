import leagueSourceData from "../data/fussball_manager_1_2_3_liga_fiktiv_anonymisiert.json";
import { gameState, subscribe } from "./state.js";
import { bindEvents } from "./ui/events.js";
import { renderClubScreen } from "./views/clubView.js";
import { renderTrainingScreen, renderYouthScreen } from "./views/facilityViews.js";
import { renderSeasonScheduleScreen, renderStandingsScreen } from "./views/leagueViews.js";
import {
  renderGoalSplash,
  renderMatchScreen,
  renderResultScreen,
  tacticButtons,
  toPercent
} from "./views/matchView.js";
import {
  renderFinanceReportScreen,
  renderMatchdayReportScreen,
  renderMatchdayStandingsReportScreen
} from "./views/reportViews.js";
import { renderRosterScreen } from "./views/rosterView.js";
import {
  renderTransferMarketBuyScreen,
  renderTransferMarketHomeScreen,
  renderTransferMarketSellScreen
} from "./views/transferMarketScreens.js";
import { renderStadiumScreen } from "./views/stadiumView.js";
import { renderStartScreen } from "./views/startView.js";

const app = document.getElementById("app");

function render() {
  if (gameState.currentScreen === "match" && app.querySelector('[data-testid="match-screen"]')) {
    updateMatchScreen(gameState);
    return;
  }

  let markup = "";
  if (gameState.currentScreen === "start") {
    markup = renderStartScreen();
  } else if (gameState.currentScreen === "club") {
    markup = renderClubScreen(gameState);
  } else if (gameState.currentScreen === "roster") {
    markup = renderRosterScreen(gameState);
  } else if (gameState.currentScreen === "training") {
    markup = renderTrainingScreen(gameState);
  } else if (gameState.currentScreen === "youth") {
    markup = renderYouthScreen(gameState);
  } else if (gameState.currentScreen === "stadium") {
    markup = renderStadiumScreen(gameState);
  } else if (gameState.currentScreen === "standings") {
    markup = renderStandingsScreen(gameState) || renderClubScreen(gameState);
  } else if (gameState.currentScreen === "seasonSchedule") {
    markup = renderSeasonScheduleScreen(gameState) || renderClubScreen(gameState);
  } else if (gameState.currentScreen === "matchdayReport") {
    markup = renderMatchdayReportScreen(gameState) || renderClubScreen(gameState);
  } else if (gameState.currentScreen === "matchdayStandingsReport") {
    markup = renderMatchdayStandingsReportScreen(gameState) || renderFinanceReportScreen(gameState) || renderClubScreen(gameState);
  } else if (gameState.currentScreen === "financeReport") {
    markup = renderFinanceReportScreen(gameState) || renderClubScreen(gameState);
  } else if (gameState.currentScreen === "transferMarket") {
    markup = renderTransferMarketHomeScreen(gameState) || renderClubScreen(gameState);
  } else if (gameState.currentScreen === "transferMarket-buy") {
    markup = renderTransferMarketBuyScreen(gameState) || renderTransferMarketHomeScreen(gameState);
  } else if (gameState.currentScreen === "transferMarket-sell") {
    markup = renderTransferMarketSellScreen(gameState) || renderTransferMarketHomeScreen(gameState);
  } else if (gameState.currentScreen === "match") {
    markup = renderMatchScreen(gameState);
  } else if (gameState.currentScreen === "result") {
    markup = renderResultScreen(gameState);
  }

  app.innerHTML = markup;
  bindEvents({ leagueSourceData });
}

function updateMatchScreen(state) {
  const match = state.match;
  if (!match) {
    return;
  }

  app.querySelector('[data-testid="score-value"]').textContent = `${match.homeGoals} - ${match.awayGoals}`;
  app.querySelector('[data-testid="minute-value"]').textContent = `${match.displayMinute}'`;
  app.querySelector('[data-testid="attendance-value"]').textContent = `👥 ${match.attendance ?? 0}`;

  const tickerStack = app.querySelector('[data-testid="ticker-stack"]');
  tickerStack.innerHTML = match.tickerEvents.length
    ? match.tickerEvents.map((event) => `<article class="ticker-row glossy-panel">${event}</article>`).join("")
    : `<article class="ticker-row ticker-row--empty glossy-panel">Noch keine Tore</article>`;

  updateMarkers("home", match.positions.home);
  updateMarkers("away", match.positions.away);
  updateTacticButtons(match.tactic);

  const ballMarker = app.querySelector('[data-testid="ball-marker"]');
  ballMarker.style.left = toPercent(match.positions.ball.x);
  ballMarker.style.top = toPercent(match.positions.ball.y);

  const pitchFrame = app.querySelector(".pitch__frame");
  const goalSplash = app.querySelector('[data-testid="goal-splash"]');
  const nextGoalSplashMarkup = renderGoalSplash(match);

  if (match.goalSplash && !goalSplash) {
    pitchFrame.insertAdjacentHTML("beforeend", nextGoalSplashMarkup);
  } else if (match.goalSplash && goalSplash.dataset.teamName !== match.goalSplash.teamName) {
    goalSplash.outerHTML = nextGoalSplashMarkup;
  } else if (!match.goalSplash && goalSplash) {
    goalSplash.remove();
  }
}

function updateMarkers(teamName, positions) {
  positions.forEach((position, index) => {
    const marker = app.querySelector(`[data-team="${teamName}"][data-player-index="${index}"]`);
    marker.style.left = toPercent(position.x);
    marker.style.top = toPercent(position.y);
  });
}

function updateTacticButtons(activeTactic) {
  tacticButtons.forEach((button) => {
    const element = app.querySelector(`[data-testid="${button.testId}"]`);
    if (!element) {
      return;
    }

    const isActive = button.id === activeTactic;
    element.classList.toggle("tactic-button--active", isActive);
    element.setAttribute("aria-pressed", String(isActive));
  });
}

subscribe(render);
render();
