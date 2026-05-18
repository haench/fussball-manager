import {
  calculateAttendanceAndRevenue,
  getStadiumCapacity,
  getStandUpgradeCost,
  getStandUpgradeDuration,
  getStandUpgradeTarget,
  stadiumConfig
} from "../state.js";
import { formatCurrency } from "../ui/formatters.js";

function renderTicketPriceButtons(activeLevel) {
  return Object.entries(stadiumConfig.ticketPriceLabels)
    .map(([level, label]) => `
      <button
        class="formation-button ${activeLevel === level ? "formation-button--active" : ""}"
        data-action="set-ticket-price"
        data-ticket-price-level="${level}"
        data-testid="ticket-${level}"
        aria-pressed="${activeLevel === level}"
      >
        ${label} · ${stadiumConfig.ticketPrices[level]} €
      </button>
    `)
    .join("");
}

function renderStandUpgradeCard(standId, stand, state) {
  const upgrade = stand.upgradeInProgress;
  const targetCapacity = getStandUpgradeTarget(standId, state);
  const upgradeCost = getStandUpgradeCost(stand.capacity, targetCapacity);
  const upgradeDuration = getStandUpgradeDuration(stand.capacity, targetCapacity);
  const canUpgrade = !upgrade && state.money >= upgradeCost;
  const canDecreaseTarget = !upgrade && targetCapacity > stand.capacity + stadiumConfig.upgrade.addCapacity;
  const progressPercent = upgrade
    ? Math.round(((upgrade.totalDays - upgrade.daysRemaining) / upgrade.totalDays) * 100)
    : 0;

  return `
    <article class="stand-card glossy-panel" data-testid="stand-${standId}">
      <div class="stand-card__title">
        <span>${stadiumConfig.standLabels[standId]}</span>
        <strong>${stand.capacity}</strong>
      </div>
      ${upgrade ? `
        <div class="stand-progress" data-testid="stand-progress-${standId}">
          <div class="stand-progress__bar">
            <span style="width:${progressPercent}%"></span>
          </div>
          <strong>Ausbau auf ${targetCapacity}: ${upgrade.daysRemaining} Spieltag${upgrade.daysRemaining === 1 ? "" : "e"} verbleibend</strong>
        </div>
      ` : `
        <div class="stand-upgrade">
          <div class="stand-upgrade-control" data-testid="stand-target-${standId}">
            <button
              class="stand-upgrade-control__button"
              data-action="change-stand-target"
              data-stand-id="${standId}"
              data-delta="-${stadiumConfig.upgrade.addCapacity}"
              ${canDecreaseTarget ? "" : "disabled"}
            >
              -100
            </button>
            <div class="stand-upgrade-control__level">
              <span>Ziel</span>
              <strong>${targetCapacity}</strong>
            </div>
            <button
              class="stand-upgrade-control__button"
              data-action="change-stand-target"
              data-stand-id="${standId}"
              data-delta="${stadiumConfig.upgrade.addCapacity}"
            >
              +100
            </button>
          </div>
          <div class="stand-upgrade__meta">
            <span>Kosten: ${formatCurrency(upgradeCost)}</span>
            <span>Bauzeit: ${upgradeDuration} Spieltag${upgradeDuration === 1 ? "" : "e"}</span>
          </div>
        </div>
      `}
      <button
        class="roster-row__button stand-card__button"
        data-action="upgrade-stand"
        data-stand-id="${standId}"
        data-testid="upgrade-stand-${standId}"
        ${canUpgrade ? "" : "disabled"}
      >
        ${upgrade ? "Im Bau" : "Ausbauen"}
      </button>
    </article>
  `;
}

export function renderStadiumScreen(state) {
  const stadium = state.team.stadium;
  const capacity = getStadiumCapacity(state.team);
  const forecast = calculateAttendanceAndRevenue(state.team, state.matchHistory);
  const lastRevenue = stadium.lastMatchRevenue;

  return `
    <section class="screen screen--club screen--stadium">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="stadium-screen">
        <header class="club-header club-header--roster glossy-panel">
          <div class="club-header__crest">FFC</div>
          <div class="club-header__main">
            <div class="eyebrow">Stadion</div>
            <h1>${state.clubName}</h1>
            <p>Zuschauer und Ausbau</p>
          </div>
          <div class="club-header__strength">
             <span>Kapazität</span>
            <strong>${capacity}</strong>
          </div>
        </header>

        <section class="formation-selector glossy-panel" data-testid="ticket-price-selector">
          <span class="formation-selector__label">Ticketpreis:</span>
          <div class="formation-selector__buttons">
            ${renderTicketPriceButtons(stadium.ticketPriceLevel)}
          </div>
        </section>

        <section class="stadium-revenue glossy-panel">
          <div>
            <span>Prognose</span>
            <strong>👥 ${forecast.attendance}</strong>
            <small>${formatCurrency(forecast.revenue)} bei ${forecast.ticketPrice} €</small>
          </div>
          <div>
            <span>Letztes Heimspiel</span>
            <strong>${lastRevenue ? `👥 ${lastRevenue.attendance}` : "-"}</strong>
            <small>${lastRevenue ? formatCurrency(lastRevenue.revenue) : "Noch keine Einnahmen"}</small>
          </div>
        </section>

        ${state.stadiumStatusMessage ? `<p class="lineup-warning lineup-warning--soft">${state.stadiumStatusMessage}</p>` : ""}

        <section class="stands-grid">
          ${stadiumConfig.standIds.map((standId) => renderStandUpgradeCard(standId, stadium.stands[standId], state)).join("")}
        </section>

        <button class="action-button action-button--blue roster-action" data-action="back-club" data-testid="back-club-button">Zurück</button>
      </div>
    </section>
  `;
}
