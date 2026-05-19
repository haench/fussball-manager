import { getUserTeam } from "../leagueWorld.js";
import { computeMarketValue } from "../domain/transferMarket.js";
import { formatCurrency, formatPosition, formatShortPosition } from "../ui/formatters.js";
import { getCrest } from "../ui/viewHelpers.js";

function renderTransferFeed(state) {
  const messages = state.transferMessages ?? [];
  const offer = state.transferMarket?.externalOffer ?? null;

  return `
    <section class="training-feed transfer-feed glossy-panel" data-testid="transfer-message-box">
      <div class="transfer-feed__messages">
        ${messages.length
          ? messages.map((entry) => `<p>${entry.text}</p>`).join("")
          : `<p>Keine Neuigkeiten auf dem Transfermarkt.</p>`
        }
      </div>
      ${offer
        ? `<div class="transfer-offer-card" data-testid="transfer-offer-card">
            <div class="transfer-offer-card__copy">
              <span>Angebot von ${offer.buyerClubName}</span>
              <strong>${offer.playerName}</strong>
            </div>
            <div class="transfer-offer-card__value">${formatCurrency(offer.offerAmount)}</div>
          </div>
          <div class="transfer-offer-actions">
            <button
              class="action-button action-button--green roster-action"
              data-action="accept-offer"
              data-offer-id="${offer.id}"
              data-testid="accept-offer-button"
            >
              Angebot annehmen
            </button>
            <button
              class="action-button action-button--red roster-action"
              data-action="reject-offer"
              data-offer-id="${offer.id}"
              data-testid="reject-offer-button"
            >
              Ablehnen
            </button>
          </div>`
        : ""
      }
    </section>
  `;
}

function renderHeader(state, userTeam, eyebrow, description) {
  return `
    <header class="club-header club-header--roster glossy-panel">
      <div class="club-header__crest">${getCrest(userTeam)}</div>
      <div class="club-header__main">
        <div class="eyebrow">${eyebrow}</div>
        <h1>${state.clubName}</h1>
        <p>${description}</p>
      </div>
    </header>
  `;
}

export function renderTransferMarketHomeScreen(state) {
  const userTeam = getUserTeam(state) ?? state.team;

  return `
    <section class="screen screen--club screen--transfer-market">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="transfer-market-screen">
        ${renderHeader(state, userTeam, "Transfermarkt", "Spieler kaufen und verkaufen")}

        <div class="roster-actions">
          <button class="action-button action-button--green roster-action" data-action="show-transfer-sell" data-testid="show-sell-button">
            Verkaufen
          </button>
          <button class="action-button action-button--green roster-action" data-action="show-transfer-buy" data-testid="show-buy-button">
            Kaufen
          </button>
        </div>

        ${renderTransferFeed(state)}

        <button class="action-button action-button--blue roster-action" data-action="back-club" data-testid="back-club-button">Zurück</button>
      </div>
    </section>
  `;
}

function renderTransferPlayerRow(player, budget) {
  const canAfford = budget >= player.marketValue;

  return `
    <article class="roster-row roster-row--transfer-buy" data-player-id="${player.id}">
      <div class="roster-row__name">${player.name}</div>
      <div class="roster-row__age">${player.age} Jahre</div>
      <div class="roster-row__strength">${player.strength}</div>
      <div class="roster-row__value">${formatCurrency(player.marketValue)}</div>
        <button
          class="roster-row__button action-button ${canAfford ? "action-button--green" : "action-button--blue action-button--disabled"}"
          data-action="buy-player"
          data-player-id="${player.id}"
          data-testid="buy-${player.id}"
        ${canAfford ? "" : "disabled"}
      >
        ${canAfford ? "Kaufen" : "Zu teuer"}
      </button>
    </article>
  `;
}

export function renderTransferMarketBuyScreen(state) {
  const userTeam = getUserTeam(state) ?? state.team;
  const availablePlayers = state.transferMarket?.availablePlayers ?? [];

  return `
    <section class="screen screen--club screen--transfer-market">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="transfer-market-buy-screen">
        ${renderHeader(state, userTeam, "Kaufen", "Spieler von anderen Vereinen")}
        ${renderTransferFeed(state)}

        <section class="roster-group glossy-panel">
          <div class="roster-group__title">
            <span>Verfügbare Spieler</span>
            <strong>${availablePlayers.length}</strong>
          </div>
          <div class="transfer-budget">
            <span>Budget</span>
            <strong>${formatCurrency(state.money)}</strong>
          </div>
          ${availablePlayers.length
            ? `<div class="roster-table__head roster-table__head--transfer-buy">
                <span>Name</span>
                <span>Alter</span>
                <span>Stärke</span>
                <span>Ablöse</span>
                <span>Aktion</span>
               </div>
               ${availablePlayers.map((player) => renderTransferPlayerRow(player, state.money)).join("")}`
            : `<p class="roster-empty">Heute keine Spieler auf dem Transfermarkt.</p>`
          }
        </section>

        <button class="action-button action-button--blue roster-action" data-action="back-transfer" data-testid="back-transfer-button">Zurück</button>
      </div>
    </section>
  `;
}

function renderSellPlayerRow(player) {
  const marketValue = computeMarketValue(player.strength);
  const isListed = Boolean(player.isOnTransferList);

  return `
    <article class="roster-row roster-row--transfer-sell${isListed ? " roster-row--listed" : ""}" data-player-id="${player.id}">
      <div class="roster-row__position" title="${formatPosition(player.position)}">${formatShortPosition(player.position)}</div>
      <div class="roster-row__name">${player.name}</div>
      <div class="roster-row__age">${player.age} Jahre</div>
      <div class="roster-row__strength">${player.strength}</div>
      <div class="roster-row__value">${formatCurrency(marketValue)}</div>
      <div class="roster-row__status">${isListed ? "Auf der Liste" : "Bereit für Angebote"}</div>
      <button
        class="roster-row__button action-button ${isListed ? "action-button--blue" : "action-button--green"}"
        data-action="${isListed ? "cancel-sell" : "sell-player"}"
        data-player-id="${player.id}"
        data-testid="${isListed ? "cancel-sell" : "sell"}-${player.id}"
      >
        ${isListed ? "Zurückziehen" : "Verkaufen"}
      </button>
    </article>
  `;
}

function renderSellGroup(title, players, emptyText) {
  return `
    <section class="roster-group glossy-panel">
      <div class="roster-group__title">
        <span>${title}</span>
        <strong>${players.length}</strong>
      </div>
      <div class="roster-table__head roster-table__head--transfer-sell">
        <span>Pos.</span>
        <span>Name</span>
        <span>Alter</span>
        <span>Stärke</span>
        <span>Marktwert</span>
        <span>Aktion</span>
      </div>
      ${players.length
        ? players.map(renderSellPlayerRow).join("")
        : `<p class="roster-empty">${emptyText}</p>`
      }
    </section>
  `;
}

export function renderTransferMarketSellScreen(state) {
  const userTeam = getUserTeam(state) ?? state.team;
  const starters = userTeam.players.filter((player) => player.isStarter);
  const bench = userTeam.players.filter((player) => !player.isStarter);

  return `
    <section class="screen screen--club screen--transfer-market">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="transfer-market-sell-screen">
        ${renderHeader(state, userTeam, "Verkaufen", "Spieler zum Verkauf anbieten")}
        ${renderTransferFeed(state)}

        ${renderSellGroup("Startelf", starters, "Keine Startspieler gewählt.")}
        ${renderSellGroup("Bank", bench, "Keine Ersatzspieler gewählt.")}

        <button class="action-button action-button--blue roster-action" data-action="back-transfer" data-testid="back-transfer-button">Zurück</button>
      </div>
    </section>
  `;
}
