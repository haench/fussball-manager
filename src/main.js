import { uiCopy } from "./config.js";
import { continueAfterMatch, setTactic, startMatch } from "./gameLoop.js";
import {
  autoPickBestEleven,
  calculateAttendanceAndRevenue,
  changeStandUpgradeTarget,
  changeTrainingUpgradeTarget,
  continueGame,
  createNewGame,
  gameState,
  getStarterCount,
  getStadiumCapacity,
  getStandUpgradeCost,
  getStandUpgradeDuration,
  getStandUpgradeTarget,
  getTrainingUpgradeCost,
  getTrainingUpgradeDuration,
  getTrainingUpgradeTargetLevel,
  isLineupValid,
  positionLabels,
  setFormation,
  setPlayerStarter,
  setScreen,
  setTicketPriceLevel,
  stadiumConfig,
  startStandUpgrade,
  startTrainingFacilityUpgrade,
  sortPlayersByPosition,
  subscribe,
  trainingUpgradeConfig
} from "./state.js";
import { formationIds } from "./formations.js";
import { calculateTeamStrength } from "./matchSimulation.js";
//import logoImage from "../assets/logo.png";
const logoImage = "./assets/logo.png";
const goalSplashImage = "./assets/Tor.png";

const app = document.getElementById("app");
const tacticButtons = [
  { id: "aggressive", label: "Aggressiv", testId: "tactic-aggressive" },
  { id: "normal", label: "Normal", testId: "tactic-normal" },
  { id: "defensive", label: "Defensiv", testId: "tactic-defensive" }
];
const seasonMatchDays = 34;

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE").format(value) + " €";
}

function formatStrength(value) {
  return Math.round(value);
}

function formatPosition(position) {
  return positionLabels[position] ?? position;
}

function formatShortPosition(position) {
  return {
    goalkeeper: "TW",
    defender: "VT",
    midfielder: "MF",
    striker: "ST"
  }[position] ?? position;
}

function createTileMarkup(label, state) {
  if (label === "Kader") {
    const teamStrength = formatStrength(calculateTeamStrength(state.team));
    return `
      <button class="hub-tile hub-tile--primary" data-action="show-roster" data-testid="roster-tile">
        <div class="hub-tile__icon">K</div>
        <div class="hub-tile__value">${teamStrength}</div>
        <div class="hub-tile__label">Kader</div>
      </button>
    `;
  }

  if (label === "Training") {
    const trainingLevel = state.team.trainingFacility.level;
    return `
      <button class="hub-tile hub-tile--primary" data-action="show-training" data-testid="training-tile">
        <div class="hub-tile__icon">T</div>
        <div class="hub-tile__value">${trainingLevel}</div>
        <div class="hub-tile__label">Training</div>
      </button>
    `;
  }

  if (label === "Stadion") {
    const capacity = getStadiumCapacity(state.team);
    return `
      <button class="hub-tile hub-tile--primary" data-action="show-stadium" data-testid="stadium-tile">
        <div class="hub-tile__icon">S</div>
        <div class="hub-tile__value">${capacity}</div>
        <div class="hub-tile__label">Stadion</div>
      </button>
    `;
  }

  return `
    <div class="hub-tile is-disabled">
      <div class="hub-tile__icon">${label.slice(0, 1)}</div>
      <div class="hub-tile__label">${label}</div>
    </div>
  `;
}

function getLineupWarning(state) {
  if (state.rosterMessage) {
    return state.rosterMessage;
  }

  const starterCount = getStarterCount(state.team);
  if (starterCount !== 11) {
    return `Es müssen genau 11 Spieler in der Startelf sein. Aktuell: ${starterCount}/11.`;
  }

  return isLineupValid(state.team)
    ? ""
    : `Die Startelf passt nicht zur gewählten Besetzung ${state.team.formation}.`;
}

function renderFormationButtons(activeFormation) {
  return formationIds
    .map((formation) => `
      <button
        class="formation-button ${activeFormation === formation ? "formation-button--active" : ""}"
        data-action="set-formation"
        data-formation="${formation}"
        data-testid="formation-${formation}"
        aria-pressed="${activeFormation === formation}"
      >
        ${formation}
      </button>
    `)
    .join("");
}

function renderRecentMatchBadge(entry, index) {
  if (!entry) {
    return `<div class="recent-match recent-match--empty" aria-label="Noch kein Spiel ${index + 1}">-</div>`;
  }

  const resultClass = {
    S: "recent-match--win",
    N: "recent-match--loss",
    U: "recent-match--draw"
  }[entry.result];
  const resultLabel = {
    S: "Sieg",
    N: "Niederlage",
    U: "Unentschieden"
  }[entry.result];

  return `
    <div
      class="recent-match ${resultClass}"
      title="${resultLabel} gegen ${entry.opponentName}: ${entry.homeGoals}-${entry.awayGoals}"
      aria-label="${resultLabel} gegen ${entry.opponentName}: ${entry.homeGoals}-${entry.awayGoals}"
    >
      ${entry.result}
    </div>
  `;
}

function renderRecentMatches(matchHistory = []) {
  const recentMatches = Array.from({ length: 5 }, (_, index) => matchHistory[index] ?? null);

  return `
    <section class="recent-matches glossy-panel" data-testid="recent-matches">
      <div class="recent-matches__title">
        <span></span>
        <strong>Letzte Spiele</strong>
        <span></span>
      </div>
      <div class="recent-matches__list">
        ${recentMatches.map(renderRecentMatchBadge).join("")}
      </div>
    </section>
  `;
}

function renderTrainingMessages(messages = [], statusMessage = "") {
  if (!messages.length && !statusMessage) {
    return "";
  }

  return `
    <section class="training-feed glossy-panel" data-testid="training-feed">
      <div class="eyebrow">Training</div>
      ${messages.length
        ? `<ul>${messages.map((message) => `<li>${message}</li>`).join("")}</ul>`
        : `<p>${statusMessage}</p>`}
    </section>
  `;
}

function renderStartScreen() {
  return `
    <section class="screen screen--start">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell" data-testid="start-screen">
        <img class="hero-logo" src="${logoImage}" alt="Fussball Manager" />
        <div class="hero-copy">
          <h1>Der erste Club wartet auf dich.</h1>
          <p>${uiCopy.clubTagline}</p>
        </div>
        <div class="cta-stack">
          <button class="action-button action-button--green" data-action="start-new" data-testid="start-game-button">Spiel starten</button>
          <button class="action-button action-button--blue" data-action="show-club" data-testid="club-screen-button">Fortfahren</button>
        </div>
      </div>
    </section>
  `;
}

function renderClubScreen(state) {
  const ownStrength = formatStrength(calculateTeamStrength(state.team));
  const opponentStrength = formatStrength(state.opponent.averageStrength);
  const lineupValid = isLineupValid(state.team);
  const lineupWarning = getLineupWarning(state);

  return `
    <section class="screen screen--club">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell" data-testid="club-screen">
        <header class="club-header glossy-panel">
          <div class="club-header__crest">FFC</div>
          <div>
            <div class="eyebrow">Vereinszentrale</div>
            <h1>${state.clubName}</h1>
            <p>Manager: ${state.managerName}</p>
          </div>
        </header>

        <div class="stats-grid">
          <article class="stat-card glossy-panel">
            <span class="stat-card__label">Spieltag</span>
            <strong>${state.currentDay}/${seasonMatchDays}</strong>
          </article>
          <article class="stat-card glossy-panel stat-card--money">
            <span class="stat-card__label">Kontostand</span>
            <strong>${formatCurrency(state.money)}</strong>
          </article>
        </div>

        <div class="hub-grid">
          ${uiCopy.inactiveTiles.map((label) => createTileMarkup(label, state)).join("")}
        </div>

        ${renderRecentMatches(state.matchHistory)}
        ${renderTrainingMessages(state.trainingMessages)}

        <section class="next-match glossy-panel">
          <div class="eyebrow">Nächstes Spiel</div>
          <div class="fixture">
            <div class="fixture__team">
              <span class="fixture__crest">FFC</span>
              <div class="fixture__details">
                <span class="fixture__name">${state.clubName}</span>
                <span class="fixture__strength">Stärke: ${ownStrength}</span>
              </div>
            </div>
            <div class="fixture__separator">-</div>
            <div class="fixture__team">
              <span class="fixture__crest fixture__crest--away">SVN</span>
              <div class="fixture__details">
                <span class="fixture__name">${state.opponent.name}</span>
                <span class="fixture__strength">Stärke: ${opponentStrength}</span>
              </div>
            </div>
          </div>
          ${lineupWarning ? `<p class="lineup-warning" data-testid="lineup-warning">${lineupWarning}</p>` : ""}
          <button
            class="action-button action-button--green next-match__button"
            data-action="next-match"
            data-testid="next-match-button"
            ${lineupValid ? "" : "disabled"}
          >
            Nächstes Spiel
          </button>
        </section>
      </div>
    </section>
  `;
}

function renderRosterPlayerRow(player) {
  const targetStarterValue = !player.isStarter;
  return `
    <article class="roster-row ${player.isStarter ? "roster-row--starter" : ""}">
      <div class="roster-row__position" title="${formatPosition(player.position)}">${formatShortPosition(player.position)}</div>
      <div class="roster-row__name">${player.name}</div>
      <div class="roster-row__age">${player.age}</div>
      <div class="roster-row__strength">${player.strength}</div>
      <div class="roster-row__status">${player.isStarter ? "Startelf" : "Bank"}</div>
      <button
        class="roster-row__button"
        data-action="toggle-starter"
        data-player-id="${player.id}"
        data-starter="${targetStarterValue}"
        data-testid="toggle-${player.id}"
      >
        ${player.isStarter ? "Auf Bank" : "In Startelf"}
      </button>
    </article>
  `;
}

function renderRosterGroup(title, players, emptyText) {
  return `
    <section class="roster-group glossy-panel">
      <div class="roster-group__title">
        <span>${title}</span>
        <strong>${players.length}</strong>
      </div>
      <div class="roster-table__head">
        <span>Pos.</span>
        <span>Name</span>
        <span>Alter</span>
        <span>Stärke</span>
        <span>Status</span>
        <span>Aktion</span>
      </div>
      ${players.length
        ? sortPlayersByPosition(players).map(renderRosterPlayerRow).join("")
        : `<p class="roster-empty">${emptyText}</p>`}
    </section>
  `;
}

function renderRosterScreen(state) {
  const starters = state.team.players.filter((player) => player.isStarter);
  const bench = state.team.players.filter((player) => !player.isStarter);
  const lineupWarning = getLineupWarning(state);
  const teamStrength = formatStrength(calculateTeamStrength(state.team));

  return `
    <section class="screen screen--club screen--roster">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="roster-screen">
        <header class="club-header club-header--roster glossy-panel">
          <div class="club-header__crest">FFC</div>
          <div class="club-header__main">
            <div class="eyebrow">Kader</div>
            <h1>${state.clubName}</h1>
            <p>Startelf verwalten</p>
          </div>
          <div class="club-header__strength">
            <span>Teamstärke</span>
            <strong>${teamStrength}</strong>
          </div>
        </header>

        ${lineupWarning ? `<p class="lineup-warning" data-testid="roster-warning">${lineupWarning}</p>` : ""}

        <section class="formation-selector glossy-panel" data-testid="formation-selector">
          <span class="formation-selector__label">Besetzung:</span>
          <div class="formation-selector__buttons">
            ${renderFormationButtons(state.team.formation)}
          </div>
        </section>

        <div class="roster-actions">
          <button class="action-button action-button--blue roster-action" data-action="auto-pick" data-testid="auto-pick-button">Beste 11 automatisch</button>
          <button class="action-button action-button--green roster-action" data-action="back-club" data-testid="back-club-button">Zurück</button>
        </div>

        ${renderRosterGroup("Startelf", starters, "Keine Startspieler gewählt.")}
        ${renderRosterGroup("Bank", bench, "Alle Spieler stehen in der Startelf.")}
      </div>
    </section>
  `;
}

function renderTrainingScreen(state) {
  const facility = state.team.trainingFacility;
  const upgrade = facility.upgradeInProgress;
  const targetLevel = getTrainingUpgradeTargetLevel(state);
  const upgradeCost = getTrainingUpgradeCost(facility.level, targetLevel);
  const upgradeDuration = getTrainingUpgradeDuration(facility.level, targetLevel);
  const canUpgrade = !upgrade && facility.level < trainingUpgradeConfig.maxLevel && state.money >= upgradeCost;
  const canDecreaseTarget = !upgrade && targetLevel > facility.level + 1;
  const canIncreaseTarget = !upgrade && targetLevel < trainingUpgradeConfig.maxLevel;
  const progressPercent = upgrade
    ? Math.round(((upgrade.totalDays - upgrade.daysRemaining) / upgrade.totalDays) * 100)
    : 0;

  return `
    <section class="screen screen--club screen--training">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="training-screen">
        <header class="club-header club-header--roster glossy-panel">
          <div class="club-header__crest">FFC</div>
          <div class="club-header__main">
            <div class="eyebrow">Training</div>
            <h1>${state.clubName}</h1>
            <p>Spielerentwicklung steuern</p>
          </div>
          <div class="club-header__strength">
            <span>Level</span>
            <strong>${facility.level}</strong>
          </div>
        </header>

        <section class="training-card glossy-panel">
          <div class="training-card__headline">
            <span>Trainingsanlage</span>
            <strong>${facility.level}/${trainingUpgradeConfig.maxLevel}</strong>
          </div>
          <p>Spieler können nur bis zur Stärke deiner Trainingsanlage wachsen.</p>
          ${upgrade ? `
            <div class="training-progress" data-testid="training-progress">
              <div class="training-progress__bar">
                <span style="width:${progressPercent}%"></span>
              </div>
              <strong>Ausbau auf Level ${upgrade.targetLevel}: ${upgrade.daysRemaining} Spieltage verbleibend</strong>
            </div>
          ` : `
            <div class="training-upgrade">
              <div class="training-target-control" data-testid="training-target-control">
                <button class="training-target-control__button" data-action="change-training-target" data-delta="-1" ${canDecreaseTarget ? "" : "disabled"}>-1</button>
                <div class="training-target-control__level">
                  <span>Ziel</span>
                  <strong>Level ${targetLevel}</strong>
                </div>
                <button class="training-target-control__button" data-action="change-training-target" data-delta="1" ${canIncreaseTarget ? "" : "disabled"}>+1</button>
              </div>
              <div class="training-upgrade__meta">
                <span>Kosten: ${formatCurrency(upgradeCost)}</span>
                <span>Bauzeit: ${upgradeDuration} Spieltag${upgradeDuration === 1 ? "" : "e"}</span>
              </div>
            </div>
          `}
          <button
            class="action-button action-button--green training-upgrade__button"
            data-action="upgrade-training"
            data-testid="upgrade-training-button"
            ${canUpgrade ? "" : "disabled"}
          >
            Trainingsanlage verbessern
          </button>
        </section>

        ${renderTrainingMessages(state.trainingMessages)}

        <button class="action-button action-button--blue roster-action" data-action="back-club" data-testid="back-club-button">Zurück</button>
      </div>
    </section>
  `;
}

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

function renderStandCard(standId, stand, state) {
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
        <p>Ausbau: +${upgrade.addCapacity} Plätze · ${upgrade.daysRemaining} Spieltage</p>
      ` : `
        <p>Ausbau: +${stadiumConfig.upgrade.addCapacity} Plätze · ${formatCurrency(stadiumConfig.upgrade.cost)} · ${stadiumConfig.upgrade.durationDays} Spieltage</p>
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

function renderStadiumScreen(state) {
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

function renderMatchMarkers(markers, teamClass, teamName) {
  return markers
    .map((marker, index) => {
      return `
        <div
          class="player-marker ${teamClass} ${index === 0 ? "player-marker--goalkeeper" : ""}"
          data-team="${teamName}"
          data-player-index="${index}"
          style="left:${toPercent(marker.x)}; top:${toPercent(marker.y)};"
        ></div>
      `;
    })
    .join("");
}

function toPercent(value) {
  return `${value * 100}%`;
}

function renderGoalSplash(match) {
  if (!match.goalSplash) {
    return "";
  }

  return `
    <div class="goal-splash" data-testid="goal-splash" data-team-name="${match.goalSplash.teamName}">
      <img class="goal-splash__image" src="${goalSplashImage}" alt="Tor!" />
      <div class="goal-splash__team">Tor für ${match.goalSplash.teamName}</div>
    </div>
  `;
}

function renderTacticButtons(activeTactic) {
  return tacticButtons
    .map((button) => `
      <button
        class="tactic-button ${activeTactic === button.id ? "tactic-button--active" : ""}"
        data-action="set-tactic"
        data-tactic="${button.id}"
        data-testid="${button.testId}"
        aria-pressed="${activeTactic === button.id}"
      >
        ${button.label}
      </button>
    `)
    .join("");
}

function renderMatchScreen(state) {
  const match = state.match;
  if (!match) {
    return "";
  }

  return `
    <section class="screen screen--match">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--wide" data-testid="match-screen">
        <header class="scoreboard glossy-panel" data-testid="scoreboard">
          <div class="scoreboard__team">
            <span class="scoreboard__crest">FFC</span>
            <span>${state.clubName}</span>
          </div>
          <div class="scoreboard__score" data-testid="score-value">${match.homeGoals} - ${match.awayGoals}</div>
          <div class="scoreboard__team scoreboard__team--right">
            <span>${state.opponent.name}</span>
            <span class="scoreboard__crest scoreboard__crest--away">SVN</span>
          </div>
          <div class="scoreboard__meta">
            <div class="scoreboard__minute" data-testid="minute-value">${match.displayMinute}'</div>
            <div class="scoreboard__attendance" data-testid="attendance-value">👥 ${match.attendance ?? 0}</div>
          </div>
        </header>

        <section class="ticker-stack" data-testid="ticker-stack">
          ${match.tickerEvents.length
            ? match.tickerEvents.map((event) => `<article class="ticker-row glossy-panel">${event}</article>`).join("")
            : `<article class="ticker-row ticker-row--empty glossy-panel">Noch keine Tore</article>`}
        </section>

        <section class="pitch glossy-panel" data-testid="pitch">
          <div class="pitch__frame">
            <div class="pitch__line pitch__line--half"></div>
            <div class="pitch__circle"></div>
            <div class="pitch__box pitch__box--top"></div>
            <div class="pitch__box pitch__box--bottom"></div>
            <div class="pitch__goal pitch__goal--top"></div>
            <div class="pitch__goal pitch__goal--bottom"></div>
            ${renderMatchMarkers(match.positions.away, "player-marker--away", "away")}
            ${renderMatchMarkers(match.positions.home, "player-marker--home", "home")}
            <div class="ball-marker" data-testid="ball-marker" style="left:${toPercent(match.positions.ball.x)}; top:${toPercent(match.positions.ball.y)};"></div>
            ${renderGoalSplash(match)}
          </div>
        </section>

        <footer class="tactic-bar">
          ${renderTacticButtons(match.tactic)}
        </footer>
      </div>
    </section>
  `;
}

function renderScorerList(match, state) {
  if (!match.scorers.length) {
    return `<p class="result-card__scorers">Keine Tore in diesem Spiel.</p>`;
  }

  const names = state.team.players.filter((player) => player.isStarter).map((player) => player.name);
  return `
    <ul class="result-card__scorers">
      ${match.scorers
        .slice(0, 3)
        .map((entry, index) => {
          const scorerName = entry.team === "home"
            ? names[index % names.length]
            : `${state.opponent.name} ${index + 1}`;
          return `<li>${entry.minute}' ${scorerName}</li>`;
        })
        .join("")}
    </ul>
  `;
}

function renderResultScreen(state) {
  const match = state.match;
  if (!match?.result) {
    return "";
  }

  return `
    <section class="screen screen--result screen--result-${match.result.tone}">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell" data-testid="result-screen">
        <div class="result-hero" data-testid="result-hero">
          <h1>${match.result.headline}</h1>
        </div>

        <section class="result-card glossy-panel">
          <div class="result-card__teams">
            <div>${state.clubName}</div>
            <div>${state.opponent.name}</div>
          </div>
          <div class="result-card__score" data-testid="result-score">${match.homeGoals} - ${match.awayGoals}</div>
          ${renderScorerList(match, state)}
          <div class="result-stats">
            <div class="result-stat">
              <span>Ballbesitz</span>
              <strong>${match.stats.homePossession}% - ${match.stats.awayPossession}%</strong>
            </div>
            <div class="result-stat">
              <span>Torschüsse</span>
              <strong>${match.stats.homeShots} - ${match.stats.awayShots}</strong>
            </div>
          </div>
        </section>

        <button class="action-button action-button--green" data-action="continue" data-testid="continue-button">Weiter</button>
      </div>
    </section>
  `;
}

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
  } else if (gameState.currentScreen === "stadium") {
    markup = renderStadiumScreen(gameState);
  } else if (gameState.currentScreen === "match") {
    markup = renderMatchScreen(gameState);
  } else if (gameState.currentScreen === "result") {
    markup = renderResultScreen(gameState);
  }

  app.innerHTML = markup;
  bindEvents();
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

function bindEvents() {
  document.querySelector('[data-action="start-new"]')?.addEventListener("click", () => createNewGame());
  document.querySelector('[data-action="show-club"]')?.addEventListener("click", () => continueGame());
  document.querySelector('[data-action="show-roster"]')?.addEventListener("click", () => setScreen("roster"));
  document.querySelector('[data-action="show-training"]')?.addEventListener("click", () => setScreen("training"));
  document.querySelector('[data-action="show-stadium"]')?.addEventListener("click", () => setScreen("stadium"));
  document.querySelector('[data-action="back-club"]')?.addEventListener("click", () => setScreen("club"));
  document.querySelector('[data-action="upgrade-training"]')?.addEventListener("click", () => startTrainingFacilityUpgrade());
  document.querySelectorAll('[data-action="change-training-target"]').forEach((button) => {
    button.addEventListener("click", () => changeTrainingUpgradeTarget(Number(button.dataset.delta)));
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
}

subscribe(render);
render();
