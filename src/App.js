import {
  assignLineupPlayer,
  clubs,
  gameState,
  leagues,
  getDataModeSummary,
  importPrivateRealData,
  resetGameProgress,
  resetToFantasyData,
  resetTransferFilters,
  sellSquadPlayer,
  setBestLineup,
  simulateCurrentMatchday,
  simulateRemainingMatches,
  submitTransferOffer,
  startNewGame,
  autoPlanTraining,
  updateTransferFilter,
  updateTrainingFocus,
  updateLineupFormation,
  updateUserTactics,
  upgradeClubFacility,
  watchUserMatchLive,
} from './game/state.js';
import {
  deleteActiveView,
  deleteSavedGame,
  hasSavedGame,
  loadActiveView,
  loadSavedGameState,
  saveActiveView,
  saveGameState,
} from './game/storage.js';
import { formatBudget } from './utils/format.js';
import { renderDashboard } from './views/Dashboard.js';
import { renderLineup } from './views/LineupView.js';
import { renderMatchday } from './views/Matchday.js';
import { renderSquad } from './views/Squad.js';
import { renderTable } from './views/TableView.js';
import { renderTraining } from './views/Training.js';
import { renderTransfers } from './views/Transfers.js';
import { renderLongTerm } from './views/LongTerm.js';
import { renderSeasonEnd } from './views/SeasonEnd.js';
import { isFinalMatchdayComplete } from './game/seasonEnd.js';

const navigationItems = ['Dashboard', 'Kader', 'Aufstellung', 'Training', 'Spieltag', 'Tabelle', 'Transfers', 'Verein', 'Saisonabschluss'];

let selectedLeague = 'Bundesliga';
let activeView = 'Dashboard';
let rootElement;
let dataImportFeedback = '';

function confirmSaveOverwrite() {
  if (!hasSavedGame()) {
    return true;
  }

  return window.confirm('Es gibt bereits einen gespeicherten Spielstand. Soll er mit einem neuen Spiel überschrieben werden?');
}

function renderClubCards() {
  const leagueClubs = clubs[selectedLeague] ?? [];

  return leagueClubs
    .map(
      (club) => `
        <article class="club-card">
          <h3>${club.name}</h3>
          <p>${club.league}</p>
          <span>Budget: ${formatBudget(club.budget)}</span>
          <button data-club="${club.name}" type="button">Neues Spiel</button>
        </article>
      `,
    )
    .join('');
}

function renderDataModeNotice() {
  const dataMode = getDataModeSummary();
  const modeLabel = dataMode.isRealImport ? 'Privater realImport aktiv' : 'Veröffentlichbarer fantasy-Standard';

  return `
    <section class="data-mode-card" aria-label="Datenmodus">
      <div>
        <p class="eyebrow">Datenmodus: ${modeLabel}</p>
        <h2>Diese Demo nutzt Fantasienamen.</h2>
        <p>Du kannst privat eigene Daten importieren. Echte Vereins- oder Spielernamen werden nicht fest eingebaut; vor einer Veröffentlichung müsste die Lizenzlage vorher geprüft werden.</p>
        <small>JSON-Schema: { "teams": [{ "id", "name", "league", "budget" }], "players": [{ "id", "name", "teamId", "position", "strength" }] } · vorbereitet für bis zu 18 Teams pro Liga.</small>
        ${dataMode.message ? `<strong>${dataMode.message}</strong>` : ''}
        ${dataImportFeedback ? `<strong>${dataImportFeedback}</strong>` : ''}
      </div>
      <div class="data-mode-actions">
        <label class="import-button">
          Private JSON importieren
          <input data-real-import type="file" accept="application/json,.json" />
        </label>
        <button data-reset-fantasy type="button">Fantasydaten nutzen</button>
      </div>
    </section>
  `;
}

function renderStartScreen() {
  const leagueTabs = leagues
    .map(
      (league) => `
        <button class="${league === selectedLeague ? 'active' : ''}" data-league="${league}" type="button">
          ${league}
        </button>
      `,
    )
    .join('');

  return `
    <main class="app-shell start-screen">
      <section class="hero-card">
        <p class="eyebrow">Browser Football Management</p>
        <h1>Fussball Manager</h1>
        <p>
          Starte deine Karriere, wähle einen Verein aus Bundesliga oder 2. Bundesliga und führe ihn durch die Saison.
        </p>
        <a class="primary-button" href="#club-selection">Neues Spiel</a>
      </section>

      ${renderDataModeNotice()}

      <section id="club-selection" class="club-selection">
        <div class="section-heading">
          <p class="eyebrow">Vereinsauswahl</p>
          <h2>Wähle deinen Club</h2>
        </div>

        <div class="league-tabs" role="tablist" aria-label="Liga wählen">${leagueTabs}</div>
        <div class="club-grid">${renderClubCards()}</div>
      </section>
    </main>
  `;
}

function renderActiveView() {
  switch (activeView) {
    case 'Kader':
      return renderSquad(gameState);
    case 'Aufstellung':
      return renderLineup(gameState);
    case 'Training':
      return renderTraining(gameState);
    case 'Spieltag':
      return renderMatchday(gameState);
    case 'Tabelle':
      return renderTable(gameState);
    case 'Transfers':
      return renderTransfers(gameState);
    case 'Verein':
      return renderLongTerm(gameState);
    case 'Saisonabschluss':
      return renderSeasonEnd(gameState);
    case 'Dashboard':
    default:
      return renderDashboard(gameState);
  }
}

function renderManagerLayout() {
  const navButtons = navigationItems
    .map(
      (item) => `
        <button class="${item === activeView ? 'active' : ''}" data-view="${item}" type="button">
          ${item}
        </button>
      `,
    )
    .join('');

  return `
    <main class="app-shell manager-layout">
      <header class="manager-header">
        <div>
          <p class="eyebrow">${gameState.currentLeague}</p>
          <h1>${gameState.selectedClub.name}</h1>
        </div>
        <div class="header-meta">
          <span>${getDataModeSummary().isRealImport ? 'realImport privat' : 'fantasy'}</span>
          <span>${isFinalMatchdayComplete(gameState) ? 'Saison beendet' : `Spieltag ${gameState.currentMatchday}`}</span>
          <strong>Transfer ${formatBudget(gameState.transferBudget)}</strong>
          <span>Gehalt ${formatBudget(gameState.currentWageSum)} / ${formatBudget(gameState.wageBudget)}</span>
        </div>
      </header>

      <nav class="main-nav" aria-label="Hauptnavigation">${navButtons}</nav>
      <section class="content-card">${renderActiveView()}</section>
    </main>
  `;
}

function renderApp() {
  rootElement.innerHTML = gameState.selectedClub ? renderManagerLayout() : renderStartScreen();
  attachEventHandlers();
}

function commitStateAndRender({ view = activeView } = {}) {
  activeView = view;
  saveGameState(gameState);
  saveActiveView(activeView);
  renderApp();
}

function deleteProgressAndRender({ view = 'Dashboard' } = {}) {
  deleteSavedGame();
  deleteActiveView();
  activeView = view;
  renderApp();
}

function attachEventHandlers() {
  rootElement.querySelectorAll('[data-reset-fantasy]').forEach((button) => {
    button.addEventListener('click', () => {
      resetToFantasyData();
      selectedLeague = leagues[0] ?? selectedLeague;
      dataImportFeedback = 'Fantasiedaten sind wieder aktiv.';
      deleteProgressAndRender();
    });
  });

  rootElement.querySelectorAll('[data-real-import]').forEach((field) => {
    field.addEventListener('change', () => {
      const file = field.files?.[0];

      if (!file) return;

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        let progressWasReset = false;

        try {
          importPrivateRealData(JSON.parse(reader.result));
          selectedLeague = leagues[0] ?? selectedLeague;
          dataImportFeedback = 'Import erfolgreich. Die Auswahl wurde auf deine privaten Daten umgestellt.';
          progressWasReset = true;
          deleteProgressAndRender();
        } catch (error) {
          dataImportFeedback = `Import fehlgeschlagen: ${error.message}`;
        }

        if (!progressWasReset) {
          renderApp();
        }
      });
      reader.readAsText(file);
    });
  });

  rootElement.querySelectorAll('[data-league]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedLeague = button.dataset.league;
      renderApp();
    });
  });

  rootElement.querySelectorAll('[data-club]').forEach((button) => {
    button.addEventListener('click', () => {
      const club = clubs[selectedLeague]?.find((entry) => entry.name === button.dataset.club);

      if (club && confirmSaveOverwrite()) {
        startNewGame(club);
        commitStateAndRender({ view: 'Dashboard' });
      }
    });
  });

  rootElement.querySelectorAll('[data-delete-save]').forEach((button) => {
    button.addEventListener('click', () => {
      const shouldDelete = window.confirm('Soll der gespeicherte Spielstand wirklich gelöscht werden? Das aktuelle Spiel wird beendet.');

      if (!shouldDelete) {
        return;
      }

      resetGameProgress();
      deleteProgressAndRender();
    });
  });

  rootElement.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      activeView = button.dataset.view;
      saveActiveView(activeView);
      renderApp();
    });
  });

  rootElement.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.action === 'simulate-matchday') {
        const watchedUserMatch = gameState.liveMatch
          && gameState.liveMatch.matchday === gameState.currentMatchday
          && gameState.completedMatches.some((match) => match.id === gameState.liveMatch.id)
          && (gameState.liveMatch.homeTeamId === gameState.selectedClub?.id
            || gameState.liveMatch.awayTeamId === gameState.selectedClub?.id);

        if (watchedUserMatch) {
          simulateRemainingMatches(gameState);
        } else {
          simulateCurrentMatchday(gameState);
        }
      }

      if (button.dataset.action === 'watch-live') {
        watchUserMatchLive(gameState);
      }

      if (button.dataset.action === 'simulate-remaining') {
        simulateRemainingMatches(gameState);
      }

      if (button.dataset.action === 'best-eleven') {
        setBestLineup(gameState);
        commitStateAndRender({ view: 'Aufstellung' });
        return;
      }

      commitStateAndRender({ view: isFinalMatchdayComplete(gameState) ? 'Saisonabschluss' : 'Spieltag' });
    });
  });


  rootElement.querySelectorAll('[data-season-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.seasonAction === 'new-season') {
        startNewGame(gameState.selectedClub);
        commitStateAndRender({ view: 'Dashboard' });
        return;
      }

      if (button.dataset.seasonAction === 'hall-of-fame') {
        commitStateAndRender({ view: 'Verein' });
      }
    });
  });

  rootElement.querySelectorAll('[data-training-focus]').forEach((field) => {
    field.addEventListener('change', () => {
      updateTrainingFocus(gameState, field.value);
      commitStateAndRender({ view: 'Training' });
    });
  });

  rootElement.querySelectorAll('[data-training-auto]').forEach((button) => {
    button.addEventListener('click', () => {
      autoPlanTraining(gameState);
      commitStateAndRender({ view: 'Training' });
    });
  });

  rootElement.querySelectorAll('[data-transfer-filter]').forEach((field) => {
    field.addEventListener('change', () => {
      updateTransferFilter(gameState, field.dataset.transferFilter, field.value);
      activeView = 'Transfers';
      saveActiveView(activeView);
      renderApp();
    });
  });

  rootElement.querySelectorAll('[data-transfer-reset]').forEach((button) => {
    button.addEventListener('click', () => {
      resetTransferFilters(gameState);
      activeView = 'Transfers';
      saveActiveView(activeView);
      renderApp();
    });
  });

  rootElement.querySelectorAll('[data-buy-player]').forEach((button) => {
    button.addEventListener('click', () => {
      const playerId = button.dataset.buyPlayer;
      const fee = rootElement.querySelector(`[data-offer-fee="${playerId}"]`)?.value ?? 0;
      const salary = rootElement.querySelector(`[data-offer-salary="${playerId}"]`)?.value ?? 0;

      submitTransferOffer(gameState, playerId, { fee, salary });
      commitStateAndRender({ view: 'Transfers' });
    });
  });

  rootElement.querySelectorAll('[data-sell-player]').forEach((button) => {
    button.addEventListener('click', () => {
      sellSquadPlayer(gameState, button.dataset.sellPlayer);
      commitStateAndRender({ view: 'Transfers' });
    });
  });

  rootElement.querySelectorAll('[data-upgrade-club]').forEach((button) => {
    button.addEventListener('click', () => {
      upgradeClubFacility(gameState, button.dataset.upgradeClub);
      commitStateAndRender({ view: 'Verein' });
    });
  });

  rootElement.querySelectorAll('[data-lineup-formation]').forEach((select) => {
    select.addEventListener('change', () => {
      updateLineupFormation(gameState, select.value);
      commitStateAndRender({ view: 'Aufstellung' });
    });
  });

  rootElement.querySelectorAll('[data-lineup-position]').forEach((select) => {
    select.addEventListener('change', () => {
      assignLineupPlayer(gameState, select.dataset.lineupPosition, select.value);
      commitStateAndRender({ view: 'Aufstellung' });
    });
  });

  rootElement.querySelectorAll('[data-tactic-field]').forEach((select) => {
    select.addEventListener('change', () => {
      updateUserTactics(gameState, select.dataset.tacticField, select.value);
      commitStateAndRender({ view: 'Aufstellung' });
    });
  });
}

export function mountApp(element) {
  rootElement = element;
  const restoredState = loadSavedGameState();

  if (restoredState) {
    const restoredView = loadActiveView();
    activeView = navigationItems.includes(restoredView) ? restoredView : activeView;
  }

  renderApp();
}
