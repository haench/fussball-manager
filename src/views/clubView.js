import { uiCopy } from "../config.js";
import { calculateTeamStrength } from "../domain/teamStrength.js";
import { getLineupPositionWarning, getStarterCount, getStadiumCapacity, isLineupValid } from "../state.js";
import { formatCurrency, formatStrength } from "../ui/formatters.js";
import { getCrest } from "../ui/viewHelpers.js";
import {
  getMatchTeams,
  getNextUserMatch,
  getStandingPosition,
  getUserLeague,
  getUserStanding,
  getUserTeam
} from "../leagueWorld.js";

const seasonMatchDays = 34;

function getDisplayTeam(state) {
  return getUserTeam(state) ?? state.team;
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

  if (label === "Transfermarkt") {
    return `
      <button class="hub-tile hub-tile--primary" data-action="show-transfermarket" data-testid="transfer-market-tile">
        <div class="hub-tile__icon">T</div>
        <div class="hub-tile__label">Transfermarkt</div>
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

export function renderTrainingMessages(messages = [], statusMessage = "") {
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

export function renderClubScreen(state) {
  const userTeam = getDisplayTeam(state);
  const league = getUserLeague(state);
  const standing = getUserStanding(state);
  const standingPosition = getStandingPosition(state);
  const nextMatch = getNextUserMatch(state);
  const teams = nextMatch ? getMatchTeams(state, nextMatch) : { homeTeam: userTeam, awayTeam: state.opponent };
  const homeStrength = formatStrength(getStrengthValue(teams.homeTeam ?? userTeam));
  const awayStrength = formatStrength(getStrengthValue(teams.awayTeam ?? state.opponent));
  const lineupValid = isLineupValid(userTeam);
  const lineupWarning = getLineupPositionWarning(userTeam) || state.rosterMessage || "";
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
