export function renderTable(state) {
  const rows = state.table
    .map(
      (row) => `
        <div class="table-row">
          <span>${row.position}. ${row.club}</span>
          <span>${row.played} Spiele</span>
          <span>${row.won ?? 0}/${row.drawn ?? 0}/${row.lost ?? 0}</span>
          <span>${row.goalsFor ?? 0}:${row.goalsAgainst ?? 0} Tore</span>
          <span>TD ${row.goalDifference}</span>
          <strong>${row.points} Punkte</strong>
        </div>
      `,
    )
    .join('');

  return `
    <div>
      <p class="eyebrow">Wettbewerb</p>
      <h2>Tabelle</h2>
      <div class="table-like standings">${rows}</div>
    </div>
  `;
}
