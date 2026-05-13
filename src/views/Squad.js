export function renderSquad(state) {
  const rows = state.squad
    .map(
      (player) => `
        <div class="table-row">
          <span>${player.name}</span>
          <span>${player.position}</span>
          <strong>Stärke ${player.strength}</strong>
        </div>
      `,
    )
    .join('');

  return `
    <div>
      <p class="eyebrow">Teammanagement</p>
      <h2>Kader</h2>
      <div class="table-like">${rows}</div>
    </div>
  `;
}
