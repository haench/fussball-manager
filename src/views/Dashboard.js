import { formatBudget } from '../utils/format.js';

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
        <span>Budget</span>
        <strong>${formatBudget(state.budget)}</strong>
      </article>
    </div>
  `;
}
