import { formationIds } from "../formations.js";
import { calculateTeamStrength } from "../domain/teamStrength.js";
import { getLineupPositionWarning, sortPlayersByPosition } from "../state.js";
import { formatPosition, formatShortPosition, formatStrength } from "../ui/formatters.js";

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

export function renderRosterScreen(state) {
  const starters = state.team.players.filter((player) => player.isStarter);
  const bench = state.team.players.filter((player) => !player.isStarter);
  const lineupWarning = getLineupPositionWarning(state.team);
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
