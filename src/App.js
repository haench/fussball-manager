import { clubs, gameState, leagues, startNewGame } from './game/state.js';
import { formatBudget } from './utils/format.js';
import { renderDashboard } from './views/Dashboard.js';
import { renderLineup } from './views/Lineup.js';
import { renderMatchday } from './views/Matchday.js';
import { renderSquad } from './views/Squad.js';
import { renderTable } from './views/Table.js';
import { renderTransfers } from './views/Transfers.js';

const navigationItems = ['Dashboard', 'Kader', 'Aufstellung', 'Spieltag', 'Tabelle', 'Transfers'];

let selectedLeague = 'Bundesliga';
let activeView = 'Dashboard';
let rootElement;

function renderClubCards() {
  return clubs[selectedLeague]
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
    case 'Spieltag':
      return renderMatchday(gameState);
    case 'Tabelle':
      return renderTable(gameState);
    case 'Transfers':
      return renderTransfers(gameState);
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
          <span>Spieltag ${gameState.currentMatchday}</span>
          <strong>${formatBudget(gameState.budget)}</strong>
        </div>
      </header>

      <nav class="main-nav" aria-label="Hauptnavigation">${navButtons}</nav>
      <section class="content-card">${renderActiveView()}</section>
    </main>
  `;
}

function attachEventHandlers() {
  rootElement.querySelectorAll('[data-league]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedLeague = button.dataset.league;
      renderApp();
    });
  });

  rootElement.querySelectorAll('[data-club]').forEach((button) => {
    button.addEventListener('click', () => {
      const club = clubs[selectedLeague].find((entry) => entry.name === button.dataset.club);

      if (club) {
        startNewGame(club);
        activeView = 'Dashboard';
        renderApp();
      }
    });
  });

  rootElement.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      activeView = button.dataset.view;
      renderApp();
    });
  });
}

function renderApp() {
  rootElement.innerHTML = gameState.selectedClub ? renderManagerLayout() : renderStartScreen();
  attachEventHandlers();
}

export function mountApp(element) {
  rootElement = element;
  renderApp();
}
