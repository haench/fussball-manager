import { getCurrentMatchdayViewModel } from '../game/state.js';
import { getSeasonGoalStatus } from '../game/table.js';
import { formatBudget, formatCompactBudget } from '../utils/format.js';
import { renderNewsCenter } from './NewsCenter.js';

function renderGoalStatus(state) {
  const status = getSeasonGoalStatus(state);

  if (!status.goal || !status.currentRow) {
    return '';
  }

  const gapText = status.isInTarget
    ? 'Im Zielbereich'
    : `${status.pointsBehind} ${status.pointsBehind === 1 ? 'Punkt' : 'Punkte'} Rückstand`;

  return `
    <article class="season-goal-card home-goal-card">
      <div>
        <p class="eyebrow">Saisonziel</p>
        <h3>${status.goal.label}</h3>
      </div>
      <div class="goal-progress">
        <span>Ziel: ${status.goal.targetLabel}</span>
        <span>Aktuell: Platz ${status.currentPosition}</span>
        <strong>${gapText}</strong>
      </div>
    </article>
  `;
}

function renderMessages(messages) {
  if (!messages.length) {
    return '<p class="friendly-copy">Noch keine Nachrichten.</p>';
  }

  return messages.map((message) => `<li>${message}</li>`).join('');
}

function getAverageStrength(squad) {
  if (!squad.length) return 0;
  const totalStrength = squad.reduce((sum, player) => sum + player.strength, 0);
  return Math.round(totalStrength / squad.length);
}

function getCurrentTableRow(state) {
  return state.table.find((row) => row.teamId === state.selectedClub?.id) ?? null;
}

function getDashboardStats(state) {
  const tableRow = getCurrentTableRow(state);
  const averageStrength = getAverageStrength(state.squad);

  return [
    { label: 'Spieltag', value: state.currentMatchday, detail: 'nächste Runde' },
    { label: 'Liga', value: tableRow ? `${tableRow.position}.` : '–', detail: state.currentLeague },
    { label: 'Geld', value: formatCompactBudget(state.transferBudget), detail: 'Transferbudget' },
    { label: 'Kader', value: state.squad.length, detail: `Ø Stärke ${averageStrength}` },
  ];
}

function renderQuickStats(state) {
  return getDashboardStats(state)
    .map(
      (stat) => `
        <article class="home-stat-card">
          <span>${stat.label}</span>
          <strong>${stat.value}</strong>
          <small>${stat.detail}</small>
        </article>
      `,
    )
    .join('');
}

function getFormationLabel(state) {
  return state.lineupByTeamId[state.selectedClub?.id]?.formation ?? '4-4-2';
}

function getUpgradeLevel(state, key) {
  return state.clubUpgrades?.[key] ?? 0;
}

function getHomeTiles(state) {
  const tableRow = getCurrentTableRow(state);
  const averageStrength = getAverageStrength(state.squad);
  const youthLevel = getUpgradeLevel(state, 'youthAcademy');
  const stadiumLevel = getUpgradeLevel(state, 'stadium');
  const trainingGroundLevel = getUpgradeLevel(state, 'trainingGround');

  return [
    { view: 'Kader', icon: '👥', label: 'Kader', value: state.squad.length, detail: `Ø ${averageStrength}` },
    { view: 'Aufstellung', icon: '🧢', label: 'Manager', value: getFormationLabel(state), detail: 'Taktik & Elf' },
    { view: 'Training', icon: '🏋️', label: 'Training', value: state.trainingFocus, detail: `Platz L${trainingGroundLevel}` },
    { view: 'Tabelle', icon: '🏆', label: 'Liga', value: tableRow ? `${tableRow.position}.` : '–', detail: `${tableRow?.points ?? 0} Punkte` },
    { view: 'Transfers', icon: '💸', label: 'Transfers', value: formatCompactBudget(state.transferBudget), detail: 'Budget' },
    { view: 'Verein', icon: '🏟️', label: 'Stadion', value: `Level ${stadiumLevel}`, detail: 'Verein ausbauen' },
    { view: 'Verein', icon: '🌱', label: 'Jugend', value: `Level ${youthLevel}`, detail: `${state.youthPlayers.length} Talente` },
    { view: 'Saisonabschluss', icon: '📜', label: 'Geschichte', value: state.achievements.unlocked.length, detail: 'Erfolge' },
  ];
}

function renderHomeTiles(state) {
  return getHomeTiles(state)
    .map(
      (tile) => `
        <button class="home-tile" data-view="${tile.view}" type="button">
          <span class="tile-icon" aria-hidden="true">${tile.icon}</span>
          <span class="tile-label">${tile.label}</span>
          <strong>${tile.value}</strong>
          <small>${tile.detail}</small>
        </button>
      `,
    )
    .join('');
}

function getMatchCta(state) {
  const { fixtures } = getCurrentMatchdayViewModel(state);
  const userFixture = fixtures.find((fixture) => fixture.isUserMatch);
  const liveMatchIsCurrent = state.liveMatch?.matchday === state.currentMatchday;

  if (liveMatchIsCurrent && state.liveMatch) {
    return {
      eyebrow: 'Live-Anzeige',
      title: `${state.liveMatch.homeTeam} ${state.liveMatch.homeGoals}:${state.liveMatch.awayGoals} ${state.liveMatch.awayTeam}`,
      detail: 'Zum Spieltag und Live-Ticker wechseln',
      view: 'Spieltag',
    };
  }

  if (!userFixture) {
    return {
      eyebrow: 'Saison',
      title: 'Saisonabschluss öffnen',
      detail: 'Alle Spiele sind absolviert',
      view: 'Saisonabschluss',
    };
  }

  const venue = userFixture.homeTeamId === state.selectedClub.id ? 'Heimspiel' : 'Auswärtsspiel';

  return {
    eyebrow: `Spieltag ${state.currentMatchday} · ${venue}`,
    title: `${userFixture.homeTeam} vs. ${userFixture.awayTeam}`,
    detail: 'Antippen für Simulation und Live-Ticker',
    view: 'Spieltag',
  };
}

function renderMatchCallToAction(state) {
  const matchCta = getMatchCta(state);

  return `
    <button class="match-cta" data-view="${matchCta.view}" type="button">
      <span>${matchCta.eyebrow}</span>
      <strong>${matchCta.title}</strong>
      <small>${matchCta.detail}</small>
    </button>
  `;
}

export function renderDashboard(state) {
  return `
    <div class="home-dashboard">
      <section class="club-banner" aria-label="Vereinszentrale">
        <div class="club-banner__topline">
          <span>⚙️ Zentrale</span>
          <button class="ghost-danger-button" data-delete-save type="button">Spielstand löschen</button>
        </div>
        <div class="club-ribbon">
          <span>${state.selectedClub.name}</span>
        </div>
        <div class="club-banner__meta">
          <span>${state.currentLeague}</span>
          <strong>Saison 2025/26</strong>
          <span>${formatBudget(state.currentWageSum)} / ${formatBudget(state.wageBudget)} Gehalt</span>
        </div>
      </section>

      <section class="quick-stats" aria-label="Schnellüberblick">
        ${renderQuickStats(state)}
      </section>

      <section class="home-tile-grid" aria-label="Hauptbereiche">
        ${renderHomeTiles(state)}
      </section>

      ${renderGoalStatus(state)}
      ${renderMatchCallToAction(state)}

      <section class="home-secondary-grid" aria-label="Aktuelles">
        ${renderNewsCenter(state.newsItems)}
        <article class="message-card">
          <h3>Team-Meldungen</h3>
          <ul>${renderMessages(state.messages)}</ul>
        </article>
      </section>
    </div>
  `;
}
