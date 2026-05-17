import { uiCopy } from "./config.js";
import { continueAfterMatch, setTactic, startMatch } from "./gameLoop.js";
import leagueSourceData from "../data/fussball_manager_1_2_3_liga_fiktiv_anonymisiert.json";
import {
  acceptYouthOffer,
  autoPickBestEleven,
  calculateAttendanceAndRevenue,
  changeStandUpgradeTarget,
  changeTrainingUpgradeTarget,
  changeYouthUpgradeTarget,
  continueGame,
  createNewGame,
  finishPostMatchReport,
  gameState,
  getStarterCount,
  getStadiumCapacity,
  getStandUpgradeCost,
  getStandUpgradeDuration,
  getStandUpgradeTarget,
  getTrainingUpgradeCost,
  getTrainingUpgradeDuration,
  getTrainingUpgradeTargetLevel,
  getYouthUpgradeCost,
  getYouthUpgradeDuration,
  getYouthUpgradeTargetLevel,
  isLineupValid,
  positionLabels,
  rejectYouthOffer,
  setFormation,
  setPlayerStarter,
  setScreen,
  setTicketPriceLevel,
  stadiumConfig,
  startStandUpgrade,
  startTrainingFacilityUpgrade,
  startYouthAcademyUpgrade,
  sortPlayersByPosition,
  subscribe,
  trainingUpgradeConfig,
  youthAcademyConfig
} from "./state.js";
import { formationIds } from "./formations.js";
import { calculateTeamStrength } from "./matchSimulation.js";
import {
  getMatchTeams,
  getNextUserMatch,
  getStandingPosition,
  getTeamById,
  getUserLeague,
  getUserStanding,
  getUserTeam
} from "./leagueWorld.js";
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

function formatSignedCurrency(value) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
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

function getDisplayTeam(state) {
  return getUserTeam(state) ?? state.team;
}

function getCrest(team) {
  return (team?.name ?? "FC")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 3) || "FC";
}

function getStrengthValue(team) {
  return Number.isFinite(team?.averageStrength)
    ? team.averageStrength
    : calculateTeamStrength(team);
}

function createTileMarkup(label, state) {
  if (label === "Kader") {
    const teamStrength = formatStrength(calculateTeamStrength(getDisplayTeam(state)));
    return `
      <button class="hub-tile hub-tile--primary" data-action="show-roster" data-testid="roster-tile">
        <div class="hub-tile__icon">K</div>
        <div class="hub-tile__value">${teamStrength}</div>
        <div class="hub-tile__label">Kader</div>
      </button>
    `;
  }

  if (label === "Training") {
    const trainingLevel = getDisplayTeam(state).trainingFacility.level;
    return `
      <button class="hub-tile hub-tile--primary" data-action="show-training" data-testid="training-tile">
        <div class="hub-tile__icon">T</div>
        <div class="hub-tile__value">${trainingLevel}</div>
        <div class="hub-tile__label">Training</div>
      </button>
    `;
  }

  if (label === "Stadion") {
    const capacity = getStadiumCapacity(getDisplayTeam(state));
    return `
      <button class="hub-tile hub-tile--primary" data-action="show-stadium" data-testid="stadium-tile">
        <div class="hub-tile__icon">S</div>
        <div class="hub-tile__value">${capacity}</div>
        <div class="hub-tile__label">Stadion</div>
      </button>
    `;
  }

  if (label === "Jugend") {
    const youthLevel = getDisplayTeam(state).youthAcademy.level;
    return `
      <button class="hub-tile hub-tile--primary" data-action="show-youth" data-testid="youth-tile">
        <div class="hub-tile__icon">J</div>
        <div class="hub-tile__value">${youthLevel}</div>
        <div class="hub-tile__label">Jugend</div>
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
  const chronologicalMatches = [...(matchHistory ?? []).slice(0, 5)].reverse();
  const recentMatches = [
    ...Array.from({ length: Math.max(0, 5 - chronologicalMatches.length) }, () => null),
    ...chronologicalMatches
  ];

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
  const userTeam = getDisplayTeam(state);
  const league = getUserLeague(state);
  const standing = getUserStanding(state);
  const standingPosition = getStandingPosition(state);
  const nextMatch = getNextUserMatch(state);
  const teams = nextMatch ? getMatchTeams(state, nextMatch) : { homeTeam: userTeam, awayTeam: state.opponent };
  const homeStrength = formatStrength(getStrengthValue(teams.homeTeam ?? userTeam));
  const awayStrength = formatStrength(getStrengthValue(teams.awayTeam ?? state.opponent));
  const lineupValid = isLineupValid(userTeam);
  const lineupWarning = getLineupWarning(state);
  const matchDay = state.season?.currentMatchDay ?? state.currentDay;

  return `
    <section class="screen screen--club">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell" data-testid="club-screen">
        <header class="club-header glossy-panel">
          <div class="club-header__crest">${getCrest(userTeam)}</div>
          <div>
            <div class="eyebrow">Vereinszentrale</div>
            <h1>${userTeam.name}</h1>
            <p>Manager: ${state.managerName}</p>
          </div>
        </header>

        <div class="stats-grid">
          <button class="stat-card stat-card--button glossy-panel" data-action="show-standings" data-testid="standings-tile">
            <span class="stat-card__label">Spieltag</span>
            <strong>${matchDay}/${seasonMatchDays}</strong>
            ${league && standing ? `<small>${league.name} · Platz ${standingPosition} · ${standing.points} Pkt.</small>` : ""}
          </button>
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
              <span class="fixture__crest">${getCrest(teams.homeTeam)}</span>
              <div class="fixture__details">
                <span class="fixture__name">${teams.homeTeam?.name ?? userTeam.name}</span>
                <span class="fixture__strength">Stärke: ${homeStrength}</span>
              </div>
            </div>
            <div class="fixture__separator">-</div>
            <div class="fixture__team">
              <span class="fixture__crest fixture__crest--away">${getCrest(teams.awayTeam)}</span>
              <div class="fixture__details">
                <span class="fixture__name">${teams.awayTeam?.name ?? state.opponent.name}</span>
                <span class="fixture__strength">Stärke: ${awayStrength}</span>
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

function renderYouthOffer(offer) {
  if (!offer) {
    return `
      <section class="youth-offer glossy-panel" data-testid="youth-empty">
        <div class="eyebrow">Talentsuche</div>
        <p>Aktuell kein Jugendspieler entdeckt.</p>
      </section>
    `;
  }

  return `
    <section class="youth-offer glossy-panel" data-testid="youth-offer">
      <div class="eyebrow">Neuer Jugendspieler entdeckt!</div>
      <h2>${offer.name}</h2>
      <div class="youth-offer__stats">
        <span>${formatShortPosition(offer.position)}</span>
        <span>${offer.age} Jahre</span>
        <span>Stärke ${offer.strength}</span>
        <span>${formatCurrency(offer.salaryPerMatchDay)} / Spieltag</span>
      </div>
      <p>In den Kader übernehmen?</p>
      <div class="roster-actions">
        <button class="action-button action-button--green roster-action" data-action="accept-youth" data-testid="accept-youth-button">Übernehmen</button>
        <button class="action-button action-button--blue roster-action" data-action="reject-youth" data-testid="reject-youth-button">Ablehnen</button>
      </div>
    </section>
  `;
}

function renderYouthScreen(state) {
  const userTeam = getDisplayTeam(state);
  const academy = state.team.youthAcademy;
  const upgrade = academy.upgradeInProgress;
  const targetLevel = getYouthUpgradeTargetLevel(state);
  const upgradeCost = getYouthUpgradeCost(academy.level, targetLevel);
  const upgradeDuration = getYouthUpgradeDuration(academy.level, targetLevel);
  const canUpgrade = !upgrade && academy.level < youthAcademyConfig.maxLevel && state.money >= upgradeCost;
  const canDecreaseTarget = !upgrade && targetLevel > academy.level + 1;
  const canIncreaseTarget = !upgrade && targetLevel < youthAcademyConfig.maxLevel;
  const progressPercent = upgrade
    ? Math.round(((upgrade.totalDays - upgrade.daysRemaining) / upgrade.totalDays) * 100)
    : 0;

  return `
    <section class="screen screen--club screen--youth">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="youth-screen">
        <header class="club-header club-header--roster glossy-panel">
          <div class="club-header__crest">${getCrest(userTeam)}</div>
          <div class="club-header__main">
            <div class="eyebrow">Jugend</div>
            <h1>${userTeam.name}</h1>
            <p>Talente entwickeln</p>
          </div>
          <div class="club-header__strength">
            <span>Level</span>
            <strong>${academy.level}</strong>
          </div>
        </header>

        <section class="training-card glossy-panel">
          <div class="training-card__headline">
            <span>Jugendzentrum</span>
            <strong>${academy.level}/${youthAcademyConfig.maxLevel}</strong>
          </div>
          <p>Je besser dein Jugendzentrum ist, desto stärker können entdeckte Talente sein.</p>
          ${upgrade ? `
            <div class="training-progress" data-testid="youth-progress">
              <div class="training-progress__bar">
                <span style="width:${progressPercent}%"></span>
              </div>
              <strong>Ausbau auf Level ${upgrade.targetLevel}: ${upgrade.daysRemaining} Spieltage verbleibend</strong>
            </div>
          ` : `
            <div class="training-upgrade">
              <div class="training-target-control" data-testid="youth-target-control">
                <button class="training-target-control__button" data-action="change-youth-target" data-delta="-1" ${canDecreaseTarget ? "" : "disabled"}>-1</button>
                <div class="training-target-control__level">
                  <span>Ziel</span>
                  <strong>Level ${targetLevel}</strong>
                </div>
                <button class="training-target-control__button" data-action="change-youth-target" data-delta="1" ${canIncreaseTarget ? "" : "disabled"}>+1</button>
              </div>
              <div class="training-upgrade__meta">
                <span>Kosten: ${formatCurrency(upgradeCost)}</span>
                <span>Bauzeit: ${upgradeDuration} Spieltag${upgradeDuration === 1 ? "" : "e"}</span>
              </div>
            </div>
          `}
          ${state.youthStatusMessage ? `<p class="training-status">${state.youthStatusMessage}</p>` : ""}
          <button
            class="action-button action-button--green training-upgrade__button"
            data-action="upgrade-youth"
            data-testid="upgrade-youth-button"
            ${canUpgrade ? "" : "disabled"}
          >
            Jugendzentrum verbessern
          </button>
        </section>

        ${renderYouthOffer(academy.pendingOffer)}

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

function renderStandingsScreen(state) {
  const userTeam = getDisplayTeam(state);
  const league = getUserLeague(state);

  if (!league) {
    return renderClubScreen(state);
  }

  return `
    <section class="screen screen--club screen--standings">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="standings-screen">
        <header class="club-header club-header--roster glossy-panel">
          <div class="club-header__crest">${getCrest(userTeam)}</div>
          <div class="club-header__main">
            <div class="eyebrow">Tabelle</div>
            <h1>${league.name}</h1>
            <p>Spieltag ${state.season?.currentMatchDay ?? league.matchDay}/${league.totalMatchDays}</p>
          </div>
          <div class="club-header__strength">
            <span>Platz</span>
            <strong>${getStandingPosition(state) ?? "-"}</strong>
          </div>
        </header>

        <button class="action-button action-button--green roster-action" data-action="show-season-schedule" data-testid="season-schedule-button">Saisonspielplan</button>

        <section class="standings-table glossy-panel">
          <div class="standings-row standings-row--head">
            <span>Pl.</span>
            <span>Verein</span>
            <span>Sp.</span>
            <span>S</span>
            <span>U</span>
            <span>N</span>
            <span>Tore</span>
            <span>Diff.</span>
            <span>Pkt.</span>
          </div>
          ${league.standings.map((standing, index) => {
            const team = getTeamById(state, standing.teamId);
            return `
              <div class="standings-row ${standing.teamId === state.selectedTeamId ? "standings-row--user" : ""}">
                <span>${index + 1}</span>
                <span>${team?.name ?? standing.teamId}</span>
                <span>${standing.played}</span>
                <span>${standing.wins}</span>
                <span>${standing.draws}</span>
                <span>${standing.losses}</span>
                <span>${standing.goalsFor}:${standing.goalsAgainst}</span>
                <span>${standing.goalDifference}</span>
                <strong>${standing.points}</strong>
              </div>
            `;
          }).join("")}
        </section>

        <button class="action-button action-button--blue roster-action" data-action="back-club" data-testid="back-club-button">Zurück</button>
      </div>
    </section>
  `;
}

function renderSeasonScheduleScreen(state) {
  const userTeam = getDisplayTeam(state);
  const league = getUserLeague(state);

  if (!league) {
    return renderStandingsScreen(state);
  }

  const fixturesByDay = league.schedule.reduce((groups, fixture) => {
    groups[fixture.matchDay] ??= [];
    groups[fixture.matchDay].push({
      ...fixture,
      homeTeamName: getTeamById(state, fixture.homeTeamId)?.name ?? fixture.homeTeamId,
      awayTeamName: getTeamById(state, fixture.awayTeamId)?.name ?? fixture.awayTeamId,
      isUserMatch: fixture.homeTeamId === state.selectedTeamId || fixture.awayTeamId === state.selectedTeamId
    });
    return groups;
  }, {});
  const currentMatchDay = state.season?.currentMatchDay ?? league.matchDay;

  return `
    <section class="screen screen--club screen--season-schedule">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="season-schedule-screen">
        <header class="club-header club-header--roster glossy-panel">
          <div class="club-header__crest">${getCrest(userTeam)}</div>
          <div class="club-header__main">
            <div class="eyebrow">Saisonspielplan</div>
            <h1>${league.name}</h1>
            <p>Saison ${state.season?.year ?? 2026} · Spieltag ${currentMatchDay}/${league.totalMatchDays}</p>
          </div>
          <div class="club-header__strength">
            <span>Spiele</span>
            <strong>${league.schedule.length}</strong>
          </div>
        </header>

        <button class="action-button action-button--blue roster-action season-schedule__back" data-action="show-standings" data-testid="back-standings-button">Zurück zur Tabelle</button>

        <section class="report-card glossy-panel">
          <div class="report-card__headline">
            <span>Kompletter Spielplan</span>
            <strong>${league.totalMatchDays} Spieltage</strong>
          </div>
          <div class="season-schedule">
            ${Object.entries(fixturesByDay).map(([matchDay, fixtures]) => `
              <article class="schedule-day ${Number(matchDay) === currentMatchDay ? "schedule-day--current" : ""}">
                <h3>Spieltag ${matchDay}</h3>
                ${fixtures.map((fixture) => renderFixtureRow(fixture, true)).join("")}
              </article>
            `).join("")}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderFixtureScore(fixture) {
  return fixture.played && Number.isFinite(fixture.homeGoals) && Number.isFinite(fixture.awayGoals)
    ? `${fixture.homeGoals} - ${fixture.awayGoals}`
    : "-:-";
}

function renderFixtureRow(fixture, compact = false) {
  return `
    <div class="fixture-report-row ${fixture.isUserMatch ? "fixture-report-row--user" : ""} ${compact ? "fixture-report-row--compact" : ""}">
      <span>${fixture.homeTeamName}</span>
      <strong>${renderFixtureScore(fixture)}</strong>
      <span>${fixture.awayTeamName}</span>
    </div>
  `;
}

function renderMatchdayReportScreen(state) {
  const report = state.postMatchReport;
  if (!report) {
    return renderClubScreen(state);
  }

  return `
    <section class="screen screen--club screen--matchday-report">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="matchday-report-screen">
        <header class="club-header club-header--roster glossy-panel">
          <div class="club-header__crest">${getCrest(getDisplayTeam(state))}</div>
          <div class="club-header__main">
            <div class="eyebrow">Spieltagsergebnisse</div>
            <h1>${report.leagueName}</h1>
            <p>Saison ${report.seasonYear} · Spieltag ${report.matchDay}/${report.totalMatchDays ?? seasonMatchDays}</p>
          </div>
        </header>

        <section class="report-card glossy-panel">
          <div class="report-card__headline">
            <span>Abgeschlossener Spieltag</span>
            <strong>${report.matchdayFixtures.length} Spiele</strong>
          </div>
          <div class="fixture-report-list">
            ${report.matchdayFixtures.length
              ? report.matchdayFixtures.map((fixture) => renderFixtureRow(fixture)).join("")
              : `<p class="report-empty">Keine Ligaspiele gefunden.</p>`}
          </div>
        </section>

        <button class="action-button action-button--green roster-action" data-action="show-finance-report" data-testid="show-finance-report-button">Weiter</button>
      </div>
    </section>
  `;
}

function renderFinanceEntry(entry) {
  const isIncome = entry.amount >= 0;
  return `
    <div class="finance-row ${isIncome ? "finance-row--income" : "finance-row--expense"}">
      <span>${entry.label}</span>
      <strong>${formatSignedCurrency(entry.amount)}</strong>
    </div>
  `;
}

function renderFinanceReportScreen(state) {
  const report = state.postMatchReport;
  if (!report) {
    return renderClubScreen(state);
  }

  const incomeEntries = report.financeEntries.filter((entry) => entry.type === "income");
  const expenseEntries = report.financeEntries.filter((entry) => entry.type === "expense");
  const totalDelta = report.moneyAfter - report.moneyBefore;

  return `
    <section class="screen screen--club screen--finance-report">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="finance-report-screen">
        <header class="club-header club-header--roster glossy-panel">
          <div class="club-header__crest">${getCrest(getDisplayTeam(state))}</div>
          <div class="club-header__main">
            <div class="eyebrow">Finanzen</div>
            <h1>Spieltag ${report.matchDay}</h1>
            <p>Einnahmen und Ausgaben</p>
          </div>
          <div class="club-header__strength">
            <span>Bilanz</span>
            <strong>${formatSignedCurrency(totalDelta)}</strong>
          </div>
        </header>

        <section class="finance-summary glossy-panel">
          <div>
            <span>Vorher</span>
            <strong>${formatCurrency(report.moneyBefore)}</strong>
          </div>
          <div>
            <span>Änderung</span>
            <strong class="${totalDelta >= 0 ? "finance-positive" : "finance-negative"}">${formatSignedCurrency(totalDelta)}</strong>
          </div>
          <div>
            <span>Nachher</span>
            <strong>${formatCurrency(report.moneyAfter)}</strong>
          </div>
        </section>

        <section class="report-card glossy-panel">
          <div class="report-card__headline">
            <span>Einnahmen</span>
            <strong>${formatCurrency(incomeEntries.reduce((sum, entry) => sum + entry.amount, 0))}</strong>
          </div>
          ${incomeEntries.length
            ? incomeEntries.map(renderFinanceEntry).join("")
            : `<p class="report-empty">Keine Einnahmen an diesem Spieltag.</p>`}
        </section>

        <section class="report-card glossy-panel">
          <div class="report-card__headline">
            <span>Ausgaben</span>
            <strong>${formatCurrency(Math.abs(expenseEntries.reduce((sum, entry) => sum + entry.amount, 0)))}</strong>
          </div>
          ${expenseEntries.length
            ? expenseEntries.map(renderFinanceEntry).join("")
            : `<p class="report-empty">Keine Ausgaben an diesem Spieltag.</p>`}
        </section>

        <button class="action-button action-button--green roster-action" data-action="finish-post-match" data-testid="finish-post-match-button">Weiter</button>
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
  const homeTeam = match.homeTeamId ? getTeamById(state, match.homeTeamId) : state.team;
  const awayTeam = match.awayTeamId ? getTeamById(state, match.awayTeamId) : state.opponent;
  const homeName = match.homeTeamName ?? homeTeam?.name ?? state.clubName;
  const awayName = match.awayTeamName ?? awayTeam?.name ?? state.opponent.name;

  return `
    <section class="screen screen--match">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--wide" data-testid="match-screen">
        <header class="scoreboard glossy-panel" data-testid="scoreboard">
          <div class="scoreboard__team">
            <span class="scoreboard__crest">${getCrest(homeTeam)}</span>
            <span>${homeName}</span>
          </div>
          <div class="scoreboard__score" data-testid="score-value">${match.homeGoals} - ${match.awayGoals}</div>
          <div class="scoreboard__team scoreboard__team--right">
            <span>${awayName}</span>
            <span class="scoreboard__crest scoreboard__crest--away">${getCrest(awayTeam)}</span>
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

  const homeTeam = match.homeTeamId ? getTeamById(state, match.homeTeamId) : state.team;
  const fallbackNames = homeTeam?.players?.filter((player) => player.isStarter).map((player) => player.name) ?? [];
  const awayName = match.awayTeamName ?? state.opponent.name;
  return `
    <ul class="result-card__scorers">
      ${match.scorers
        .slice(0, 3)
        .map((entry, index) => {
          const scorerName = entry.name ?? (entry.team === "home"
            ? fallbackNames[index % fallbackNames.length]
            : `${awayName} ${index + 1}`);
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
  const homeTeam = match.homeTeamId ? getTeamById(state, match.homeTeamId) : state.team;
  const awayTeam = match.awayTeamId ? getTeamById(state, match.awayTeamId) : state.opponent;
  const homeName = match.homeTeamName ?? homeTeam?.name ?? state.clubName;
  const awayName = match.awayTeamName ?? awayTeam?.name ?? state.opponent.name;

  return `
    <section class="screen screen--result screen--result-${match.result.tone}">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell" data-testid="result-screen">
        <div class="result-hero" data-testid="result-hero">
          <h1>${match.result.headline}</h1>
        </div>

        <section class="result-card glossy-panel">
          <div class="result-card__teams">
            <div>${homeName}</div>
            <div>${awayName}</div>
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
  } else if (gameState.currentScreen === "youth") {
    markup = renderYouthScreen(gameState);
  } else if (gameState.currentScreen === "stadium") {
    markup = renderStadiumScreen(gameState);
  } else if (gameState.currentScreen === "standings") {
    markup = renderStandingsScreen(gameState);
  } else if (gameState.currentScreen === "seasonSchedule") {
    markup = renderSeasonScheduleScreen(gameState);
  } else if (gameState.currentScreen === "matchdayReport") {
    markup = renderMatchdayReportScreen(gameState);
  } else if (gameState.currentScreen === "financeReport") {
    markup = renderFinanceReportScreen(gameState);
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
  document.querySelector('[data-action="start-new"]')?.addEventListener("click", () => createNewGame(leagueSourceData));
  document.querySelector('[data-action="show-club"]')?.addEventListener("click", () => continueGame(leagueSourceData));
  document.querySelector('[data-action="show-standings"]')?.addEventListener("click", () => setScreen("standings"));
  document.querySelector('[data-action="show-season-schedule"]')?.addEventListener("click", () => setScreen("seasonSchedule"));
  document.querySelector('[data-action="show-roster"]')?.addEventListener("click", () => setScreen("roster"));
  document.querySelector('[data-action="show-training"]')?.addEventListener("click", () => setScreen("training"));
  document.querySelector('[data-action="show-youth"]')?.addEventListener("click", () => setScreen("youth"));
  document.querySelector('[data-action="show-stadium"]')?.addEventListener("click", () => setScreen("stadium"));
  document.querySelector('[data-action="show-finance-report"]')?.addEventListener("click", () => setScreen("financeReport"));
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
}

subscribe(render);
render();
