import { getSeasonGoalStatus } from '../game/table.js';
import { formatBudget } from '../utils/format.js';

function renderGoalStatus(state) {
  const status = getSeasonGoalStatus(state);

  if (!status.goal || !status.currentRow) {
    return '';
  }

  const gapText = status.isInTarget
    ? 'Super! Du bist gerade im Zielbereich.'
    : `Noch ${status.pointsBehind} ${status.pointsBehind === 1 ? 'Punkt' : 'Punkte'} Rückstand`;

  return `
    <article class="season-goal-card">
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

export function renderDashboard(state) {
  return `
    <div class="view-grid">
      <article>
        <p class="eyebrow">Überblick</p>
        <h2>Dashboard</h2>
        <p>
          Willkommen bei ${state.selectedClub.name}. Plane die nächsten Schritte und behalte Kader, Budget und Tabelle im Blick.
        </p>
      </article>
      <article class="stat-card">
        <span>Aktuelle Liga</span>
        <strong>${state.currentLeague}</strong>
      </article>
      <article class="stat-card">
        <span>Spieltag</span>
        <strong>${state.currentMatchday}</strong>
      </article>
      <article class="stat-card">
        <span>Transferbudget</span>
        <strong>${formatBudget(state.transferBudget)}</strong>
      </article>
      <article class="stat-card">
        <span>Gehaltsbudget</span>
        <strong>${formatBudget(state.currentWageSum)} / ${formatBudget(state.wageBudget)}</strong>
      </article>
      ${renderGoalStatus(state)}
      <article class="message-card">
        <h3>Nachrichten</h3>
        <ul>${renderMessages(state.messages)}</ul>
      </article>
    </div>
  `;
}
