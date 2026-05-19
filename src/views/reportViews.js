import { getUserTeam } from "../leagueWorld.js";
import { formatCurrency, formatSignedCurrency } from "../ui/formatters.js";
import { getCrest } from "../ui/viewHelpers.js";
import { renderFixtureRow } from "./leagueViews.js";

const seasonMatchDays = 34;

function getDisplayTeam(state) {
  return getUserTeam(state) ?? state.team;
}

export function renderMatchdayReportScreen(state) {
  const report = state.postMatchReport;
  if (!report) {
    return "";
  }
  const nextAction = report.standings?.length ? "show-matchday-standings-report" : "show-finance-report";

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

        <button class="action-button action-button--green roster-action" data-action="${nextAction}" data-testid="show-matchday-report-next-button">Weiter</button>
      </div>
    </section>
  `;
}

export function renderMatchdayStandingsReportScreen(state) {
  const report = state.postMatchReport;
  if (!report) {
    return "";
  }

  if (!report.standings?.length) {
    return "";
  }

  return `
    <section class="screen screen--club screen--matchday-standings-report">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="matchday-standings-report-screen">
        <header class="club-header club-header--roster glossy-panel">
          <div class="club-header__crest">${getCrest(getDisplayTeam(state))}</div>
          <div class="club-header__main">
            <div class="eyebrow">Tabelle nach dem Spieltag</div>
            <h1>${report.leagueName}</h1>
            <p>Saison ${report.seasonYear} · Spieltag ${report.matchDay}/${report.totalMatchDays ?? seasonMatchDays}</p>
          </div>
          <div class="club-header__strength">
            <span>Platz</span>
            <strong>${report.userStandingPosition ?? "-"}</strong>
          </div>
        </header>

        <section class="standings-table glossy-panel">
          <div class="report-card__headline">
            <span>Tabelle nach Spieltag ${report.matchDay}</span>
            <strong>${report.standings.length} Vereine</strong>
          </div>
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
          ${report.standings.map((standing, index) => `
            <div class="standings-row ${standing.teamId === report.userTeamId ? "standings-row--user" : ""}">
              <span>${index + 1}</span>
              <span>${report.teamNamesById?.[standing.teamId] ?? standing.teamId}</span>
              <span>${standing.played}</span>
              <span>${standing.wins}</span>
              <span>${standing.draws}</span>
              <span>${standing.losses}</span>
              <span>${standing.goalsFor}:${standing.goalsAgainst}</span>
              <span>${standing.goalDifference}</span>
              <strong>${standing.points}</strong>
            </div>
          `).join("")}
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

export function renderFinanceReportScreen(state) {
  const report = state.postMatchReport;
  if (!report) {
    return "";
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
