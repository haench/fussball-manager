import {
  getStandingPosition,
  getTeamById,
  getUserLeague,
  getUserTeam
} from "../leagueWorld.js";
import { getCrest } from "../ui/viewHelpers.js";

function getDisplayTeam(state) {
  return getUserTeam(state) ?? state.team;
}

export function renderFixtureScore(fixture) {
  return fixture.played && Number.isFinite(fixture.homeGoals) && Number.isFinite(fixture.awayGoals)
    ? `${fixture.homeGoals} - ${fixture.awayGoals}`
    : "-:-";
}

export function renderFixtureRow(fixture, compact = false) {
  return `
    <div class="fixture-report-row ${fixture.isUserMatch ? "fixture-report-row--user" : ""} ${compact ? "fixture-report-row--compact" : ""}">
      <span>${fixture.homeTeamName}</span>
      <strong>${renderFixtureScore(fixture)}</strong>
      <span>${fixture.awayTeamName}</span>
    </div>
  `;
}

export function renderStandingsScreen(state) {
  const userTeam = getDisplayTeam(state);
  const league = getUserLeague(state);

  if (!league) {
    return "";
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

export function renderSeasonScheduleScreen(state) {
  const userTeam = getDisplayTeam(state);
  const league = getUserLeague(state);

  if (!league) {
    return "";
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
