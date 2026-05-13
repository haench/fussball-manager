import { supportedPositions } from '../data/players.js';
import { getTransferMarketPlayers } from '../game/transfers.js';
import { formatBudget, formatCompactBudget } from '../utils/format.js';

function renderPositionOptions(selectedPosition) {
  return [
    '<option value="">Alle</option>',
    ...supportedPositions.map(
      (position) => `<option value="${position}" ${position === selectedPosition ? 'selected' : ''}>${position}</option>`,
    ),
  ].join('');
}

function renderTransferFilters(filters) {
  return `
    <div class="transfer-filters" aria-label="Transfersuche">
      <label>
        Name
        <input data-transfer-filter="name" placeholder="z. B. Knipser" type="search" value="${filters.name}">
      </label>
      <label>
        Position
        <select data-transfer-filter="position">${renderPositionOptions(filters.position)}</select>
      </label>
      <label>
        Mindeststärke
        <input data-transfer-filter="minStrength" min="1" max="99" placeholder="70" type="number" value="${filters.minStrength}">
      </label>
      <label>
        Maximales Alter
        <input data-transfer-filter="maxAge" min="16" max="45" placeholder="25" type="number" value="${filters.maxAge}">
      </label>
      <label>
        Maximaler Preis
        <input data-transfer-filter="maxPrice" min="0" step="500000" placeholder="10000000" type="number" value="${filters.maxPrice}">
      </label>
      <button data-transfer-reset type="button">Filter löschen</button>
    </div>
  `;
}

function renderMarketPlayer(player) {
  return `
    <article class="transfer-card">
      <div class="transfer-player-main">
        <strong>${player.name}</strong>
        <span>${player.position} · Stärke ${player.strength} · ${player.age} Jahre</span>
        <small>${player.clubName} · Marktwert ${formatCompactBudget(player.marketValue)}</small>
      </div>
      <div class="transfer-values">
        <span>Ablöse-Idee</span>
        <strong>${formatBudget(player.askingPrice)}</strong>
        <span>Gehaltswunsch</span>
        <strong>${formatBudget(player.desiredSalary)}</strong>
      </div>
      <div class="offer-box">
        <label>
          Ablöse-Angebot
          <input data-offer-fee="${player.id}" min="0" step="500000" type="number" value="${player.askingPrice}">
        </label>
        <label>
          Gehalt-Angebot
          <input data-offer-salary="${player.id}" min="0" step="1000" type="number" value="${player.desiredSalary}">
        </label>
        <button data-buy-player="${player.id}" type="button">Angebot senden</button>
      </div>
    </article>
  `;
}

function renderSellPlayer(player) {
  const salePrice = Math.round(player.marketValue * (player.age > 30 ? 0.85 : 0.95));

  return `
    <article class="sell-card">
      <div>
        <strong>${player.name}</strong>
        <span>${player.position} · Stärke ${player.strength} · Gehalt ${formatCompactBudget(player.salary)}</span>
      </div>
      <div>
        <span>Schätzwert Verkauf</span>
        <strong>${formatBudget(salePrice)}</strong>
      </div>
      <button data-sell-player="${player.id}" type="button">Verkaufen</button>
    </article>
  `;
}

export function renderTransferMarket(state) {
  const filters = state.transferFilters;
  const marketPlayers = getTransferMarketPlayers(state, filters).slice(0, 18);
  const marketList = marketPlayers.length
    ? marketPlayers.map(renderMarketPlayer).join('')
    : '<p class="friendly-copy">Kein Spieler passt zu deiner Suche. Probiere weichere Filter.</p>';
  const sellList = state.squad.length
    ? state.squad.map(renderSellPlayer).join('')
    : '<p class="friendly-copy">Dein Kader ist gerade leer.</p>';

  return `
    <div class="transfer-market-view">
      <div class="section-heading">
        <p class="eyebrow">Transfermarkt</p>
        <h2>Kaufen, Verkaufen und Budgets</h2>
        <p class="friendly-copy">
          Kindgerechte Verhandlungen: Stärke, Alter, Verein und Marktwert bestimmen, ob Verein und Spieler mitmachen.
        </p>
      </div>

      <div class="budget-grid">
        <article class="stat-card">
          <span>Transferbudget</span>
          <strong>${formatBudget(state.transferBudget)}</strong>
        </article>
        <article class="stat-card">
          <span>Gehaltsbudget</span>
          <strong>${formatBudget(state.wageBudget)}</strong>
        </article>
        <article class="stat-card">
          <span>Aktuelle Gehaltssumme</span>
          <strong>${formatBudget(state.currentWageSum)}</strong>
        </article>
      </div>

      ${state.transferLastResponse ? `<p class="transfer-response">${state.transferLastResponse}</p>` : ''}
      ${renderTransferFilters(filters)}

      <section class="transfer-section">
        <h3>Spieler kaufen</h3>
        <div class="transfer-list">${marketList}</div>
      </section>

      <section class="transfer-section">
        <h3>Eigene Spieler verkaufen</h3>
        <div class="sell-list">${sellList}</div>
      </section>
    </div>
  `;
}
