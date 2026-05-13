export function renderTable(state) {
  const rows = state.table
    .map(
      (row) => `
        <div class="table-row">
          <span>${row.position}. ${row.club}</span>
          <span>${row.played} Spiele</span>
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
