import { getTableZone } from '../game/table.js';

const zoneLegend = [
  ['title', 'Meisterschaft'],
  ['international', 'Internationale Plätze'],
  ['promotion', 'Aufstieg'],
  ['relegation', 'Relegation'],
  ['demotion', 'Abstieg'],
  ['demo', 'Demo-Liga'],
];

function formatGoalDifference(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function renderLegend(state) {
  const visibleZones = new Set(state.table.map((row) => getTableZone(row, state.currentLeague, state.table.length).key));

  return zoneLegend
    .filter(([key]) => visibleZones.has(key))
    .map(([key, label]) => `<span class="zone-pill zone-${key}">${label}</span>`)
    .join('');
}

export function renderTable(state) {
  const rows = state.table
    .map((row) => {
      const zone = getTableZone(row, state.currentLeague, state.table.length);
      const isUserClub = row.teamId === state.selectedClub.id;

      return `
        <div class="standings-row zone-${zone.key}${isUserClub ? ' user-club-row' : ''}">
          <span class="standings-position">${row.position}</span>
          <strong class="standings-club">${row.club}</strong>
          <span class="standings-played">${row.played}</span>
          <span class="standings-won">${row.won}</span>
          <span class="standings-drawn">${row.drawn}</span>
          <span class="standings-lost">${row.lost}</span>
          <span class="standings-goals-for">${row.goalsFor}</span>
          <span class="standings-goals-against">${row.goalsAgainst}</span>
          <span class="standings-goal-difference">${formatGoalDifference(row.goalDifference)}</span>
          <strong class="standings-points">${row.points}</strong>
          <small class="standings-zone-label">${zone.label}</small>
        </div>
      `;
    })
    .join('');

  return `
    <div class="standings-view">
      <p class="eyebrow">Wettbewerb</p>
      <h2>Ligatabelle</h2>
      <p class="friendly-copy">Hier siehst du sofort, wo dein Verein steht und welche Bereiche wichtig sind.</p>
      <div class="standings-legend">${renderLegend(state)}</div>
      <div class="standings-table" role="table" aria-label="Ligatabelle">
        <div class="standings-row standings-header" role="row">
          <span>Platz</span>
          <span>Verein</span>
          <span>Sp.</span>
          <span>S</span>
          <span>U</span>
          <span>N</span>
          <span>TF</span>
          <span>GT</span>
          <span>TD</span>
          <span>Pts.</span>
          <span>Bereich</span>
        </div>
        ${rows}
      </div>
    </div>
  `;
}
